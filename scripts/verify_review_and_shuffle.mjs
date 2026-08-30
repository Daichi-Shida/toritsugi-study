/**
 * 2026-08-30 の2件の修正を実ブラウザで確認する。
 *
 *  [1] クイック模擬試験の結果画面から、元の問題（ａ・ｂ…の文章と選択肢）を
 *      解説と一緒に見返せること。結果画面を再読み込み・戻る→進むしても消えないこと。
 *  [2] 模擬試験でキャラクターの経験値が増えること・
 *      結果画面を開き直しても学習記録と経験値が二重に進まないこと。
 *  [3] 章別学習で、開くたびに出題が変わること（以前は毎回同じ10問・同じ順）。
 *      間違えた問題が優先される性質は残っていること。
 *
 * 実行: npm run build && npm run start のあと
 *       node scripts/verify_review_and_shuffle.mjs [URL]
 * playwright は ~/sandbox/yosoku-market のものを借りる。
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
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.on("pageerror", (e) => pageErrors.push(String(e)));

// ===== [1] クイック模擬試験 → 結果画面の見返し =====
console.log("\n[1] クイック模擬試験の結果から元の問題を確認できる");
await page.goto(`${BASE}/mock-exam`, { waitUntil: "networkidle" });
const expBefore = await page.evaluate(() => {
  const raw = localStorage.getItem("toritsugi_progress");
  return raw ? JSON.parse(raw).character.experience : 0;
});
await page.click("text=クイック試験を始める");
await page.waitForTimeout(500);

// 30問を「3問に1問だけ正解」で回答する（間違いと正解を混ぜる）
const total = await page.evaluate(() => JSON.parse(localStorage.getItem("toritsugi_mock_exam")).questions.length);
check("クイックは30問", total === 30, `${total}問`);
for (let i = 0; i < total; i++) {
  const correctIndex = await page.evaluate(
    (idx) => JSON.parse(localStorage.getItem("toritsugi_mock_exam")).questions[idx].correctIndex,
    i
  );
  const pick = i % 3 === 0 ? correctIndex : (correctIndex + 1) % 4;
  const buttons = await page.$$(".flex-1.overflow-y-auto button");
  await buttons[pick].click();
  await page.waitForTimeout(30);
  if (i < total - 1) await page.click("text=次へ →");
  await page.waitForTimeout(30);
}
await page.click("text=提出する");
await page.waitForTimeout(200);
await page.click("div.card >> text=提出する");
await page.waitForURL("**/mock-exam/result", { timeout: 5000 });
await page.waitForTimeout(600);

const progressAfterSubmit = await page.evaluate(() => localStorage.getItem("toritsugi_progress"));

// 提出直後：レベルアップ演出 → 経験値カード
const levelUpShown = await page.waitForSelector("text=Level Up!", { timeout: 8000 }).catch(() => null);
check("レベルアップ演出が出る", !!levelUpShown);
if (levelUpShown) {
  // 演出のアニメーションが続くのでJS側からクリックする（実機タップが通ることは確認済み）
  await page.evaluate(() => {
    [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "続ける")?.click();
  });
  await page.waitForTimeout(700);
  const closed = await page.evaluate(() => !document.body.innerText.includes("Level Up!"));
  check("『続ける』で演出を閉じられる", closed);
}
const expected = await page.evaluate(() => {
  const stored = JSON.parse(localStorage.getItem("toritsugi_mock_exam_result"));
  return stored.session.questions.reduce(
    (sum, q, i) => sum + (stored.session.answers[i] === q.correctIndex ? 10 : 2) * q.difficulty,
    0
  );
});
const charAfter = JSON.parse(progressAfterSubmit).character;
check("模擬試験で経験値が増える", charAfter.experience === expBefore + expected,
  `${expBefore} → ${charAfter.experience}（期待 +${expected}）`);
check("合格期待値も更新される", charAfter.passExpectation > 0, `${charAfter.passExpectation}%`);
const resultText = await page.evaluate(() => document.body.innerText);
check("結果画面に獲得経験値が出る", resultText.includes(`+${expected}`), `+${expected}`);
check("キャラクター名が出る", /豆ころ|芽が出てきた|花が咲いてきた|さといも|メアリー|豆侍|ねこさん/.test(resultText));

await page.click("text=問題と解説を見返す");
await page.waitForTimeout(400);

