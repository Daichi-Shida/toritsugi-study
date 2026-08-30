/**
 * ステージ10「ココちゃん」を実ブラウザで確認する。
 *
 *  [1] 既存の学習記録に影響が出ないこと（17000EXP未満のステージ判定は今までどおり）
 *  [2] 17000EXPでココちゃんに昇格し、ホーム・レベルアップ演出・解説の
 *      キャラが正しく切り替わること
 *  [3] 解説のセリフが「キャン！（…）」になること
 *
 * 実行: npm run build && npm run start のあと
 *       node scripts/verify_coco_stage.mjs [URL]
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

async function seedProgress(experience, extra = {}) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(([exp, extra]) => {
    localStorage.setItem("toritsugi_progress", JSON.stringify({
      questionRecords: {},
      sessions: [],
      character: { stage: 1, name: "", experience: exp, nextLevelExp: 200, passExpectation: 40 },
      totalStudyDays: 0,
      bookmarkedIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...extra,
    }));
  }, [experience, extra]);
}

async function nameAt(experience) {
  await seedProgress(experience);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  return page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) => /^Lv\.\d+$/.test(p.nextElementSibling?.textContent?.trim() ?? "")) ;
    const lv = [...document.querySelectorAll("span")].find((s) => /^Lv\.\d+$/.test(s.textContent.trim()));
    return { name: lv?.previousElementSibling?.textContent?.trim() ?? null, lv: lv?.textContent?.trim() ?? null };
  });
}

console.log("\n[1] 既存ステージの判定は変わらない（ココちゃん追加の影響なし）");
const table = [
  [0, "豆ころ", "Lv.1"],
  [199, "豆ころ", "Lv.1"],
  [200, "芽が出てきた", "Lv.2"],
  [2000, "メアリー！", "Lv.5"],
  [8000, "豆侍", "Lv.8"],
  [11999, "豆侍", "Lv.8"],
  [12000, "ねこさん", "Lv.9"],
  [16999, "ねこさん", "Lv.9"],
];
for (const [exp, expectedName, expectedLv] of table) {
  const got = await nameAt(exp);
  check(`${exp}EXP → ${expectedName}`, got.name === expectedName && got.lv === expectedLv, `${got.name} / ${got.lv}`);
}

console.log("\n[2] 17000EXPでココちゃんに昇格");
const coco = await nameAt(17000);
check("17000EXP → ココちゃん", coco.name === "ココちゃん" && coco.lv === "Lv.10", `${coco.name} / ${coco.lv}`);
const homeText = await page.evaluate(() => document.body.innerText);
check("ホームに紹介文が出る", homeText.includes("もふもふトイプードル"));
const hasPoodleSvg = await page.evaluate(() => !!document.querySelector('linearGradient#cocoFur, radialGradient#cocoFur'));
check("トイプードルのSVGが描画される", hasPoodleSvg);

console.log("\n[3] 章別学習でキャン！のセリフとレベルアップ演出");
// あと少しでココちゃんになる状態から1問解く（不正解でも +2×難易度 で届く）
await seedProgress(16999);
await page.goto(`${BASE}/quiz?chapter=${encodeURIComponent("医薬品に共通する特性と基本的な知識")}`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
const optionButtons = await page.$$("div.overflow-y-auto button");
check("選択肢が表示される", optionButtons.length > 0, `${optionButtons.length}個`);
await optionButtons[0].click();
await page.waitForTimeout(1200);

const sheetText = await page.evaluate(() => document.body.innerText);
check("ココちゃんのセリフ（キャン／クゥ〜ン）が出る", /キャン|クゥ〜ン/.test(sheetText),
  (sheetText.match(/(キャン|クゥ〜ン)[^\n]*/) ?? ["(なし)"])[0]);
check("ココちゃん用の見出しが出る", /✦ キャン正解！|きゅ〜ん…/.test(sheetText),
  (sheetText.match(/(✦ キャン正解！|きゅ〜ん…)/) ?? ["(なし)"])[0]);
check("レベルアップ演出が出る", /level up!/i.test(sheetText));  // CSSで大文字表示になる
check("ココちゃんへの昇格として表示される",
  sheetText.includes("ココちゃん") && /ステージ 9 → 10/.test(sheetText),
  (sheetText.match(/ステージ \d+ → \d+/) ?? ["?"])[0]);

const savedExp = await page.evaluate(() => JSON.parse(localStorage.getItem("toritsugi_progress")).character);
check("経験値が加算されステージ10になる", savedExp.experience >= 17000 && savedExp.stage === 10,
  `${savedExp.experience}EXP / stage ${savedExp.stage} / ${savedExp.name}`);

console.log("\n[4] JSエラー");
check("pageerror なし", pageErrors.length === 0, pageErrors.join(" / "));

await browser.close();
console.log(failures.length === 0 ? "\n✅ すべてOK" : `\n❌ NG ${failures.length}件: ${failures.join(", ")}`);
process.exit(failures.length === 0 ? 0 : 1);
