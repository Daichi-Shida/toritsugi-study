import type {
  Question,
  SimpleSelectQuestion,
  SeigoCombinationQuestion,
  CorrectCombinationQuestion,
} from "@/types";

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 1問の選択肢順序をランダム化する。問題ID・解説・問題文は維持し、
 * options/seigo_options/combo_options のみ並び替えて correctIndex を再計算する。
 */
export function shuffleQuestion(q: Question): Question {
  const qType = q.type ?? "simple_select";

  if (qType === "simple_select") {
    const sq = q as SimpleSelectQuestion;
    const order = shuffleIndices(sq.options.length);
    const newOptions = order.map((i) => sq.options[i]);
    const newCorrect = order.indexOf(sq.correctIndex);
    return { ...sq, options: newOptions, correctIndex: newCorrect };
  }

  if (qType === "seigo_combination") {
    const sq = q as SeigoCombinationQuestion;
    const order = shuffleIndices(sq.seigo_options.length);
    const newOpts = order.map((i) => sq.seigo_options[i]);
    const newCorrect = order.indexOf(sq.correctIndex);
    return { ...sq, seigo_options: newOpts, correctIndex: newCorrect };
  }

  if (qType === "correct_combination") {
    const sq = q as CorrectCombinationQuestion;
    const order = shuffleIndices(sq.combo_options.length);
    const newOpts = order.map((i) => sq.combo_options[i]);
    const newCorrect = order.indexOf(sq.correctIndex);
    return { ...sq, combo_options: newOpts, correctIndex: newCorrect };
  }

  return q;
}

export function shuffleQuestions(qs: Question[]): Question[] {
  return qs.map(shuffleQuestion);
}
