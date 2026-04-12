"use client";

import { motion } from "framer-motion";
import type {
  Question,
  SimpleSelectQuestion,
  SeigoCombinationQuestion,
  CorrectCombinationQuestion,
} from "@/types";

interface Props {
  question: Question;
  selectedIndex: number | null;
  isAnswered: boolean;
  onAnswer: (index: number) => void;
}

// ── 選択肢ボタンの色クラスを返す共通関数 ──
function optionClass(i: number, correctIndex: number, selectedIndex: number | null, isAnswered: boolean) {
  if (!isAnswered) return "option-btn-default";
  if (i === correctIndex) return "option-btn-correct";
  if (i === selectedIndex) return "option-btn-wrong";
  return "option-btn border-gray-200 bg-gray-50 text-gray-400";
}

// ── ① 単純選択型 ──
function SimpleSelectOptions({
  question, selectedIndex, isAnswered, onAnswer,
}: { question: SimpleSelectQuestion } & Omit<Props, "question">) {
  return (
    <div className="flex flex-col gap-2">
      {question.options.map((option, i) => (
        <motion.button
          key={i}
          className={optionClass(i, question.correctIndex, selectedIndex, isAnswered)}
          onClick={() => onAnswer(i)}
          disabled={isAnswered}
          whileTap={!isAnswered ? { scale: 0.98 } : {}}
        >
          <span className="font-bold text-gray-400 mr-2">{["A", "B", "C", "D", "E"][i]}.</span>
          {option}
        </motion.button>
      ))}
    </div>
  );
}

// ── ② 正誤組み合わせ型 ──
function SeigoCombinationOptions({
  question, selectedIndex, isAnswered, onAnswer,
}: { question: SeigoCombinationQuestion } & Omit<Props, "question">) {
  const labels = question.statements.map((s) => s.label);

  return (
    <div className="flex flex-col gap-2">
      {/* ラベル行（ア・イ・ウ・エ） */}
      <div className="flex items-center pl-10 gap-0">
        {labels.map((label) => (
          <span
            key={label}
            className="w-10 text-center text-xs font-bold text-primary-500"
          >
            {label}
          </span>
        ))}
      </div>

      {/* 各選択肢 */}
      {question.seigo_options.map((combo, i) => (
        <motion.button
          key={i}
          className={`${optionClass(i, question.correctIndex, selectedIndex, isAnswered)} flex items-center`}
          onClick={() => onAnswer(i)}
          disabled={isAnswered}
          whileTap={!isAnswered ? { scale: 0.98 } : {}}
        >
          <span className="font-bold text-gray-400 w-8 shrink-0 text-sm">{i + 1}.</span>
          <div className="flex">
            {combo.map((isCorrect, j) => (
              <span
                key={j}
                className={`w-10 text-center text-sm font-medium ${
                  isAnswered && i === question.correctIndex
                    ? isCorrect ? "text-green-700" : "text-red-600"
                    : ""
                }`}
              >
                {isCorrect ? "正" : "誤"}
              </span>
            ))}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// ── ③ 正しい組み合わせ型 ──
function CorrectCombinationOptions({
  question, selectedIndex, isAnswered, onAnswer,
}: { question: CorrectCombinationQuestion } & Omit<Props, "question">) {
  return (
    <div className="flex flex-col gap-2">
      {question.combo_options.map((pair, i) => (
        <motion.button
          key={i}
          className={`${optionClass(i, question.correctIndex, selectedIndex, isAnswered)} flex items-center`}
          onClick={() => onAnswer(i)}
          disabled={isAnswered}
          whileTap={!isAnswered ? { scale: 0.98 } : {}}
        >
          <span className="font-bold text-gray-400 mr-3 text-sm">{i + 1}.</span>
          <span>{pair.join("・")}</span>
        </motion.button>
      ))}
    </div>
  );
}

// ── 文章リスト（ア〜エ） ──
function StatementsList({ statements }: { statements: { label: string; text: string }[] }) {
  return (
    <div className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-3">
      {statements.map((s) => (
        <div key={s.label} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
          <span className="font-bold text-primary-500 shrink-0">{s.label}</span>
          <span>{s.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── メインコンポーネント ──
export default function QuizCard({ question, selectedIndex, isAnswered, onAnswer }: Props) {
  const qType = question.type ?? "simple_select";

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card flex flex-col gap-4"
    >
      {/* カテゴリバッジ */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-3 py-1 font-medium">
          {question.category}
        </span>
        <span className="text-xs text-gray-400">
          {"★".repeat(question.difficulty)}{"☆".repeat(3 - question.difficulty)}
        </span>
        {qType !== "simple_select" && (
          <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-medium">
            {qType === "seigo_combination" ? "正誤判定" : "組み合わせ"}
          </span>
        )}
      </div>

      {/* 問題文 */}
      <p className="text-base font-medium leading-relaxed text-gray-800">
        {question.text}
      </p>

      {/* 文章リスト（組み合わせ系のみ） */}
      {(qType === "seigo_combination" || qType === "correct_combination") && (
        <StatementsList statements={(question as SeigoCombinationQuestion | CorrectCombinationQuestion).statements} />
      )}

      {/* 選択肢 */}
      {qType === "simple_select" && (
        <SimpleSelectOptions
          question={question as SimpleSelectQuestion}
          selectedIndex={selectedIndex}
          isAnswered={isAnswered}
          onAnswer={onAnswer}
        />
      )}
      {qType === "seigo_combination" && (
        <SeigoCombinationOptions
          question={question as SeigoCombinationQuestion}
          selectedIndex={selectedIndex}
          isAnswered={isAnswered}
          onAnswer={onAnswer}
        />
      )}
      {qType === "correct_combination" && (
        <CorrectCombinationOptions
          question={question as CorrectCombinationQuestion}
          selectedIndex={selectedIndex}
          isAnswered={isAnswered}
          onAnswer={onAnswer}
        />
      )}
    </motion.div>
  );
}
