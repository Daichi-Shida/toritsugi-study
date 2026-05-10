"use client";

import { motion } from "framer-motion";
import type { Question, SeigoCombinationQuestion } from "@/types";

interface Props {
  question: Question;
  selectedIndex: number;
  onNext: () => void;
  isLast: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}

export default function ResultScreen({ question, selectedIndex, onNext, isLast, isBookmarked, onToggleBookmark }: Props) {
  const isCorrect = selectedIndex === question.correctIndex;
  const qType = question.type ?? "simple_select";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card flex flex-col gap-3.5"
    >
      <div
        className={`rounded-2xl p-3.5 text-center font-bold text-lg tracking-wide border ${
          isCorrect
            ? "bg-gradient-to-br from-emerald-50 to-green-100/80 text-emerald-700 border-emerald-200"
            : "bg-gradient-to-br from-rose-50 to-rose-100/80 text-rose-700 border-rose-200"
        }`}
      >
        {isCorrect ? "✦ 正解！" : "もう一歩…"}
      </div>

      {qType === "seigo_combination" && (() => {
        const q = question as SeigoCombinationQuestion;
        const correctCombo = q.seigo_options[q.correctIndex];
        return (
          <div className="rounded-2xl p-3.5 border border-cream-200 bg-cream-50/70">
            <p className="text-[10px] font-bold tracking-[0.2em] text-mocha-500 mb-2 uppercase">正答の組み合わせ</p>
            <div className="flex flex-col gap-1.5">
              {q.statements.map((s, i) => (
                <div key={s.label} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-primary-600 shrink-0">{s.label}</span>
                  <span className={`shrink-0 font-bold ${correctCombo[i] ? "text-emerald-700" : "text-rose-600"}`}>
                    {correctCombo[i] ? "正" : "誤"}
                  </span>
                  <span className="text-mocha-700 leading-relaxed">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="text-sm text-mocha-700 leading-relaxed">
        <p className="text-[10px] font-bold tracking-[0.2em] text-mocha-500 mb-1.5 uppercase">解説</p>
        <p>{question.explanation}</p>
      </div>

      <div className="flex gap-2 mt-1">
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            className={`shrink-0 rounded-full px-4 font-bold transition-all active:scale-95 backdrop-blur-md ${
              isBookmarked
                ? "bg-gradient-to-br from-primary-100 to-primary-200 border-2 border-primary-400 text-primary-800"
                : "bg-white/70 border-2 border-cream-200 text-mocha-500 hover:border-primary-300"
            }`}
            aria-label={isBookmarked ? "見直しから外す" : "見直しに追加"}
          >
            {isBookmarked ? "★ 保存中" : "☆ 見直し"}
          </button>
        )}
        <button onClick={onNext} className="btn-primary flex-1">
          {isLast ? "結果を見る" : "次の問題へ"}
        </button>
      </div>
    </motion.div>
  );
}
