import { beforeEach, describe, expect, it, vi } from "vitest";
import { receipt } from "@/lib/fixtures";
import type { OcrEvent } from "@/lib/events";

const parse = vi.fn();
vi.mock("openai", async (importOriginal) => {
  const real = await importOriginal<typeof import("openai")>();
  class FakeOpenAI {
    static AuthenticationError = real.default.AuthenticationError;
    static RateLimitError = real.default.RateLimitError;
    static APIError = real.default.APIError;
    responses = { parse };
  }
  return { default: FakeOpenAI };
});

const { POST } = await import("./route");

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

async function call(body: BlobPart, type = "image/jpeg"): Promise<OcrEvent[]> {
  const form = new FormData();
  form.set("file", new File([body], "doc", { type }));
  const res = await POST(new Request("http://x/api/ocr", { method: "POST", body: form }));
  return (await res.text())
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

const steps = (events: OcrEvent[]) =>
  events.filter((e) => e.type === "step").map((e) => `${e.id}:${e.status}`);

beforeEach(() => {
  parse.mockReset();
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-6-luna");
});

describe("POST /api/ocr", () => {
  it("streams every step in order, then the result", async () => {
    parse.mockResolvedValue({ output_parsed: receipt, usage: { input_tokens: 2000, output_tokens: 1000 } });
    const events = await call(JPEG);

    expect(steps(events)).toEqual([
      "server:running",
      "server:done",
      "extract:running",
      "extract:done",
      "verify:running",
      "verify:done",
    ]);
    const last = events.at(-1)!;
    expect(last.type).toBe("result");
    if (last.type !== "result") return;
    expect(last.result).toEqual(receipt);
    expect(events.find((e) => e.type === "step" && e.id === "verify" && e.status === "done")).toMatchObject({
      detail: "All checks passed",
    });
    expect(last.stats).toMatchObject({ model: "gpt-6-luna", inputTokens: 2000, outputTokens: 1000 });
    expect(last.stats.costUsd).toBeCloseTo(0.0007);

    const image = parse.mock.calls[0][0].input[0].content[1];
    expect(image.image_url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("rejects a file whose bytes are not an image, without calling OpenAI", async () => {
    const events = await call("<script>alert(1)</script>", "image/png");
    expect(steps(events)).toEqual(["server:running", "server:error"]);
    expect(events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("not a JPEG") });
    expect(parse).not.toHaveBeenCalled();
  });

  it("rejects files over 5 MB", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(JPEG);
    const events = await call(big);
    expect(events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("limit is 5 MB") });
    expect(parse).not.toHaveBeenCalled();
  });

  it("reports a missing API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const events = await call(JPEG);
    expect(events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("OPENAI_API_KEY") });
  });

  it("turns an OpenAI failure into a failed extract step", async () => {
    parse.mockRejectedValue(new Error("boom"));
    const events = await call(JPEG);
    expect(steps(events)).toEqual(["server:running", "server:done", "extract:running", "extract:error"]);
    expect(events.at(-1)).toEqual({ type: "error", message: "boom" });
  });

  it("handles an empty model reply", async () => {
    parse.mockResolvedValue({ output_parsed: null, usage: null });
    const events = await call(JPEG);
    expect(events.at(-1)).toMatchObject({ type: "error", message: expect.stringContaining("readable result") });
  });
});
