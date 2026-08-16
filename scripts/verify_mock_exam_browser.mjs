/**
 * 模擬試験の時間制限撤廃を実ブラウザで確認する。
 *
 *  1. クイック模擬試験を始めて、ヘッダーの時計が「増える」こと（＝経過時間）
 *  2. 制限時間の切れた古いセッション（timeLimitSeconds付き・3時間前開始）を再開しても
 *     時間切れで勝手に提出されないこと。以前はここで即採点に飛んでいた
 *  3. 提出フローが従来どおり結果画面まで通ること
 *
 * 実行: node scripts/verify_mock_exam_browser.mjs [URL]
 * playwright は ~/sandbox/yosoku-market のものを借りる。
 *
 * ※ 3 は本番ビルド（next build && next start）に対して実行すること。
 *   dev サーバは React StrictMode で effect が2回走り、結果画面が
 *   「終了済みセッションは読み込まない」判定で /mock-exam に戻ってしまう。
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const require = createRequire(join(process.env.HOME, "sandbox/yosoku-market/package.json"));
const { chromium } = require("playwright");

const failures = [];
const pageErrors = [];
function check(label, ok, detail = "") {
  console.log(`  ${ok ? "OK " : "NG "} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 390, height: 844 } }).then((c) => c.newPage());
page.on("pageerror", (e) => pageErrors.push(String(e)));

const header = () => page.evaluate(() => {
  const el = [...document.querySelectorAll("p")].find((p) => /^\d+:\d{2}(:\d{2})?$/.test(p.textContent.trim()));
  return el ? el.textContent.trim() : null;
});

console.log("\n[1] クイック模擬試験の時計が増える");
await page.goto(`${BASE}/mock-exam`, { waitUntil: "networkidle" });
const intro = await page.evaluate(() => document.body.innerText);
check("開始画面に「制限時間」の記載がない", !intro.includes("制限時間：") );
check("開始画面に「時間制限なし」と出る", intro.includes("時間制限なし"));
await page.click("text=クイック試験を始める");
await page.waitForTimeout(1500);
const t1 = await header();
await page.waitForTimeout(3000);
const t2 = await header();
check("経過時間が表示される", t1 !== null, `${t1} → ${t2}`);
check("時計が増えている（カウントダウンではない）", t1 !== null && t2 !== null && t2 > t1);

console.log("\n[2] 制限時間切れの古いセッションを再開しても自動提出されない");
await page.evaluate(() => {
  const raw = localStorage.getItem("toritsugi_mock_exam");
  const s = JSON.parse(raw);
  // 旧仕様のデータを再現：30分の制限つき・3時間前に開始
  s.timeLimitSeconds = 1800;
  s.startedAt = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
  localStorage.setItem("toritsugi_mock_exam", JSON.stringify(s));
});
await page.goto(`${BASE}/mock-exam`, { waitUntil: "networkidle" });
await page.click("text=前回の試験を再開する");
await page.waitForTimeout(3000);
check("結果画面に飛ばされていない", !page.url().includes("/result"), page.url());
const t3 = await header();
check("3時間経過が表示される", t3 !== null && t3.startsWith("3:"), String(t3));

console.log("\n[3] 提出して結果画面まで進む");
await page.click("text=問題一覧");
await page.waitForTimeout(600);
// 問題一覧モーダルの「提出する」→ 確認画面の「提出する」
await page.click(".btn-primary:has-text('提出する')");
await page.waitForTimeout(800);
await page.click("text=提出する");
await page.waitForTimeout(2500);
check("結果画面に到達", page.url().includes("/mock-exam/result"), page.url());
const result = await page.evaluate(() => document.body.innerText);
check("所要時間が表示される", /所要時間/.test(result), (result.match(/所要時間\s*\S+/) ?? [""])[0]);

await browser.close();

console.log("\n" + "=".repeat(60));
if (pageErrors.length) {
  console.log(`ページ内エラー ${pageErrors.length} 件:`);
  for (const e of pageErrors.slice(0, 5)) console.log("  - " + e);
}
if (failures.length || pageErrors.length) {
  console.log(`NG: 失敗 ${failures.length} 件 / ページ内エラー ${pageErrors.length} 件`);
  process.exit(1);
}
console.log("OK: 制限時間なしで模擬試験が進み、時間切れの自動提出も起きない。");
