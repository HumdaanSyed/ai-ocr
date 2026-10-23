import { zodTextFormat } from "openai/helpers/zod";
import { describe, expect, it } from "vitest";
import { receipt } from "./fixtures";
import { OcrResult } from "./schema";

describe("OcrResult schema", () => {
  it("converts to an OpenAI strict JSON schema", () => {
    // Throws if the schema uses features strict mode rejects (e.g. .optional()).
    expect(zodTextFormat(OcrResult, "ocr_result").strict).toBe(true);
  });

  it("accepts a valid result and rejects a malformed one", () => {
    expect(OcrResult.safeParse(receipt).success).toBe(true);
    expect(OcrResult.safeParse({ ...receipt, documentType: "menu" }).success).toBe(false);
    expect(OcrResult.safeParse({ ...receipt, totals: undefined }).success).toBe(false);
  });
});
