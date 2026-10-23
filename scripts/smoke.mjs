// Pre-recording check: sends every sample through the running app to the REAL OpenAI API.
// Start the app first (npm run dev), then: npm run smoke [-- http://localhost:3000]
// Costs a few cents with the model set in .env.local.
import { readFile } from "node:fs/promises";

const base = process.argv[2] ?? "http://localhost:3000";
const samples = { "receipt.png": "receipt", "invoice.png": "invoice", "business-card.png": "business_card", "id-card.png": "id_card" };

let failures = 0;
let cost = 0;
for (const [file, expected] of Object.entries(samples)) {
  const form = new FormData();
  form.set("file", new Blob([await readFile(`public/samples/${file}`)], { type: "image/png" }), file);
  let events;
  try {
    const res = await fetch(`${base}/api/ocr`, { method: "POST", body: form });
    events = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
  } catch (e) {
    console.error(`✗ Could not reach ${base}. Is \`npm run dev\` running? (${e.message})`);
    process.exit(1);
  }

  const error = events.find((e) => e.type === "error");
  const result = events.find((e) => e.type === "result");
  const verify = events.find((e) => e.type === "step" && e.id === "verify" && e.status === "done");
  const problems = [];
  if (error) problems.push(error.message);
  else {
    if (result.result.documentType !== expected) problems.push(`type ${result.result.documentType}, expected ${expected}`);
    if (verify?.detail !== "All checks passed") problems.push(verify?.detail ?? "verify step missing");
  }

  if (result) cost += result.stats.costUsd ?? 0;
  const info = result ? `${(result.stats.ms / 1000).toFixed(1)}s, ${result.stats.model}` : "";
  console.log(`${problems.length ? "✗" : "✓"} ${file.padEnd(18)} ${problems.join("; ") || info}`);
  failures += problems.length ? 1 : 0;
}

console.log(`\n${failures ? `${failures} sample(s) failed` : "All samples OK"} · est. cost $${cost.toFixed(4)}`);
process.exit(failures ? 1 : 0);
