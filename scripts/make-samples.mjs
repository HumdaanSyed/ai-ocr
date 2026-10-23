// Renders the fictional sample documents in public/samples. Run: node scripts/make-samples.mjs
import { chromium } from "@playwright/test";

const font = `font-family:'Helvetica Neue',Arial,sans-serif;`;

const receipt = `
<div style="width:340px;padding:28px 24px;background:#fffdf7;font-family:'Courier New',monospace;font-size:14px;color:#222;line-height:1.5">
  <div style="text-align:center;font-weight:bold;font-size:20px">CORNER CAFE</div>
  <div style="text-align:center">214 Maple Street, Springfield<br>Tel: +1 (555) 010-2030</div>
  <div style="border-top:1px dashed #999;margin:10px 0"></div>
  <div>Date: 2026-10-20 &nbsp; Time: 08:42</div><div>Order #4471 &nbsp; Server: Dana</div>
  <div style="border-top:1px dashed #999;margin:10px 0"></div>
  ${[["2 x Latte", "4.50", "9.00"], ["1 x Croissant", "3.25", "3.25"], ["1 x Blueberry Muffin", "2.95", "2.95"], ["2 x Orange Juice", "3.10", "6.20"]]
    .map(([d, u, a]) => `<div style="display:flex;justify-content:space-between"><span>${d} @ ${u}</span><span>${a}</span></div>`)
    .join("")}
  <div style="border-top:1px dashed #999;margin:10px 0"></div>
  <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>21.40</span></div>
  <div style="display:flex;justify-content:space-between"><span>Tax 8%</span><span>1.71</span></div>
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:17px"><span>TOTAL USD</span><span>23.11</span></div>
  <div style="border-top:1px dashed #999;margin:10px 0"></div>
  <div>Paid: VISA **** 4821</div>
  <div style="text-align:center;margin-top:12px">Thank you, come again!</div>
</div>`;

const rows = [
  ["Website redesign – discovery workshop", 1, 1200],
  ["UI design, per page", 6, 350],
  ["Frontend development, hourly", 24, 85],
  ["Hosting setup", 1, 150],
];
const sub = rows.reduce((s, r) => s + r[1] * r[2], 0);
const tax = +(sub * 0.1).toFixed(2);
const fmt = (n) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });
const invoice = `
<div style="width:760px;padding:48px;background:#fff;${font}color:#1e293b;font-size:14px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><div style="font-size:26px;font-weight:800;color:#4338ca">Brightline Studio</div>
      <div>88 Harbor Road, Suite 4<br>Portland, OR 97201<br>billing@brightline.example<br>+1 503 555 0188</div></div>
    <div style="text-align:right"><div style="font-size:32px;font-weight:300;letter-spacing:2px">INVOICE</div>
      <div>Invoice #: <b>INV-2026-0142</b><br>Date: 2026-10-15<br>Due date: 2026-11-14</div></div>
  </div>
  <div style="margin:28px 0 20px"><div style="color:#64748b;font-size:12px;text-transform:uppercase">Bill to</div>
    <b>Acme Logistics Ltd.</b><br>12 Industrial Way, Austin, TX 78701</div>
  <table style="width:100%;border-collapse:collapse">
    <tr style="background:#eef2ff;text-align:left"><th style="padding:10px">Description</th><th style="padding:10px;text-align:right">Qty</th><th style="padding:10px;text-align:right">Unit price</th><th style="padding:10px;text-align:right">Amount</th></tr>
    ${rows.map(([d, q, u]) => `<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px">${d}</td><td style="padding:10px;text-align:right">${q}</td><td style="padding:10px;text-align:right">${fmt(u)}</td><td style="padding:10px;text-align:right">${fmt(q * u)}</td></tr>`).join("")}
  </table>
  <div style="margin-left:auto;width:280px;margin-top:16px;line-height:2">
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmt(sub)}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Tax (10%)</span><span>${fmt(tax)}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:700;font-size:18px;border-top:2px solid #1e293b"><span>Total (USD)</span><span>${fmt(sub + tax)}</span></div>
  </div>
  <div style="margin-top:32px;color:#64748b;font-size:12px">Payment terms: Net 30. Bank transfer to Brightline Studio, account details on request.</div>
</div>`;

const card = `
<div style="width:640px;height:360px;box-sizing:border-box;padding:40px;background:linear-gradient(135deg,#0f172a,#312e81);${font}color:#fff;border-radius:18px;display:flex;flex-direction:column;justify-content:space-between">
  <div><div style="font-size:30px;font-weight:700">Priya Raman</div><div style="color:#a5b4fc;font-size:16px">Senior Product Designer</div></div>
  <div style="font-size:15px;line-height:1.7">
    <b style="font-size:18px">Lumen Labs</b><br>priya.raman@lumenlabs.example<br>+44 20 7946 0321<br>www.lumenlabs.example<br>5 Kings Cross Road, London N1 9AA
  </div>
</div>`;

const id = `
<div style="width:640px;height:400px;box-sizing:border-box;padding:28px;background:linear-gradient(160deg,#ecfeff,#e0e7ff);${font}color:#0f172a;border-radius:18px;border:1px solid #c7d2fe;position:relative;overflow:hidden">
  <div style="position:absolute;right:-30px;top:150px;transform:rotate(-25deg);font-size:64px;font-weight:900;color:rgba(79,70,229,.08)">SPECIMEN</div>
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4f46e5;padding-bottom:10px">
    <b style="font-size:20px;color:#3730a3">NORTHWIND CORPORATION</b><span style="font-size:13px">EMPLOYEE IDENTIFICATION</span></div>
  <div style="display:flex;gap:24px;margin-top:22px">
    <div style="width:140px;height:170px;background:#cbd5e1;border-radius:10px;display:grid;place-items:center;color:#64748b;font-size:60px">👤</div>
    <div style="font-size:14px;line-height:1.9">
      <div><span style="color:#64748b">Name</span><br><b style="font-size:20px">Marcus O. Bennett</b></div>
      <div><span style="color:#64748b">ID number</span> <b>NW-58213-K</b></div>
      <div><span style="color:#64748b">Date of birth</span> <b>1991-04-17</b></div>
      <div><span style="color:#64748b">Department</span> <b>Operations</b></div>
      <div><span style="color:#64748b">Expiry date</span> <b>2028-12-31</b></div>
    </div>
  </div>
</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
for (const [name, html, bg] of [
  ["receipt", receipt, "#d6d3d1"],
  ["invoice", invoice, "#cbd5e1"],
  ["business-card", card, "#e2e8f0"],
  ["id-card", id, "#e2e8f0"],
]) {
  await page.setContent(`<body style="margin:0;padding:32px;background:${bg};display:inline-block">${html}</body>`);
  await page.locator("body").screenshot({ path: `public/samples/${name}.png` });
  console.log(`public/samples/${name}.png`);
}
await browser.close();
