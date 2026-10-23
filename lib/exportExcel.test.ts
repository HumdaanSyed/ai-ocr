import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { runChecks } from "./checks";
import { buildWorkbook } from "./exportExcel";
import { receipt } from "./fixtures";

describe("buildWorkbook", () => {
  it("round-trips fields, checks, line items and raw text through a real .xlsx", async () => {
    const checks = runChecks(receipt);
    const stats = { model: "gpt-6-luna", inputTokens: 1, outputTokens: 1, ms: 1200, costUsd: 0 };
    const buf = await buildWorkbook(receipt, checks, stats, "receipt.png").xlsx.writeBuffer();

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Summary", "Line Items", "Raw Text"]);

    const summary = wb.getWorksheet("Summary")!;
    const cells = summary.getSheetValues().flat().filter(Boolean);
    expect(cells).toContain("receipt.png");
    expect(cells).toContain("Corner Cafe");
    expect(cells).toContain(13.25);
    for (const c of checks) expect(cells).toContain(c.label);

    const li = wb.getWorksheet("Line Items")!;
    expect(li.getRow(1).values).toEqual([, "Description", "Quantity", "Unit price", "Amount"]);
    expect(li.getRow(2).values).toEqual([, "Latte", 2, 4.5, 9]);
    expect(li.getCell("D4").value).toMatchObject({ formula: "SUM(D2:D3)", result: 12.25 });

    expect(wb.getWorksheet("Raw Text")!.rowCount).toBe(receipt.rawText.split("\n").length);
  });

  it("works with no line items or stats", async () => {
    const empty = { ...receipt, lineItems: [] };
    const wb = buildWorkbook(empty, [], null, "x.jpg");
    expect(wb.getWorksheet("Line Items")!.rowCount).toBe(1);
    await expect(wb.xlsx.writeBuffer()).resolves.toBeTruthy();
  });
});
