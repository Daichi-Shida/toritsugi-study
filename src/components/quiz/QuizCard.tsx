"use client";

import { motion } from "framer-motion";
import type {
  Question,
  SimpleSelectQuestion,
  SeigoCombinationQuestion,
  CorrectCombinationQuestion,
  WordCombinationQuestion,
} from "@/types";

interface Props {
  question: Question;
  selectedIndex: number | null;
  isAnswered: boolean;
  onAnswer: (index: number) => void;
}

function optionClass(i: number, correctIndex: number, selectedIndex: number | null, isAnswered: boolean) {
  if (!isAnswered) return "option-btn-default";
  if (i === correctIndex) return "option-btn-correct";
  if (i === selectedIndex) return "option-btn-wrong";
  return "option-btn opacity-50 grayscale-[0.3]";
}

function SimpleSelectOptions({ question, selectedIndex, isAnswered, onAnswer }: { question: SimpleSelectQuestion } & Omit<Props, "question">) {
  return (
    <div className="flex flex-col gap-2">
      {question.options.map((option, i) => {
        const isWrongPick = isAnswered && i === selectedIndex && i !== question.correctIndex;
        const isCorrectPick = isAnswered && i === question.correctIndex;
        return (
          <motion.button
            key={i}
            className={optionClass(i, question.correctIndex, selectedIndex, isAnswered)}
            onClick={() => onAnswer(i)}
            disabled={isAnswered}
            whileTap={!isAnswered ? { scale: 0.97 } : {}}
            whileHover={!isAnswered ? { scale: 1.01 } : {}}
            animate={
              isWrongPick
                ? { x: [0, -10, 10, -8, 6, -3, 0] }
                : isCorrectPick
                ? { scale: [1, 1.04, 1] }
                : {}
            }
            transition={isWrongPick ? { duration: 0.5 } : { duration: 0.4 }}
          >
            {/* 本試験は選択肢が1〜5の番号なので、番号のまま表示する */}
            <span className="font-bold text-primary-500 mr-2.5 tracking-wide">{i + 1}.</span>
            <span className="leading-relaxed">{option}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function SeigoCombinationOptions({ question, selectedIndex, isAnswered, onAnswer }: { question: SeigoCombinationQuestion } & Omit<Props, "question">) {
  const labels = question.statements.map((s) => s.label);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center pl-10 gap-0">
        {labels.map((label) => (
          <span key={label} className="w-10 text-center text-[10px] font-bold text-primary-500 tracking-[0.15em]">
            {label}
          </span>
        ))}
      </div>
      {question.seigo_options.map((combo, i) => (
        <motion.button
          key={i}
          className={`${optionClass(i, question.correctIndex, selectedIndex, isAnswered)} flex items-center`}
          onClick={() => onAnswer(i)}
          disabled={isAnswered}
          whileTap={!isAnswered ? { scale: 0.98 } : {}}
        >
          <span className="font-bold text-primary-500 w-8 shrink-0 text-sm">{i + 1}.</span>
          <div className="flex">
            {combo.map((isCorrect, j) => (
              <span
                key={j}
                className={`w-10 text-center text-sm font-bold ${
                  isAnswered && i === question.correctIndex
                    ? isCorrect ? "text-emerald-700" : "text-rose-600"
                    : "text-mocha-700"
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

function CorrectCombinationOptions({ question, selectedIndex, isAnswered, onAnswer }: { question: CorrectCombinationQuestion } & Omit<Props, "question">) {
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
          <span className="font-bold text-primary-500 mr-3 text-sm">{i + 1}.</span>
          <span className="font-bold tracking-wide">{pair.join("・")}</span>
        </motion.button>
      ))}
    </div>
  );
}

function WordCombinationOptions({ question, selectedIndex, isAnswered, onAnswer }: { question: WordCombinationQuestion } & Omit<Props, "question">) {
  return (
    <div className="flex flex-col gap-2">
      {/* 語句の列見出し（ａ ｂ ｃ …） */}
      <div className="flex items-center pl-8 gap-2">
        {question.word_headers.map((h) => (
          <span key={h} className="flex-1 text-center text-[10px] font-bold text-primary-500 tracking-[0.15em]">
            {h}
          </span>
        ))}
      </div>
      {question.word_options.map((words, i) => (
        <motion.button
          key={i}
          className={`${optionClass(i, question.correctIndex, selectedIndex, isAnswered)} flex items-center gap-2`}
          onClick={() => onAnswer(i)}
          disabled={isAnswered}
          whileTap={!isAnswered ? { scale: 0.98 } : {}}
        >
          <span className="font-bold text-primary-500 w-6 shrink-0 text-sm">{i + 1}.</span>
          {words.map((w, j) => (
            <span key={j} className="flex-1 text-center text-[13px] leading-snug break-words">
              {w}
            </span>
          ))}
        </motion.button>
      ))}
    </div>
  );
}

function PassageBlock({ passage }: { passage: string }) {
  return (
    <div className="rounded-2xl p-3.5 border border-cream-200 bg-cream-50/70 text-sm text-mocha-700 leading-relaxed">
      {passage}
    </div>
  );
}

function StatementsList({ statements }: { statements: { label: string; text: string }[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl p-3.5 border border-cream-200 bg-cream-50/70">
      {statements.map((s) => (
        <div key={s.label} className="flex gap-2.5 text-sm text-mocha-700 leading-relaxed">
          <span className="font-bold text-primary-600 shrink-0">{s.label}</span>
          <span>{s.text}</span>
        </div>
      ))}
    </div>
  );
}

export default function QuizCard({ question, selectedIndex, isAnswered, onAnswer }: Props) {
  const qType = question.type ?? "simple_select";

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 24, rotateX: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      style={{ perspective: 800, transformStyle: "preserve-3d" }}
      className="card flex flex-col gap-3 !p-4"
    >
      {/* メタ情報 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge badge-cream">
          {question.category}
        </span>
        <span className="text-[10px] text-primary-500 tracking-widest">
          {"★".repeat(question.difficulty)}{"☆".repeat(3 - question.difficulty)}
        </span>
        {qType !== "simple_select" && (
          <span className="badge badge-gold">
            {qType === "seigo_combination" ? "正誤判定"
              : qType === "word_combination" ? "穴埋め" : "組み合わせ"}
          </span>
        )}
      </div>

      {/* 問題文 */}
      <p className="text-[15px] font-medium leading-relaxed text-mocha-800">
        {question.text}
      </p>

      {(qType === "seigo_combination" || qType === "correct_combination") && (
        <StatementsList statements={(question as SeigoCombinationQuestion | CorrectCombinationQuestion).statements} />
      )}
      {qType === "word_combination" && (question as WordCombinationQuestion).passage && (
        <PassageBlock passage={(question as WordCombinationQuestion).passage} />
      )}

      {qType === "simple_select" && (
        <SimpleSelectOptions question={question as SimpleSelectQuestion} selectedIndex={selectedIndex} isAnswered={isAnswered} onAnswer={onAnswer} />
      )}
      {qType === "seigo_combination" && (
        <SeigoCombinationOptions question={question as SeigoCombinationQuestion} selectedIndex={selectedIndex} isAnswered={isAnswered} onAnswer={onAnswer} />
      )}
      {qType === "correct_combination" && (
        <CorrectCombinationOptions question={question as CorrectCombinationQuestion} selectedIndex={selectedIndex} isAnswered={isAnswered} onAnswer={onAnswer} />
      )}
      {qType === "word_combination" && (
        <WordCombinationOptions question={question as WordCombinationQuestion} selectedIndex={selectedIndex} isAnswered={isAnswered} onAnswer={onAnswer} />
      )}
    </motion.div>
  );
}
