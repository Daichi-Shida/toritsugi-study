"use client";

import type {
  Question,
  SimpleSelectQuestion,
  SeigoCombinationQuestion,
  CorrectCombinationQuestion,
  WordCombinationQuestion,
} from "@/types";
import { CATEGORY_CHAPTER } from "@/types";

interface Props {
  question: Question;
  /** 試験での問題番号（1始まり） */
  number: number;
  /** 選んだ選択肢。未回答は null */
  selectedIndex: number | null;
}

/**
 * 選択肢を1行のテキストにする。
 * 正誤組み合わせ型は「ａ 正　ｂ 誤 …」の形にして、解説の「ａ（正）…」と
 * 突き合わせられるようにする。
 */
function optionLines(question: Question): string[] {
  const qType = question.type ?? "simple_select";

  if (qType === "seigo_combination") {
    const q = question as SeigoCombinationQuestion;
    return q.seigo_options.map((combo) =>
      q.statements.map((s, i) => `${s.label} ${combo[i] ? "正" : "誤"}`).join("　")
    );
  }
  if (qType === "correct_combination") {
    return (question as CorrectCombinationQuestion).combo_options.map((pair) => pair.join("・"));
  }
  if (qType === "word_combination") {
    const q = question as WordCombinationQuestion;
    return q.word_options.map((words) =>
      words.map((w, i) => `${q.word_headers[i]} ${w}`).join("　")
    );
  }
  return (question as SimpleSelectQuestion).options;
}

/** 模擬試験の結果画面で、問題文・選択肢・解説をまとめて見返すためのカード */
export default function QuestionReview({ question, number, selectedIndex }: Props) {
  const isCorrect = selectedIndex === question.correctIndex;
  const isUnanswered = selectedIndex === null;
  const statements =
    question.type === "seigo_combination" || question.type === "correct_combination"
      ? (question as SeigoCombinationQuestion | CorrectCombinationQuestion).statements
      : null;
  const passage = question.type === "word_combination" ? (question as WordCombinationQuestion).passage : null;

  return (
    <div className="rounded-2xl border border-cream-200 bg-white/60 p-3.5">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="badge badge-cream">{CATEGORY_CHAPTER[question.category]}</span>
        <span className="text-[10px] text-mocha-400 tracking-wide tabular-nums">問{number}</span>
        <span
          className={`ml-auto text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full border ${
            isUnanswered
              ? "text-mocha-500 border-cream-200 bg-cream-50"
              : isCorrect
              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
              : "text-rose-600 border-rose-200 bg-rose-50"
          }`}
        >
          {isUnanswered ? "未回答" : isCorrect ? "正解" : "不正解"}
        </span>
      </div>

      {/* 問題文 */}
      <p className="text-sm font-medium text-mocha-800 leading-relaxed mb-2.5">{question.text}</p>

      {/* ア・イ・ウ・エ の文章（解説はここを指しているので必ず出す） */}
      {statements && (
        <div className="flex flex-col gap-1.5 rounded-2xl p-3 mb-2.5 border border-cream-200 bg-cream-50/70">
          {statements.map((s) => (
            <div key={s.label} className="flex gap-2 text-[13px] text-mocha-700 leading-relaxed">
              <span className="font-bold text-primary-600 shrink-0">{s.label}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* 穴埋め型の本文 */}
      {passage && (
        <div className="rounded-2xl p-3 mb-2.5 border border-cream-200 bg-cream-50/70 text-[13px] text-mocha-700 leading-relaxed">
          {passage}
        </div>
      )}

      {/* 選択肢（正解と自分の答えに印をつける） */}
      <div className="flex flex-col gap-1.5 mb-2.5">
        {optionLines(question).map((line, i) => {
          const isAnswer = i === question.correctIndex;
          const isMine = i === selectedIndex;
          return (
            <div
              key={i}
              className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed border ${
                isAnswer
                  ? "border-emerald-300 bg-emerald-50/80 text-emerald-900"
                  : isMine
                  ? "border-rose-300 bg-rose-50/80 text-rose-900"
                  : "border-cream-200 bg-white/50 text-mocha-600"
              }`}
            >
              <span className="font-bold mr-1.5">{i + 1}.</span>
              <span className="whitespace-pre-wrap">{line}</span>
              {(isAnswer || isMine) && (
                <span
                  className={`ml-2 text-[10px] font-bold tracking-wide ${
                    isAnswer ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {isAnswer && isMine ? "◎ 正解・あなたの答え" : isAnswer ? "◎ 正解" : "← あなたの答え"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {isUnanswered && (
        <p className="text-[11px] text-mocha-500 mb-2">この問題は回答していません</p>
      )}

      {/* 解説 */}
      <div className="rounded-2xl bg-cream-50/80 border border-cream-200 p-3">
        <p className="text-[10px] font-bold tracking-[0.2em] text-mocha-500 mb-1.5 uppercase">解説</p>
        <p className="text-[12px] text-mocha-700 leading-relaxed whitespace-pre-line">{question.explanation}</p>
      </div>
    </div>
  );
}
