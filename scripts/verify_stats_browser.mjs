/**
 * 実ブラウザで「問題を入れ替えても達成度の数字が変わらない」ことを確かめる。
 *
 * scripts/make_stats_fixture.py が作った「入れ替え前の学習記録」と
 * 「入れ替え前のコードで出るはずの章別正答率」を localStorage に流し込み、
 * 新しいコードの /stats と /chapters が同じ数字を出すかを見る。
 * ページ内の JS エラーも拾う（サーバ専用コードの混入などを検知するため）。
 *
 * 実行: node scripts/verify_stats_browser.mjs [http://localhost:3000]
 * playwright はこのプロジェクトには入れていないので、同じマシンの
 * ~/sandbox/yosoku-market のものを借りる。
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? "http://localhost:3000";

const require = createRequire(join(process.env.HOME, "sandbox/yosoku-market/package.json"));
const { chromium } = require("playwright");

const fixture = JSON.parse(readFileSync(join(HERE, "stats_fixture.json"), "utf-8"));

const CHAPTER_LABELS = {
  "医薬品に共通する特性と基本的な知識": "第1章",
  "人体の働きと医薬品": "第2章",
  "主な医薬品とその作用": "第3章",
  "薬事関係法規・制度": "第4章",
  "医薬品の適正使用・安全対策": "第5章",
};

const failures = [];
const pageErrors = [];

function check(label, actual, expected) {
  const ok = actual === expected;
  console.log(`  ${ok ? "OK " : "NG "} ${label}: 期待 ${expected} / 実際 ${actual}`);
  if (!ok) failures.push(`${label}: 期待 ${expected} / 実際 ${actual}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") pageErrors.push(`console: ${m.text()}`);
});

// localStorage に学習記録を仕込む（キーは storage.ts の STORAGE_KEY）
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.evaluate((progress) => {
  localStorage.setItem("toritsugi_progress", JSON.stringify(progress));
}, fixture.progress);

// ---- /stats の章別正答率 ----
console.log("\n[/stats] 章別正答率");
await page.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
await page.waitForSelector("text=章別正答率");
const statsRates = await page.evaluate(() => {
  const heading = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("章別正答率"));
  const card = heading.closest(".card");
  const out = {};
  for (const row of card.querySelectorAll(":scope > div > div")) {
    const badge = row.querySelector(".badge");
    const value = row.querySelector("span.tabular-nums:last-of-type");
    if (badge && value) out[badge.textContent.trim()] = value.textContent.trim();
  }
  return out;
});
for (const [cat, exp] of Object.entries(fixture.expected)) {
  check(`${CHAPTER_LABELS[cat]} ${cat}`, statsRates[CHAPTER_LABELS[cat]], `${exp.statsRate}%`);
}

// ---- /chapters の章別正答率 ----
console.log("\n[/chapters] 章別正答率");
await page.goto(`${BASE}/chapters`, { waitUntil: "networkidle" });
await page.waitForSelector("text=章別学習");
const chapterRates = await page.evaluate(() => {
  const out = {};
  for (const link of document.querySelectorAll('a[href^="/quiz?chapter="]')) {
    const badge = link.querySelector(".badge");
    const value = [...link.querySelectorAll("span")].find((s) => /^\d+%$/.test(s.textContent.trim()));
    if (badge && value) out[badge.textContent.trim()] = value.textContent.trim();
  }
  return out;
});
for (const [cat, exp] of Object.entries(fixture.expected)) {
  check(`${CHAPTER_LABELS[cat]} ${cat}`, chapterRates[CHAPTER_LABELS[cat]], `${exp.chaptersRate}%`);
}

// ---- 通算の数字（記録そのものから出るので入れ替えの影響を受けないことの確認）----
console.log("\n[/stats] サマリー");
await page.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
const summary = await page.evaluate(() => {
  const out = {};
  for (const c of document.querySelectorAll(".card-flat")) {
    const label = c.querySelector("p");
    const value = c.querySelector("p.headline");
    if (label && value) out[label.textContent.trim()] = value.textContent.trim();
  }
  return out;
});
const totalAttempts = Object.values(fixture.progress.questionRecords)
  .reduce((s, r) => s + r.totalAttempts, 0);
const totalCorrect = Object.values(fixture.progress.questionRecords)
  .reduce((s, r) => s + r.correctAttempts, 0);
check("累計解答", summary["累計解答"], `${totalAttempts}問`);
check("通算正答率", summary["通算正答率"], `${Math.round((totalCorrect / totalAttempts) * 100)}%`);

// ---- 主要ページがエラーなく開くか ----
console.log("\n[ページ表示]");
for (const path of ["/", "/chapters", "/stats", "/quiz", "/mock-exam"]) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const status = res?.status();
  console.log(`  ${status === 200 ? "OK " : "NG "} ${path}: ${status}`);
  if (status !== 200) failures.push(`${path} が ${status}`);
}

await browser.close();

console.log("\n" + "=".repeat(60));
if (pageErrors.length) {
  console.log(`ページ内エラー ${pageErrors.length} 件:`);
  for (const e of pageErrors.slice(0, 10)) console.log("  - " + e);
}
if (failures.length || pageErrors.length) {
  console.log(`NG: 不一致 ${failures.length} 件 / ページ内エラー ${pageErrors.length} 件`);
  process.exit(1);
}
console.log("OK: 章別正答率・通算の数字は入れ替え前と一致。ページ内エラーなし。");
