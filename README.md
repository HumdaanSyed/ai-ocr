# DocLens AI

Upload a document image (receipt, invoice, business card, ID) and get every piece of text and data extracted by OpenAI vision. The app also shows each processing step live, runs validation checks on the extracted data, and exports everything to Excel.

## Setup

1. `npm install`
2. Put your key in `.env.local`:
   ```
   OPENAI_API_KEY=sk-...
   OPENAI_MODEL=gpt-6-luna      # cheap, for development
   ```
3. `npm run dev` and open http://localhost:3000

## Before recording a demo

1. Set `OPENAI_MODEL=gpt-6.1-sol` in `.env.local` and restart `npm run dev`.
2. `npm test && npm run e2e`: free, the OpenAI API is mocked.
3. `npm run smoke`: sends the 4 sample images to the real API through the running app (a few cents). Every line should show ✓.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the app |
| `npm test` | Unit and API route tests (Vitest, mocked OpenAI) |
| `npm run e2e` | Production build + browser tests (Playwright, mocked OpenAI) |
| `npm run smoke` | Real OpenAI check of all samples, needs `npm run dev` running. Pass a URL to use another port: `npm run smoke -- http://localhost:3001` |
| `node scripts/make-samples.mjs` | Regenerate the fictional sample images in `public/samples` |

## How it works

- **Browser:** validates the file, downscales it to ≤2000 px and re-encodes it (fewer tokens, stays under the 5 MB cap), then streams progress from the API.
- **`app/api/ocr/route.ts`:** checks the real file bytes, calls OpenAI with a strict JSON schema (`lib/schema.ts`), runs the checks, and streams each step back as NDJSON.
- **`lib/checks.ts`:** required fields, date/email/phone formats, line item math, totals math and confidence. They re-run in the browser whenever a field is edited.
- **`lib/exportExcel.ts`:** Summary, Line Items and Raw Text sheets.
