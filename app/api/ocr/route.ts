import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { runChecks } from "@/lib/checks";
import { ACCEPTED_TYPES, MAX_BYTES, type OcrEvent } from "@/lib/events";
import { estimateCost } from "@/lib/pricing";
import { OcrResult, SYSTEM_PROMPT } from "@/lib/schema";

// The browser can be bypassed, so the server re-checks the real bytes, not just the claimed type.
function sniffImageType(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

function errorMessage(e: unknown): string {
  if (e instanceof OpenAI.AuthenticationError) return "OpenAI rejected the API key. Check OPENAI_API_KEY in .env.local.";
  if (e instanceof OpenAI.RateLimitError) return "OpenAI rate limit or quota reached. Check your OpenAI credit balance.";
  if (e instanceof OpenAI.APIError) return `OpenAI error (${e.status ?? "network"}): ${e.message}`;
  return e instanceof Error ? e.message : "Unexpected error";
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: OcrEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      const started = Date.now();
      let current: "server" | "extract" | "verify" = "server";
      let t = Date.now();
      const done = (detail: string) => send({ type: "step", id: current, status: "done", ms: Date.now() - t, detail });
      const next = (id: typeof current) => {
        current = id;
        t = Date.now();
        send({ type: "step", id, status: "running" });
      };

      try {
        next("server");
        if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set in .env.local.");
        const file = (await request.formData()).get("file");
        if (!(file instanceof File)) throw new Error("No image was uploaded.");
        if (file.size > MAX_BYTES) throw new Error(`Image is ${(file.size / 1048576).toFixed(1)} MB, the limit is 5 MB.`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        const type = sniffImageType(bytes);
        if (!type || !ACCEPTED_TYPES.includes(type)) throw new Error("File content is not a JPEG, PNG or WebP image.");
        done(`${type.split("/")[1].toUpperCase()} verified, ${(bytes.length / 1024).toFixed(0)} KB`);

        next("extract");
        const model = process.env.OPENAI_MODEL || "gpt-6-luna";
        const response = await new OpenAI().responses.parse({
          model,
          instructions: SYSTEM_PROMPT,
          input: [
            {
              role: "user",
              content: [
                { type: "input_text", text: "Extract everything from this document." },
                {
                  type: "input_image",
                  detail: "high",
                  image_url: `data:${type};base64,${Buffer.from(bytes).toString("base64")}`,
                },
              ],
            },
          ],
          text: { format: zodTextFormat(OcrResult, "ocr_result") },
        });
        const result = response.output_parsed;
        if (!result) throw new Error("The model did not return a readable result. Try a clearer image.");
        const inputTokens = response.usage?.input_tokens ?? 0;
        const outputTokens = response.usage?.output_tokens ?? 0;
        done(`${result.fields.length} fields, ${result.lineItems.length} line items`);

        next("verify");
        const failed = runChecks(result).filter((c) => c.status === "fail").length;
        done(failed ? `${failed} check${failed > 1 ? "s" : ""} failed` : "All checks passed");

        // The client re-runs the same checks itself so they update live when a field is edited.
        send({
          type: "result",
          result,
          stats: {
            model,
            inputTokens,
            outputTokens,
            ms: Date.now() - started,
            costUsd: estimateCost(model, inputTokens, outputTokens),
          },
        });
      } catch (e) {
        send({ type: "step", id: current, status: "error", ms: Date.now() - t });
        send({ type: "error", message: errorMessage(e) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
