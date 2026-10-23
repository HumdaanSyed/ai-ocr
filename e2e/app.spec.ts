import ExcelJS from "exceljs";
import { expect, test, type Page } from "@playwright/test";
import type { OcrEvent } from "../lib/events";
import { receipt } from "../lib/fixtures";

// The OpenAI call is mocked at the network layer, so this costs nothing and is deterministic.
async function mockApi(page: Page, events: OcrEvent[]) {
  await page.route("**/api/ocr", (route) =>
    route.fulfill({
      contentType: "application/x-ndjson",
      body: events.map((e) => JSON.stringify(e)).join("\n") + "\n",
    }),
  );
}

const ok: OcrEvent[] = [
  { type: "step", id: "server", status: "done", ms: 3, detail: "JPEG verified" },
  { type: "step", id: "extract", status: "done", ms: 4200, detail: "3 fields, 2 line items" },
  { type: "step", id: "verify", status: "done", ms: 1, detail: "All checks passed" },
  {
    type: "result",
    result: receipt,
    stats: { model: "gpt-6-luna", inputTokens: 1700, outputTokens: 900, ms: 4300, costUsd: 0.0006 },
  },
];

test("sample → pipeline → results → live checks → Excel export", async ({ page }) => {
  await mockApi(page, ok);
  await page.goto("/");
  await page.getByRole("button", { name: "Receipt" }).click();

  for (const id of ["upload", "optimize", "server", "extract", "verify"])
    await expect(page.getByTestId(`step-${id}`)).toHaveAttribute("data-status", "done");

  await expect(page.getByTestId("doc-type")).toContainText("receipt");
  await expect(page.getByTestId("stats")).toContainText("gpt-6-luna");
  await expect(page.getByTestId("check-total_math")).toHaveAttribute("data-status", "pass");
  await expect(page.getByTestId("check-date")).toHaveAttribute("data-status", "pass");

  await page.getByRole("textbox", { name: "Date" }).fill("2026-02-30");
  await expect(page.getByTestId("check-date")).toHaveAttribute("data-status", "fail");

  await page.getByRole("tab", { name: /Line items/ }).click();
  await expect(page.getByRole("cell", { name: "Croissant" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export to Excel" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("receipt-extracted.xlsx");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(await download.path());
  const cells = wb.getWorksheet("Summary")!.getSheetValues().flat();
  expect(cells).toContain("2026-02-30"); // the edited value is what gets exported
});

test("shows an API error on the failed step", async ({ page }) => {
  await mockApi(page, [
    { type: "step", id: "server", status: "done", ms: 3 },
    { type: "step", id: "extract", status: "error", ms: 900 },
    { type: "error", message: "OpenAI rate limit or quota reached." },
  ]);
  await page.goto("/");
  await page.getByRole("button", { name: "Invoice" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Processing failed" })).toContainText("quota reached");
  await expect(page.getByTestId("step-extract")).toHaveAttribute("data-status", "error");
});

test("rejects a non-image upload in the browser", async ({ page }) => {
  let called = false;
  await page.route("**/api/ocr", (route) => ((called = true), route.abort()));
  await page.goto("/");
  await page.getByTestId("file-input").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(page.getByRole("alert").filter({ hasText: "Processing failed" })).toContainText("not supported");
  await expect(page.getByTestId("step-upload")).toHaveAttribute("data-status", "error");
  expect(called).toBe(false);
});
