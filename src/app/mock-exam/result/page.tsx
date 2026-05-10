"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MockExamResult, MockExamSession, Question, QuestionCategory, SimpleSelectQuestion, SeigoCombinationQuestion, CorrectCombinationQuestion } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { scoreMockExam, clearMockExamSession } from "@/lib/mockExam";

// 選択肢インデックスから表示テキストを返す
function getAnswerLabel(q: Question, index: number): string {
  const qType = q.type ?? "simple_select";
  if (qType === "simple_select") {
    return `${["A","B","C","D"][index]}. ${(q as SimpleSelectQuestion).options[index]}`;
  }
  if (qType === "seigo_combination") {
    const combo = (q as SeigoCombinationQuestion).seigo_options[index];
    const labels = (q as SeigoCombinationQuestion).statements.map((s) => s.label);
    return `${index + 1}. ${labels.map((l, i) => `${l}:${combo[i] ? "正" : "誤"}`).join(" ")}`;
  }
  if (qType === "correct_combination") {
    const pair = (q as CorrectCombinationQuestion).combo_options[index];
    return `${index + 1}. ${pair.join("・")}`;
  }
  return `${index + 1}`;
}

export default function MockExamResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<MockExamResult | null>(null);
  const [session, setSession] = useState<MockExamSession | null>(null);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("toritsugi_mock_exam");
      if (!raw) { router.push("/mock-exam"); return; }
      const s = JSON.parse(raw) as MockExamSession;
      setSession(s);
      setResult(scoreMockExam(s));
      clearMockExamSession();
    } catch {
      router.push("/mock-exam");
    }
  }, [router]);

  if (!result || !session) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">集計中...</p></div>;
  }

  const ratePercent = Math.round((result.totalScore / result.totalPossible) * 100);
  const durationMin = Math.floor(result.durationSeconds / 60);
  const durationSec = result.durationSeconds % 60;

  // シャッフル後の選択肢順を保つため session.questions から取得
  const wrongEntries = session.questions
    .map((q, i) => ({ q, i, ans: session.answers[i] }))
    .filter(({ q, ans }) => ans !== q.correctIndex);

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

      {/* 間違えた問題レビュー */}
      {wrongEntries.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex justify-between items-center"
          >
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Review</p>
              <h2 className="headline font-bold text-mocha-800 text-base">間違えた問題 <span className="text-mocha-500 font-normal text-sm">（{wrongEntries.length}問）</span></h2>
            </div>
            <span className="text-mocha-400 text-sm">{showReview ? "▲" : "▼"}</span>
          </button>

          {showReview && (
            <div className="mt-3 flex flex-col gap-4">
              {wrongEntries.map(({ q, i, ans }) => (
                <div key={i} className="border-t border-cream-200/60 pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="badge badge-cream">{CATEGORY_CHAPTER[q.category]}</span>
                    <span className="text-[10px] text-mocha-400 tracking-wide">問{i + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-mocha-800 mb-2 leading-relaxed">{q.text}</p>
                  <p className="text-[11px] text-rose-600 mb-1">
                    <span className="font-bold tracking-wide">あなたの答え：</span>{ans !== null ? getAnswerLabel(q, ans) : "未回答"}
                  </p>
                  <p className="text-[11px] text-emerald-700 mb-2">
                    <span className="font-bold tracking-wide">正解：</span>{getAnswerLabel(q, q.correctIndex)}
                  </p>
                  <p className="text-[11px] text-mocha-700 bg-cream-50/80 border border-cream-200 rounded-xl p-3 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
