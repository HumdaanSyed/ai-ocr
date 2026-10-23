import { z } from "zod";

// OpenAI strict structured outputs need every field required, so "missing" is null, never undefined.
export const DOC_TYPES = ["invoice", "receipt", "business_card", "id_card", "form", "other"] as const;

export const Field = z.object({
  key: z.string().describe("snake_case key, use the canonical keys from the instructions when they apply"),
  label: z.string().describe("Human readable label"),
  value: z.string(),
  type: z.enum(["text", "date", "amount", "email", "phone", "number"]),
  confidence: z.number().describe("0 to 1, how sure you are the value was read correctly"),
});

export const LineItem = z.object({
  description: z.string(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  amount: z.number().nullable(),
});

export const OcrResult = z.object({
  documentType: z.enum(DOC_TYPES),
  documentTypeConfidence: z.number().describe("0 to 1"),
  language: z.string().describe("ISO 639-1 code, e.g. en"),
  rawText: z.string().describe("All text in the image, in reading order, line breaks preserved"),
  fields: z.array(Field),
  lineItems: z.array(LineItem),
  totals: z.object({
    subtotal: z.number().nullable(),
    tax: z.number().nullable(),
    total: z.number().nullable(),
    currency: z.string().nullable().describe("ISO 4217 code, e.g. USD"),
  }),
});

export type Field = z.infer<typeof Field>;
export type LineItem = z.infer<typeof LineItem>;
export type OcrResult = z.infer<typeof OcrResult>;

export const SYSTEM_PROMPT = `You are an OCR and document extraction engine.
Read every piece of text in the image and return it in the requested JSON format.

Rules:
- rawText: all visible text in reading order.
- Dates: always YYYY-MM-DD in "value".
- Amounts: plain numbers without currency symbols or thousands separators (e.g. 1234.50).
- Use these canonical field keys when they apply:
  invoice: invoice_number, date, due_date, vendor, customer, email, phone
  receipt: merchant, date, time, address, phone, payment_method
  business_card: name, title, company, email, phone, website, address
  id_card: name, id_number, date_of_birth, expiry_date, nationality
  Add any other useful fields with your own snake_case keys.
- Put subtotal, tax and total in "totals", not in "fields".
- Only list line items that are actually printed. Never invent values.
- Confidence: lower it for blurry, cut off or ambiguous text.`;
