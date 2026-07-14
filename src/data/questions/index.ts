import type { Question } from "@/types";
// ===== 問題プール（2026-07 全面刷新）=====
// 本試験（南関東ブロック＝東京都）の実過去問（令和4・5・6年度）を主力に、
// 消去法が効きにくい「正誤組み合わせ」形式へ一新。
// 令和8年5月の薬機法改正（指定濫用防止医薬品・特定要指導医薬品 等）は
// r8_revision / r8_deep で現行法を補強し、旧枠組みの過去問は生成時に除外済み。
import kakomonR6Tokyo from "./kakomon_r6_tokyo.json";
import kakomonR5Tokyo from "./kakomon_r5_tokyo.json";
import kakomonR4Tokyo from "./kakomon_r4_tokyo.json";
import r8RevisionQuestions from "./r8_revision_questions.json";
import r8DeepQuestions from "./r8_deep_questions.json";

export const ALL_QUESTIONS: Question[] = [
  ...kakomonR6Tokyo,
  ...kakomonR5Tokyo,
  ...kakomonR4Tokyo,
  ...r8RevisionQuestions,
  ...r8DeepQuestions,
] as Question[];

export const QUESTION_BY_ID: Record<string, Question> = ALL_QUESTIONS.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, Question>
);
