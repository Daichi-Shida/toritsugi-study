"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import type { MockExamResult, MockExamSession, Question, QuestionCategory, SimpleSelectQuestion, SeigoCombinationQuestion, CorrectCombinationQuestion } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { scoreMockExam, clearMockExamSession } from "@/lib/mockExam";
import allQuestions from "@/data/questions/all.json";
import seigoQuestions from "@/data/questions/seigo_sample.json";

const ALL_QUESTIONS = [...allQuestions, ...seigoQuestions] as Question[];

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

  const wrongQuestions = ALL_QUESTIONS.filter((q) => result.wrongQuestionIds.includes(q.id));

  const categories = Object.keys(CATEGORY_CHAPTER) as QuestionCategory[];

  return (
    <div className="flex flex-col gap-5 p-4 pb-8">
      {/* 合否バナー */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 15 }}
        className={`card text-center ${result.isPassed ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
      >
        <p className="text-5xl mb-2">{result.isPassed ? "🎉" : "📚"}</p>
        <h1 className="text-2xl font-bold mb-1">{result.isPassed ? "合格！" : "不合格"}</h1>
        <p className="text-4xl font-bold text-gray-800 mb-1">
          {result.totalScore}<span className="text-lg text-gray-500">/{result.totalPossible}点</span>
        </p>
        <p className={`text-lg font-bold ${ratePercent >= 70 ? "text-green-600" : "text-red-600"}`}>
          正答率 {ratePercent}%
        </p>
        <p className="text-sm text-gray-500 mt-2">
          所要時間 {durationMin}分{durationSec}秒
        </p>
        {!result.isPassed && ratePercent >= 70 && (
          <p className="text-sm text-amber-600 mt-2 font-medium">
            ⚠️ 総合点は合格基準を満たしていますが、一部の章が基準（35%）を下回っています
          </p>
        )}
      </motion.div>

      {/* 章別スコア */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-3">章別スコア</h2>
        <div className="flex flex-col gap-3">
          {categories.map((cat) => {
            const s = result.categoryScores[cat];
            if (!s) return null;
            const rate = s.possible > 0 ? s.score / s.possible : 0;
            const isPassed = rate >= 0.35;
            return (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 flex-1">
                    <span className="font-bold text-primary-600 mr-1">{CATEGORY_CHAPTER[cat]}</span>
                    {cat}
                  </span>
                  <span className={`text-sm font-bold ml-2 ${isPassed ? "text-green-600" : "text-red-600"}`}>
                    {s.score}/{s.possible}
                    {!isPassed && " ⚠️"}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isPassed ? "bg-green-400" : "bg-red-400"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${rate * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">※ 各章の合格基準：35%以上</p>
      </div>

      {/* 間違えた問題レビュー */}
      {wrongQuestions.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex justify-between items-center font-bold text-gray-800"
          >
            <span>間違えた問題（{wrongQuestions.length}問）</span>
            <span className="text-gray-400">{showReview ? "▲" : "▼"}</span>
          </button>

          {showReview && (
            <div className="mt-3 flex flex-col gap-4">
              {wrongQuestions.map((q, idx) => {
                const myAnswer = session.answers[session.questions.findIndex(sq => sq.id === q.id)];
                return (
                  <div key={q.id} className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-primary-600 font-medium mb-1">
                      {CATEGORY_CHAPTER[q.category]} {q.category}
                    </p>
                    <p className="text-sm font-medium text-gray-800 mb-2">{q.text}</p>
                    <p className="text-xs text-red-600 mb-1">
                      あなたの答え：{myAnswer !== null ? getAnswerLabel(q, myAnswer) : "未回答"}
                    </p>
                    <p className="text-xs text-green-700 mb-2">
                      正解：{getAnswerLabel(q, q.correctIndex)}
                    </p>
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* アクション */}
      <div className="flex flex-col gap-3">
        <Link href="/mock-exam" className="btn-primary w-full text-center">
          もう一度受験する
        </Link>
        <Link href="/quiz?mode=weak" className="btn-secondary w-full text-center">
          弱点を集中学習する 🎯
        </Link>
        <Link href="/" className="btn-secondary w-full text-center">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
