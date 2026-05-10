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
      className="card flex flex-col gap-3"
    >
      <div className={`rounded-2xl p-3 text-center font-bold text-lg ${
        isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}>
        {isCorrect ? "✨ 正解！" : "😢 不正解"}
      </div>

      {qType === "seigo_combination" && (() => {
        const q = question as SeigoCombinationQuestion;
        const correctCombo = q.seigo_options[q.correctIndex];
        return (
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-xs font-bold text-gray-500 mb-2">正しい正誤の組み合わせ</p>
            <div className="flex flex-col gap-1">
              {q.statements.map((s, i) => (
                <div key={s.label} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-primary-500 shrink-0">{s.label}</span>
                  <span className={`shrink-0 font-bold ${correctCombo[i] ? "text-green-600" : "text-red-500"}`}>
                    {correctCombo[i] ? "正" : "誤"}
                  </span>
                  <span className="text-gray-600 leading-relaxed">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="text-sm text-gray-700 leading-relaxed">
        <p className="font-bold text-gray-800 mb-1">解説</p>
        <p>{question.explanation}</p>
      </div>

      <div className="flex gap-2">
        {onToggleBookmark && (
          <button
            onClick={onToggleBookmark}
            className={`shrink-0 rounded-2xl border-2 px-4 font-bold transition-all active:scale-95 ${
              isBookmarked
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-white border-gray-200 text-gray-500 hover:border-amber-300"
            }`}
            aria-label={isBookmarked ? "見直しから外す" : "見直しに追加"}
          >
            {isBookmarked ? "★ 保存中" : "☆ 見直し"}
          </button>
        )}
        <button onClick={onNext} className="btn-primary flex-1">
          {isLast ? "結果を見る 🎉" : "次の問題へ →"}
        </button>
      </div>
    </motion.div>
  );
}