const reviewText = await page.evaluate(() => document.body.innerText);
const firstWrong = await page.evaluate(() => {
  const stored = JSON.parse(localStorage.getItem("toritsugi_mock_exam_result"));
  const idx = stored.session.answers.findIndex((a, i) => a !== stored.session.questions[i].correctIndex);
  const q = stored.session.questions[idx];
  return {
    text: q.text,
    statement: q.statements ? q.statements[0].text : q.passage ?? (q.options ? q.options[0] : ""),
    explanation: q.explanation.slice(0, 20),
  };
});
check("問題文が出ている", reviewText.includes(firstWrong.text.slice(0, 20)));
check("元の問題（ａ等の文章／選択肢）が出ている", reviewText.includes(firstWrong.statement.slice(0, 25)), firstWrong.statement.slice(0, 25));
check("解説も出ている", reviewText.includes(firstWrong.explanation));
check("正解の印がある", reviewText.includes("◎ 正解"));
check("自分の答えの印がある", reviewText.includes("あなたの答え"));

// 全問表示に切り替え
await page.click("text=/^全\\d+問$/");
await page.waitForTimeout(300);
const allCount = await page.evaluate(() =>
  document.body.innerText.match(/問\d+/g)?.length ?? 0
);
check("『全30問』に切り替えると全問見返せる", allCount >= 30, `${allCount}件の問番号`);

// 再読み込みしても残る
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(600);
check("再読み込みしても結果画面が消えない", page.url().includes("/mock-exam/result"), page.url());

// 戻る → 進む
await page.goto(`${BASE}/mock-exam`, { waitUntil: "networkidle" });
const introText = await page.evaluate(() => document.body.innerText);
check("開始画面から『前回の結果・解説を見る』で戻れる", introText.includes("前回の結果・解説を見る"));
await page.click("text=前回の結果・解説を見る");
await page.waitForTimeout(600);
check("結果画面が再表示される", page.url().includes("/mock-exam/result"));
const again = await page.evaluate(() => document.body.innerText);
check("採点結果も同じまま残っている", /正答率 \d+%/.test(again));
check("開き直したときはレベルアップ演出を繰り返さない", !again.includes("Level Up!"));
check("獲得経験値の表示は残る", /Exp\s*\+\d+/.test(again) || again.includes("経験値"));

// ===== [2] ステータス進行が二重に進まない =====
console.log("\n[2] 結果画面を開き直してもステータスが二重に進まない");
const progressNow = await page.evaluate(() => localStorage.getItem("toritsugi_progress"));
const a = JSON.parse(progressAfterSubmit);
const b = JSON.parse(progressNow);
check("解答した問題数が変わっていない",
  Object.keys(a.questionRecords).length === Object.keys(b.questionRecords).length,
  `${Object.keys(a.questionRecords).length} → ${Object.keys(b.questionRecords).length}`);
check("経験値が変わっていない", a.character.experience === b.character.experience,
  `${a.character.experience} → ${b.character.experience}`);
const sum = (p) => p.sessions.reduce((n, s) => n + s.questionsAnswered, 0);
check("学習セッションの解答数が変わっていない", sum(a) === sum(b), `${sum(a)} → ${sum(b)}`);
check("模擬試験の30問が1回だけ記録されている", sum(b) === 30, `${sum(b)}問`);

// ===== [3] 章別学習の出題がランダムになる =====
console.log("\n[3] 章別学習は開くたびに出題が変わる");
await page.evaluate(() => { localStorage.clear(); });
const CHAPTER = "医薬品に共通する特性と基本的な知識";
const sessions = [];
for (let i = 0; i < 5; i++) {
  await page.goto(`${BASE}/quiz?chapter=${encodeURIComponent(CHAPTER)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem("toritsugi_recent_questions")).slice(0, 10));
  sessions.push(ids);
}
const overlaps = sessions.slice(1).map((s, i) => s.filter((id) => sessions[i].includes(id)).length);
const union = new Set(sessions.flat());
check("連続する回で同じ問題が繰り返されない", overlaps.every((n) => n <= 2), `重複 ${overlaps.join(",")}問/10問`);
check("5回で幅広く出題される", union.size >= 40, `${union.size}種類 / 50問中`);

console.log("\n[3b] 間違えた問題は優先して出る");
await page.evaluate(() => localStorage.clear());
await page.goto(`${BASE}/quiz?chapter=${encodeURIComponent(CHAPTER)}`, { waitUntil: "networkidle" });
await page.waitForTimeout(300);
// いま出た10問を「間違えた」ことにして、次の回でどれだけ再出題されるか見る
const seeded = await page.evaluate(() => {
  const ids = JSON.parse(localStorage.getItem("toritsugi_recent_questions")).slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  const records = {};
  for (const id of ids) {
    records[id] = {
      questionId: id, interval: 0, easeFactor: 2.3, nextReviewDate: yesterday,
      totalAttempts: 1, correctAttempts: 0, lastAttemptDate: yesterday, lastResult: "wrong",
    };
  }
  const progress = JSON.parse(localStorage.getItem("toritsugi_progress") ?? "null") ?? {
    questionRecords: {}, sessions: [], character: { stage: 1, name: "", experience: 0, nextLevelExp: 50, passExpectation: 0 },
    totalStudyDays: 0, bookmarkedIds: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  progress.questionRecords = records;
  localStorage.setItem("toritsugi_progress", JSON.stringify(progress));
  localStorage.setItem("toritsugi_recent_questions", "[]");
  return ids;
});
const reviewRounds = [];
for (let i = 0; i < 3; i++) {
  await page.goto(`${BASE}/quiz?chapter=${encodeURIComponent(CHAPTER)}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem("toritsugi_recent_questions")).slice(0, 10));
  reviewRounds.push(ids.filter((id) => seeded.includes(id)).length);
}
check("間違えた問題が毎回混ざる", reviewRounds.every((n) => n >= 2), `復習分 ${reviewRounds.join(",")}問/10問`);
check("復習だけで埋め尽くされない（新しい問題も混ざる）", reviewRounds.every((n) => n <= 6), `復習分 ${reviewRounds.join(",")}問/10問`);

