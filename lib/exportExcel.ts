import ExcelJS from "exceljs";
import type { Check } from "./checks";
import type { Stats } from "./events";
import type { OcrResult } from "./schema";

const STATUS_FILL: Record<Check["status"], string> = {
  pass: "FFD1FAE5",
  warn: "FFFEF3C7",
  fail: "FFFEE2E2",
  skip: "FFF1F5F9",
};

function header(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }));
}

const section = (ws: ExcelJS.Worksheet, title: string) => {
  ws.addRow([]);
  ws.addRow([title]).font = { bold: true, size: 13 };
};

export function buildWorkbook(r: OcrResult, checks: Check[], stats: Stats | null, source: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DocLens AI";

  const ws = wb.addWorksheet("Summary");
  ws.columns = [{ width: 28 }, { width: 44 }, { width: 14 }, { width: 14 }];
  ws.addRow(["DocLens AI – Extraction Report"]).font = { bold: true, size: 16 };
  ws.addRow(["Source file", source]);
  ws.addRow(["Document type", `${r.documentType.replace("_", " ")} (${Math.round(r.documentTypeConfidence * 100)}%)`]);
  ws.addRow(["Language", r.language]);
  if (stats) ws.addRow(["Model", `${stats.model} · ${(stats.ms / 1000).toFixed(1)}s`]);

  section(ws, "Fields");
  header(ws.addRow(["Field", "Value", "Type", "Confidence"]));
  for (const f of r.fields) {
    const row = ws.addRow([f.label, f.value, f.type, f.confidence]);
    row.getCell(4).numFmt = "0%";
  }

  section(ws, "Totals");
  for (const [label, v] of [
    ["Subtotal", r.totals.subtotal],
    ["Tax", r.totals.tax],
    ["Total", r.totals.total],
  ] as const) {
    if (v != null) ws.addRow([label, v]).getCell(2).numFmt = "#,##0.00";
  }
  if (r.totals.currency) ws.addRow(["Currency", r.totals.currency]);

  section(ws, "Validation checks");
  header(ws.addRow(["Check", "Detail", "Status"]));
  for (const c of checks) {
    const row = ws.addRow([c.label, c.detail, c.status.toUpperCase()]);
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[c.status] } };
  }

  const li = wb.addWorksheet("Line Items");
  li.columns = [
    { header: "Description", width: 40 },
    { header: "Quantity", width: 12 },
    { header: "Unit price", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Amount", width: 14, style: { numFmt: "#,##0.00" } },
  ];
  header(li.getRow(1));
  for (const item of r.lineItems) li.addRow([item.description, item.quantity, item.unitPrice, item.amount]);
  if (r.lineItems.length) {
    const sum = r.lineItems.reduce((a, b) => a + (b.amount ?? 0), 0);
    const last = r.lineItems.length + 1;
    const row = li.addRow(["Total", null, null, { formula: `SUM(D2:D${last})`, result: sum }]);
    row.font = { bold: true };
  }

  const raw = wb.addWorksheet("Raw Text");
  raw.columns = [{ width: 100 }];
  for (const line of r.rawText.split("\n")) raw.addRow([line]);

  return wb;
}

export async function downloadExcel(r: OcrResult, checks: Check[], stats: Stats | null, source: string) {
  const buf = await buildWorkbook(r, checks, stats, source).xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${source.replace(/\.[^.]+$/, "") || "document"}-extracted.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
