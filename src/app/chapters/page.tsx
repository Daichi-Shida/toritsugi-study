"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { QuestionCategory, UserProgress } from "@/types";
import { CATEGORY_CHAPTER, CATEGORY_QUESTION_COUNT } from "@/types";
import { loadProgress } from "@/lib/storage";
import { getCategoryOf } from "@/lib/questionIndex";
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
    if (!progress) return { attempted: 0, correct: 0, total, rate: null, covered: 0 };
    // 正答率は「解いた記録」から数える。出題プールから外した問題の記録も
    // 章さえ分かれば数に入れるので、問題を入れ替えても達成度の数字は動かない。
    let attempted = 0;
    let correct = 0;
    for (const r of Object.values(progress.questionRecords)) {
      if (r.totalAttempts <= 0) continue;
      if (getCategoryOf(r.questionId) !== cat) continue;
      attempted++;
      if (r.correctAttempts / r.totalAttempts >= 0.5) correct++;
    }
    // カバー率だけは現行プールに対する進み具合なので、プール内の問題で数える
    let covered = 0;
    for (const q of catQuestions) {
      const r = progress.questionRecords[q.id];
      if (r && r.totalAttempts > 0) covered++;
    }
    const rate = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
    return { attempted, correct, total, rate, covered };
  }

  function getRateBg(rate: number | null) {
    if (rate === null) return "from-cream-100 to-cream-200";
    if (rate >= 80) return "from-emerald-300 to-emerald-500";
    if (rate >= 60) return "from-primary-300 to-primary-500";
    if (rate >= 40) return "from-amber-300 to-amber-500";
    return "from-rose-300 to-rose-500";
  }

  const bookmarkCount = progress?.bookmarkedIds.length ?? 0;

  return (
    <div className="flex flex-col gap-5 p-5 pb-10">
      <header className="pt-5 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/70 flex items-center justify-center text-mocha-500 hover:text-mocha-800" aria-label="戻る">←</button>
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] text-primary-600 uppercase">Chapters</p>
          <h1 className="headline text-xl font-bold text-mocha-800">章別学習</h1>
        </div>
      </header>

      <Link
        href="/quiz?mode=bookmark"
        className={`card flex items-center gap-3 active:scale-[0.98] transition-transform ${bookmarkCount > 0 ? "" : "opacity-70"}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-rose-gold flex items-center justify-center text-2xl shadow-glow-soft">⭐</div>
        <div className="flex-1">
          <p className="font-bold text-mocha-800 text-sm">見直しリスト</p>
          <p className="text-[11px] text-mocha-500 mt-0.5">
            {bookmarkCount > 0 ? `${bookmarkCount}問をもう一度確認する` : "問題画面で⭐を付けて保存"}
          </p>
        </div>
        {bookmarkCount > 0 && <div className="text-primary-500 text-lg">›</div>}
      </Link>

      <div className="flex flex-col gap-3">
        {CATEGORIES.map((cat, idx) => {
          const stats = getCategoryStats(cat);
          const examCount = CATEGORY_QUESTION_COUNT[cat];
          const coverage = stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0;

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
            >
              <Link
                href={`/quiz?chapter=${encodeURIComponent(cat)}`}
                className="card flex gap-4 items-start active:scale-[0.98] transition-transform group"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cream-50 to-cream-200 border border-cream-200 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                  {CHAPTER_EMOJI[cat]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge badge-gold">{CATEGORY_CHAPTER[cat]}</span>
                    <span className="text-[10px] text-mocha-400 tracking-wide">試験 {examCount}問</span>
                  </div>
                  <p className="font-bold text-mocha-800 text-sm leading-snug mb-1">{cat}</p>
                  <p className="text-[11px] text-mocha-500 mb-2.5 leading-relaxed">{CATEGORY_DESCRIPTION[cat]}</p>

                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 rounded-full overflow-hidden bg-cream-100/80 border border-cream-200">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${getRateBg(stats.rate)}`}
                        initial={{ width: 0 }}
                        animate={{ width: stats.rate !== null ? `${stats.rate}%` : "0%" }}
                        transition={{ duration: 0.6, delay: 0.05 + idx * 0.05 }}
                      />
                    </div>
                    <span className="text-xs font-bold text-mocha-700 w-12 text-right tabular-nums">
                      {stats.rate !== null ? `${stats.rate}%` : "—"}
                    </span>
                  </div>
                  <p className="text-[10px] text-mocha-400 tracking-wide">
                    {stats.attempted > 0
                      ? `解答 ${stats.attempted}問（新しい${stats.total}問のカバー率 ${coverage}%）`
                      : `未学習 ${stats.total}問`}
                  </p>
                </div>
                <div className="text-mocha-300 text-lg self-center group-hover:text-primary-500 transition-colors">›</div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="card-flat bg-gradient-to-br from-primary-50/80 to-cream-50/80 border-primary-200/50 text-sm text-mocha-700 mt-2">
        <p className="font-bold mb-1 text-mocha-800">💡 効率的な学習のヒント</p>
        <p className="text-xs leading-relaxed">正答率が低い章から優先して取り組みましょう。各章の合格基準は<span className="font-bold text-primary-700">35%以上</span>です。</p>
      </div>
    </div>
  );
}