// ===== [5] 似た問題が同じ回に入らない =====
console.log("\n[5] 似た論点の問題が同じ回に重ならない");
// アプリと同じ指標（文字3-gramのJaccard・しきい値0.40）をページ内で再現して測る
const SIM = `(() => {
  const content = (q) => [q.text, ...(q.statements ?? []).map(s => s.text), q.passage ?? "", ...(q.options ?? [])].join("");
  const grams = (q) => { const t = content(q).replace(/[\\s、。，．・（）()「」『』]/g, ""); const g = new Set(); for (let i = 0; i + 3 <= t.length; i++) g.add(t.slice(i, i + 3)); return g; };
  return (qs) => { const G = qs.map(grams); let max = 0, pair = null;
    for (let i = 0; i < qs.length; i++) for (let j = i + 1; j < qs.length; j++) {
      let inter = 0; for (const x of G[i]) if (G[j].has(x)) inter++;
      const s = inter / (G[i].size + G[j].size - inter);
      if (s > max) { max = s; pair = [qs[i].id, qs[j].id]; } }
    return { max, pair }; };
})()`;

const examStats = [];
for (let i = 0; i < 3; i++) {
  await page.goto(`${BASE}/mock-exam`, { waitUntil: "networkidle" });
  await page.click("text=クイック試験を始める");
  await page.waitForTimeout(300);
  const stat = await page.evaluate((sim) => {
    const qs = JSON.parse(localStorage.getItem("toritsugi_mock_exam")).questions;
    const dup = qs.length - new Set(qs.map((q) => q.id)).size;
    return { dup, count: qs.length, ...eval(sim)(qs) };
  }, SIM);
  examStats.push(stat);
}
check("模擬試験に同じ問題が二度出ない", examStats.every((s) => s.dup === 0), examStats.map((s) => s.dup).join(","));
check("模擬試験に似すぎた組み合わせが無い", examStats.every((s) => s.max <= 0.4),
  examStats.map((s) => s.max.toFixed(2)).join(","));

await page.evaluate(() => localStorage.clear());
const chapterStats = [];
for (let i = 0; i < 3; i++) {
  await page.goto(`${BASE}/quiz?chapter=${encodeURIComponent("主な医薬品とその作用")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem("toritsugi_recent_questions")).slice(0, 10));
  const stat = await page.evaluate(([sim, ids]) => {
    // 出題された問題の中身は画面から取れないので、ID順に一致する問題を探す用に
    // 表示中の問題文だけでも比較できるよう、ここでは重複IDのみ確認する
    return { dup: ids.length - new Set(ids).size };
  }, [SIM, ids]);
  chapterStats.push(stat);
}
check("章別学習の1セッションに同じ問題が二度出ない", chapterStats.every((s) => s.dup === 0));

console.log("\n[4] JSエラー");
check("pageerror なし", pageErrors.length === 0, pageErrors.join(" / "));

await browser.close();
console.log(failures.length === 0 ? "\n✅ すべてOK" : `\n❌ NG ${failures.length}件: ${failures.join(", ")}`);
process.exit(failures.length === 0 ? 0 : 1);
