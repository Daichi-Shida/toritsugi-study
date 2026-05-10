"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { QuestionCategory, UserProgress } from "@/types";
import { CATEGORY_CHAPTER, CATEGORY_QUESTION_COUNT } from "@/types";
import { loadProgress } from "@/lib/storage";
import { ALL_QUESTIONS } from "@/data/questions";

const CATEGORY_DESCRIPTION: Record<QuestionCategory, string> = {
  "医薬品に共通する特性と基本的な知識": "医薬品の定義・リスク評価・セルフメディケーション",
  "人体の働きと医薬品": "消化器・循環器・神経系と薬の吸収・代謝",
  "主な医薬品とその作用": "かぜ薬・胃腸薬・漢方など各種薬の成分と作用",
  "薬事関係法規・制度": "薬機法・リスク区分・登録販売者制度",
  "医薬品の適正使用・安全対策": "添付文書・副作用報告・安全情報",
};

const CHAPTER_EMOJI: Record<QuestionCategory, string> = {
  "医薬品に共通する特性と基本的な知識": "💊",
  "人体の働きと医薬品": "🫀",
  "主な医薬品とその作用": "🧴",
  "薬事関係法規・制度": "📋",
  "医薬品の適正使用・安全対策": "🛡️",
};

const CATEGORIES = Object.keys(CATEGORY_CHAPTER) as QuestionCategory[];

export default function ChaptersPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  function getCategoryStats(cat: QuestionCategory) {
    const catQuestions = ALL_QUESTIONS.filter((q) => q.category === cat);
    const total = catQuestions.length;
    if (!progress) return { attempted: 0, correct: 0, total, rate: null, untouched: total };
    let attempted = 0;
    let correct = 0;
    for (const q of catQuestions) {
      const r = progress.questionRecords[q.id];
      if (r && r.totalAttempts > 0) {
        attempted++;
        // 直近正答率の代わりに通算正答率を使う
        if (r.correctAttempts / r.totalAttempts >= 0.5) correct++;
      }
    }
    const rate = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
    return { attempted, correct, total, rate, untouched: total - attempted };
  }

  function getRateColor(rate: number | null) {
    if (rate === null) return "bg-gray-200";
    if (rate >= 80) return "bg-green-400";
    if (rate >= 60) return "bg-primary-400";
    if (rate >= 40) return "bg-amber-400";
    return "bg-red-400";
  }

  const bookmarkCount = progress?.bookmarkedIds.length ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <header className="pt-4 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400 text-lg">←</button>
        <div>
          <h1 className="text-xl font-bold text-primary-700">章別学習</h1>
          <p className="text-sm text-gray-500">苦手な章を集中して攻略しよう</p>
        </div>
      </header>

      {/* 見直しリスト導線 */}
      <Link
        href="/quiz?mode=bookmark"
        className={`card flex items-center gap-3 active:scale-[0.98] transition-transform ${
          bookmarkCount > 0 ? "bg-amber-50 border-amber-200" : "opacity-70"
        }`}
      >
        <div className="text-2xl">⭐</div>
        <div className="flex-1">
          <p className="font-bold text-gray-800 text-sm">見直しリスト</p>
          <p className="text-xs text-gray-500">
            {bookmarkCount > 0 ? `${bookmarkCount}問を復習する` : "問題画面で⭐を付けて保存"}
          </p>
        </div>
        {bookmarkCount > 0 && <div className="text-amber-500 text-lg">›</div>}
      </Link>

      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat, idx) => {
          const stats = getCategoryStats(cat);
          const rateColor = getRateColor(stats.rate);
          const examCount = CATEGORY_QUESTION_COUNT[cat];
          const coverage = stats.total > 0 ? Math.round((stats.attempted / stats.total) * 100) : 0;

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <Link
                href={`/quiz?chapter=${encodeURIComponent(cat)}`}
                className="card flex gap-4 items-start active:scale-[0.98] transition-transform"
              >
                <div className="text-3xl mt-1">{CHAPTER_EMOJI[cat]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-primary-500">{CATEGORY_CHAPTER[cat]}</span>
                    <span className="text-xs text-gray-400">試験 {examCount}問</span>
                  </div>
                  <p className="font-bold text-gray-800 text-sm leading-snug mb-1">{cat}</p>
                  <p className="text-xs text-gray-500 mb-2">{CATEGORY_DESCRIPTION[cat]}</p>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${rateColor}`}
                        style={{ width: stats.rate !== null ? `${stats.rate}%` : "0%" }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-12 text-right">
                      {stats.rate !== null ? `${stats.rate}%` : "未学習"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {stats.attempted > 0
                      ? `解答済 ${stats.attempted}/${stats.total}問（カバー率 ${coverage}%）`
                      : `未学習 ${stats.total}問`}
                  </p>
                </div>
                <div className="text-gray-300 text-lg self-center">›</div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="card bg-amber-50 border-amber-200 text-sm text-amber-800">
        <p className="font-bold mb-1">💡 効率的な学習のヒント</p>
        <p>正答率が低い章から優先して取り組みましょう。各章の合格基準は<span className="font-bold">35%以上</span>です。</p>
      </div>
    </div>
  );
}
