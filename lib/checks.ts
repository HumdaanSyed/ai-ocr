import type { OcrResult } from "./schema";

export type CheckStatus = "pass" | "warn" | "fail" | "skip";
export type Check = { id: string; label: string; status: CheckStatus; detail: string };

const REQUIRED: Record<string, string[]> = {
  invoice: ["invoice_number", "date", "vendor"],
  receipt: ["merchant", "date"],
  business_card: ["name"],
  id_card: ["name", "id_number"],
};

const LOW_CONFIDENCE = 0.7;
// Rounding on printed documents is usually off by at most a cent per line.
const near = (a: number, b: number, lines = 1) => Math.abs(a - b) <= 0.01 * Math.max(lines, 1) + 1e-9;
const money = (n: number) => n.toFixed(2);

export function isValidDate(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = (s: string) => /^\+?[\d\s().-]+$/.test(s) && s.replace(/\D/g, "").length >= 7;

export function runChecks(r: OcrResult): Check[] {
  const checks: Check[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string) =>
    checks.push({ id, label, status, detail });

  add(
    "text",
    "Text detected",
    r.rawText.trim() ? "pass" : "fail",
    r.rawText.trim() ? `${r.rawText.trim().split(/\s+/).length} words read` : "No text found in the image",
  );

  add(
    "doctype",
    "Document type identified",
    r.documentTypeConfidence >= LOW_CONFIDENCE ? "pass" : "warn",
    `${r.documentType.replace("_", " ")} (${Math.round(r.documentTypeConfidence * 100)}% confidence)`,
  );

  const required = REQUIRED[r.documentType];
  if (required) {
    const have = new Set(r.fields.filter((f) => f.value.trim()).map((f) => f.key));
    const missing = required.filter((k) => !have.has(k));
    add(
      "required",
      "Required fields present",
      missing.length ? "fail" : "pass",
      missing.length ? `Missing: ${missing.join(", ")}` : `All ${required.length} found`,
    );
  } else {
    add("required", "Required fields present", "skip", "No required fields for this document type");
  }

  const formatChecks: [string, string, (s: string) => boolean][] = [
    ["date", "Dates are valid", isValidDate],
    ["email", "Email format", isEmail],
    ["phone", "Phone format", isPhone],
  ];
  for (const [type, label, valid] of formatChecks) {
    const fs = r.fields.filter((f) => f.type === type && f.value.trim());
    if (!fs.length) {
      add(type, label, "skip", `No ${type} fields`);
      continue;
    }
    const bad = fs.filter((f) => !valid(f.value.trim()));
    add(
      type,
      label,
      bad.length ? "fail" : "pass",
      bad.length ? `Invalid: ${bad.map((f) => `${f.label} "${f.value}"`).join(", ")}` : `${fs.length} checked`,
    );
  }

  const priced = r.lineItems.filter((li) => li.quantity != null && li.unitPrice != null && li.amount != null);
  if (priced.length) {
    const bad = priced.filter((li) => !near(li.quantity! * li.unitPrice!, li.amount!));
    add(
      "line_math",
      "Line items: qty × price = amount",
      bad.length ? "fail" : "pass",
      bad.length ? `Mismatch on: ${bad.map((li) => li.description).join(", ")}` : `${priced.length} lines verified`,
    );
  } else {
    add("line_math", "Line items: qty × price = amount", "skip", "No lines with quantity and price");
  }

  const { subtotal, tax, total } = r.totals;
  const amounts = r.lineItems.map((li) => li.amount).filter((a): a is number => a != null);
  const sumTarget = subtotal ?? (tax == null ? total : null);
  if (amounts.length && sumTarget != null) {
    const sum = amounts.reduce((a, b) => a + b, 0);
    add(
      "items_sum",
      `Line items add up to ${subtotal != null ? "subtotal" : "total"}`,
      near(sum, sumTarget, amounts.length) ? "pass" : "fail",
      `Items ${money(sum)} vs ${money(sumTarget)}`,
    );
  } else {
    add("items_sum", "Line items add up", "skip", "Not enough amounts to compare");
  }

  if (subtotal != null && tax != null && total != null) {
    add(
      "total_math",
      "Subtotal + tax = total",
      near(subtotal + tax, total) ? "pass" : "fail",
      `${money(subtotal)} + ${money(tax)} = ${money(subtotal + tax)} vs ${money(total)}`,
    );
  } else {
    add("total_math", "Subtotal + tax = total", "skip", "Subtotal, tax or total not printed");
  }

  const low = r.fields.filter((f) => f.confidence < LOW_CONFIDENCE);
  add(
    "confidence",
    "Field confidence",
    low.length ? "warn" : r.fields.length ? "pass" : "skip",
    low.length
      ? `Review: ${low.map((f) => f.label).join(", ")}`
      : r.fields.length
        ? `All ${r.fields.length} fields ≥ ${LOW_CONFIDENCE * 100}%`
        : "No fields extracted",
  );

  return checks;
}
