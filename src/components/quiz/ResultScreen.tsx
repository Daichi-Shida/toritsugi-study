"use client";

import { motion } from "framer-motion";
import type { Question, SeigoCombinationQuestion } from "@/types";

interface Props {
  question: Question;
  selectedIndex: number;
  onNext: () => void;
  isLast: boolean;
}

export default function ResultScreen({ question, selectedIndex, onNext, isLast }: Props) {
  const isCorrect = selectedIndex === question.correctIndex;
  const qType = question.type ?? "simple_select";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card flex flex-col gap-3"
    >
      {/* 正解・不正解バナー */}
      <div className={`rounded-2xl p-3 text-center font-bold text-lg ${
        isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}>
        {isCorrect ? "✨ 正解！" : "😢 不正解"}
      </div>

      {/* 正誤組み合わせ型：各文の正誤を表示 */}
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

      {/* 解説 */}
      <div className="text-sm text-gray-700 leading-relaxed">
        <p className="font-bold text-gray-800 mb-1">解説</p>
        <p>{question.explanation}</p>
      </div>

      {/* 次へボタン */}
      <button onClick={onNext} className="btn-primary w-full">
        {isLast ? "結果を見る 🎉" : "次の問題へ →"}
      </button>
    </motion.div>
  );
}
