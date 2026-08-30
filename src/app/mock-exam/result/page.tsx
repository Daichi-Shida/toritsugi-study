"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MockExamResult, MockExamSession, QuestionCategory } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { loadMockExamResult, markMockExamGrowthCelebrated } from "@/lib/mockExam";
import type { MockExamGrowth } from "@/lib/mockExam";
import QuestionReview from "@/components/mock/QuestionReview";
import LevelUpModal from "@/components/effects/LevelUpModal";

// キャラクターのステージ別アイコン（CharacterDisplay と同じ並び）
const STAGE_EMOJI: Record<number, string> = {
  1: "🫘", 2: "🌱", 3: "🌸", 4: "🥔", 5: "👧", 6: "🕵️‍♀️", 7: "🗡️", 8: "🫛", 9: "🐱", 10: "🐩",
};

export default function MockExamResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<MockExamResult | null>(null);
  const [session, setSession] = useState<MockExamSession | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"wrong" | "all">("wrong");
  const [growth, setGrowth] = useState<MockExamGrowth | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);

  // 保存済みの採点結果を読むだけ。ここでは学習記録を書き換えないので、
  // 結果画面を開き直してもステータスの進行には影響しない。
  useEffect(() => {
    const stored = loadMockExamResult();
    if (!stored) { router.push("/mock-exam"); return; }
    setSession(stored.session);
    setResult(stored.result);
    setGrowth(stored.growth ?? null);
    // レベルアップ演出は最初に結果を見た時だけ（開き直すたびには出さない）
    if (stored.growth && stored.growth.toStage > stored.growth.fromStage && !stored.growth.celebrated) {
      setShowLevelUp(true);
      markMockExamGrowthCelebrated();
    }
  }, [router]);

  if (!result || !session) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">集計中...</p></div>;
  }

  const ratePercent = Math.round((result.totalScore / result.totalPossible) * 100);
  const durationMin = Math.floor(result.durationSeconds / 60);
  const durationSec = result.durationSeconds % 60;

  // 出題順のまま session.questions から取り出す
  const entries = session.questions.map((q, i) => ({ q, i, ans: session.answers[i] }));
  const wrongEntries = entries.filter(({ q, ans }) => ans !== q.correctIndex);
  const reviewEntries = reviewFilter === "wrong" ? wrongEntries : entries;

  const categories = Object.keys(CATEGORY_CHAPTER) as QuestionCategory[];

  return (
    <div className="flex flex-col gap-5 p-5 pb-10">
      {/* 合否バナー */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 15 }}
        className="card text-center relative overflow-hidden"
      >
        <div className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl ${result.isPassed ? "bg-emerald-300/40" : "bg-rose-300/40"}`} />
        <p className="text-[10px] font-bold tracking-[0.3em] text-mocha-500 uppercase mb-2">
          {result.isPassed ? "Result · Pass" : "Result · Try Again"}
        </p>
        <p className="text-5xl mb-2">{result.isPassed ? "🎉" : "📚"}</p>
        <h1 className={`headline text-2xl font-bold mb-2 ${result.isPassed ? "text-emerald-700" : "text-rose-700"}`}>
          {result.isPassed ? "合格" : "不合格"}
        </h1>
        <p className="headline text-4xl font-bold text-mocha-800 mb-1 tabular-nums">
          {result.totalScore}<span className="text-base text-mocha-500 font-normal">/{result.totalPossible}点</span>
        </p>
        <p className={`text-base font-bold tabular-nums tracking-wide ${ratePercent >= 70 ? "text-emerald-700" : "text-rose-700"}`}>
          正答率 {ratePercent}%
        </p>
        <div className="hr-soft my-3" />
        <p className="text-xs text-mocha-500 tracking-wide tabular-nums">
          所要時間 <span className="font-bold text-mocha-700">{durationMin}分{durationSec}秒</span>
        </p>
        {!result.isPassed && ratePercent >= 70 && (
          <p className="text-[11px] text-amber-700 mt-3 font-medium leading-relaxed">
            ⚠ 総合点は合格基準を満たしていますが、一部の章が基準（35%）を下回っています
          </p>
        )}
      </motion.div>

      {/* 獲得経験値 */}
      {growth && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card relative overflow-hidden"
        >
          <div className="absolute -bottom-14 -left-12 w-40 h-40 rounded-full bg-gradient-rose-gold opacity-20 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cream-50 to-cream-200 border border-cream-200 flex items-center justify-center text-2xl shrink-0">
              {STAGE_EMOJI[growth.toStage] ?? "🫘"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Character</p>
              <p className="headline font-bold text-mocha-800 text-sm truncate">{growth.toName}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-mocha-400 tracking-wider uppercase">Exp</p>
              <p className="headline text-xl font-bold text-primary-700 tabular-nums">+{growth.gainedExp}</p>
            </div>
          </div>

          {growth.toStage > growth.fromStage && (
            <p className="mt-2.5 text-xs font-bold text-primary-700">
              🎉 レベルアップ！ ステージ {growth.fromStage} → {growth.toStage}
            </p>
          )}

          <div className="mt-3 h-2 rounded-full overflow-hidden bg-cream-100/80 border border-cream-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-300 via-primary-400 to-primary-600"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, growth.nextLevelExp > 0 ? (growth.totalExp / growth.nextLevelExp) * 100 : 100)}%`,
              }}
              transition={{ duration: 0.7, delay: 0.2 }}
            />
          </div>
          <p className="text-[10px] text-mocha-400 mt-1.5 tracking-wide tabular-nums">
            経験値 {growth.totalExp}
            {growth.toStage >= 10
              ? "（最上位ステージ）"
              : ` ／ 次のステージまであと ${Math.max(0, growth.nextLevelExp - growth.totalExp)}`}
          </p>
        </motion.div>
      )}

      {/* 章別スコア */}
      <div className="card">
        <div className="mb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">By Chapter</p>
          <h2 className="headline text-base font-bold text-mocha-800">章別スコア</h2>
        </div>
        <div className="flex flex-col gap-3.5">
          {categories.map((cat) => {
            const s = result.categoryScores[cat];
            if (!s) return null;
            const rate = s.possible > 0 ? s.score / s.possible : 0;
            const isPassed = rate >= 0.35;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-gold">{CATEGORY_CHAPTER[cat]}</span>
                  <span className="text-[11px] text-mocha-500 truncate flex-1">{cat}</span>
                  <span className={`text-sm font-bold tabular-nums ${isPassed ? "text-emerald-700" : "text-rose-600"}`}>
                    {s.score}/{s.possible}
                    {!isPassed && " ⚠"}
                  </span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden bg-cream-100/80 border border-cream-200">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${isPassed ? "from-emerald-300 to-emerald-500" : "from-rose-300 to-rose-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${rate * 100}%` }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-mocha-400 mt-3 tracking-wide">※ 各章の合格基準：35%以上</p>
      </div>

      {/* 問題と解説の見返し */}
      <div className="card">
        <button
          onClick={() => setShowReview(!showReview)}
          className="w-full flex justify-between items-center"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Review</p>
            <h2 className="headline font-bold text-mocha-800 text-base">
              問題と解説を見返す{" "}
              <span className="text-mocha-500 font-normal text-sm">（間違い{wrongEntries.length}問）</span>
            </h2>
          </div>
          <span className="text-mocha-400 text-sm">{showReview ? "▲" : "▼"}</span>
        </button>

        {showReview && (
          <>
            <div className="flex gap-2 mt-3">
              {([
                { key: "wrong" as const, label: `間違えた問題 ${wrongEntries.length}` },
                { key: "all" as const, label: `全${entries.length}問` },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setReviewFilter(key)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    reviewFilter === key
                      ? "border-primary-400 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-800"
                      : "border-cream-200 bg-white/60 text-mocha-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-3">
              {reviewEntries.length === 0 ? (
                <p className="text-sm text-emerald-700 font-bold py-2">全問正解です 🎉</p>
              ) : (
                reviewEntries.map(({ q, i, ans }) => (
                  <QuestionReview key={`${q.id}_${i}`} question={q} number={i + 1} selectedIndex={ans} />
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* アクション */}
      <div className="flex flex-col gap-2.5">
        <Link href="/mock-exam" className="btn-primary w-full text-center">
          もう一度受験する
        </Link>
        <Link href="/quiz?mode=weak" className="btn-secondary w-full text-center">
          弱点を集中学習する
        </Link>
        <Link href="/" className="btn-ghost w-full text-center">
          ホームに戻る
        </Link>
      </div>

      <LevelUpModal
        show={showLevelUp}
        fromStage={growth?.fromStage ?? 1}
        toStage={growth?.toStage ?? 1}
        toName={growth?.toName ?? ""}
        onClose={() => setShowLevelUp(false)}
      />
    </div>
  );
}
