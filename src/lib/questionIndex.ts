/**
 * 学習記録を集計するための問題インデックス
 *
 * 出題プールを入れ替えると、プールから外れた問題の学習記録は
 * 「どの章の記録か」が分からなくなり、章別正答率から丸ごと抜け落ちる。
 * 達成度の数字が入れ替えのたびに動かないよう、外した問題の章と問題文を
 * retired_index.json に残しておき、集計時だけここから引く。
 * （retired の問題は ALL_QUESTIONS に入らないので出題はされない）
 */

import type { QuestionCategory } from "@/types";
import { QUESTION_BY_ID } from "@/data/questions";
import retiredIndex from "@/data/questions/retired_index.json";

export type QuestionSummary = {
  category: QuestionCategory;
  text: string;
  /** 現在の出題プールに含まれているか */
  active: boolean;
};

// JSONは [章名, 問題文] の2要素配列だが、TSは string[] と推論するため読み替える
const RETIRED = retiredIndex as unknown as Record<string, [string, string]>;

/** 問題IDから章と問題文を引く。現行プール優先、無ければ引退インデックスを見る。 */
export function getQuestionSummary(id: string): QuestionSummary | null {
  const active = QUESTION_BY_ID[id];
  if (active) {
    return { category: active.category, text: active.text, active: true };
  }
  const retired = RETIRED[id];
  if (retired) {
    return { category: retired[0] as QuestionCategory, text: retired[1], active: false };
  }
  return null;
}

/** 問題IDから章を引く（不明なら null） */
export function getCategoryOf(id: string): QuestionCategory | null {
  return getQuestionSummary(id)?.category ?? null;
}
