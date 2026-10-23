import type { OcrResult } from "./schema";

// A consistent receipt: every check passes. Shared by unit, route and e2e tests.
export const receipt: OcrResult = {
  documentType: "receipt",
  documentTypeConfidence: 0.97,
  language: "en",
  rawText: "CORNER CAFE\n2026-10-20\nLatte 2 x 4.50 9.00\nCroissant 1 x 3.25 3.25\nSubtotal 12.25\nTax 1.00\nTotal 13.25",
  fields: [
    { key: "merchant", label: "Merchant", value: "Corner Cafe", type: "text", confidence: 0.98 },
    { key: "date", label: "Date", value: "2026-10-20", type: "date", confidence: 0.95 },
    { key: "phone", label: "Phone", value: "+1 (555) 010-2030", type: "phone", confidence: 0.9 },
  ],
  lineItems: [
    { description: "Latte", quantity: 2, unitPrice: 4.5, amount: 9 },
    { description: "Croissant", quantity: 1, unitPrice: 3.25, amount: 3.25 },
  ],
  totals: { subtotal: 12.25, tax: 1, total: 13.25, currency: "USD" },
};
