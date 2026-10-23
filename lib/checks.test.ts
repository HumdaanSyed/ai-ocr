import { describe, expect, it } from "vitest";
import { isValidDate, runChecks } from "./checks";
import { receipt } from "./fixtures";
import type { OcrResult } from "./schema";

const status = (r: OcrResult) => Object.fromEntries(runChecks(r).map((c) => [c.id, c.status]));
const edit = (patch: Partial<OcrResult>): OcrResult => ({ ...structuredClone(receipt), ...patch });

describe("runChecks", () => {
  it("passes a consistent receipt", () => {
    expect(status(receipt)).toEqual({
      text: "pass",
      doctype: "pass",
      required: "pass",
      date: "pass",
      email: "skip",
      phone: "pass",
      line_math: "pass",
      items_sum: "pass",
      total_math: "pass",
      confidence: "pass",
    });
  });

  it("fails when totals do not add up", () => {
    const s = status(edit({ totals: { ...receipt.totals, total: 99 } }));
    expect(s.total_math).toBe("fail");
    expect(s.items_sum).toBe("pass");
  });

  it("fails when line items do not sum to subtotal", () => {
    expect(status(edit({ totals: { ...receipt.totals, subtotal: 20 } })).items_sum).toBe("fail");
  });

  it("compares items to total when there is no subtotal or tax", () => {
    const r = edit({ totals: { subtotal: null, tax: null, total: 12.25, currency: "USD" } });
    expect(status(r).items_sum).toBe("pass");
    expect(status(r).total_math).toBe("skip");
  });

  it("fails a line where qty × price ≠ amount", () => {
    const r = edit({});
    r.lineItems[0].amount = 10;
    expect(status(r).line_math).toBe("fail");
  });

  it("flags missing required fields", () => {
    const r = edit({ fields: receipt.fields.filter((f) => f.key !== "merchant") });
    const c = runChecks(r).find((c) => c.id === "required")!;
    expect(c.status).toBe("fail");
    expect(c.detail).toContain("merchant");
  });

  it("flags bad dates, emails and phones", () => {
    const r = edit({
      fields: [
        { key: "date", label: "Date", value: "2026-02-30", type: "date", confidence: 1 },
        { key: "email", label: "Email", value: "not-an-email", type: "email", confidence: 1 },
        { key: "phone", label: "Phone", value: "12", type: "phone", confidence: 1 },
      ],
    });
    const s = status(r);
    expect([s.date, s.email, s.phone]).toEqual(["fail", "fail", "fail"]);
  });

  it("warns on low confidence and unknown document type", () => {
    const r = edit({ documentTypeConfidence: 0.4 });
    r.fields[1].confidence = 0.5;
    const s = status(r);
    expect(s.doctype).toBe("warn");
    expect(s.confidence).toBe("warn");
  });

  it("handles an empty result without throwing", () => {
    const s = status({
      ...receipt,
      documentType: "other",
      rawText: "",
      fields: [],
      lineItems: [],
      totals: { subtotal: null, tax: null, total: null, currency: null },
    });
    expect(s.text).toBe("fail");
    expect(s.required).toBe("skip");
    expect(s.confidence).toBe("skip");
  });
});

describe("isValidDate", () => {
  it.each([
    ["2024-02-29", true],
    ["2023-02-29", false],
    ["2026-13-01", false],
    ["20/10/2026", false],
  ])("%s → %s", (s, ok) => expect(isValidDate(s)).toBe(ok));
});
