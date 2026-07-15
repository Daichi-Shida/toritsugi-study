import type { Question } from "@/types";
// ===== 問題プール（2026-07 全面刷新・全国ブロック拡充）=====
// 本試験の実過去問（正誤組み合わせ形式）を主力に消去法が効きにくい構成へ一新。
// 登録販売者試験はブロック単位で共通問題のため、問題文の重複を避けるべく
// 「ブロックごとに1県」を選び全国6ブロックを収録（令和6年度中心・南関東は4〜6年度）。
//   南関東=東京 / 北海道・東北=北海道 / 北関東・甲信越=茨城 /
//   東海・北陸=愛知 / 関西広域連合 / 九州・沖縄=福岡
// ブロック間の同一設問は生成時に重複除外済み。令和8年5月の薬機法改正は
// r8_revision / r8_deep で現行法を補強し、旧枠組みの過去問は生成時に除外済み。
import kakomonR6Tokyo from "./kakomon_r6_tokyo.json";
import kakomonR5Tokyo from "./kakomon_r5_tokyo.json";
import kakomonR4Tokyo from "./kakomon_r4_tokyo.json";
import kakomonR6Hokkaidou from "./kakomon_r6_hokkaidou.json";
import kakomonR6Ibaraki from "./kakomon_r6_ibaraki.json";
import kakomonR6Aiti from "./kakomon_r6_aiti.json";
import kakomonR6Kansai from "./kakomon_r6_kansai.json";
import kakomonR6Hukuoka from "./kakomon_r6_hukuoka.json";
import r8RevisionQuestions from "./r8_revision_questions.json";
import r8DeepQuestions from "./r8_deep_questions.json";

export const ALL_QUESTIONS: Question[] = [
  ...kakomonR6Tokyo,
  ...kakomonR5Tokyo,
  ...kakomonR4Tokyo,
  ...kakomonR6Hokkaidou,
  ...kakomonR6Ibaraki,
  ...kakomonR6Aiti,
  ...kakomonR6Kansai,
  ...kakomonR6Hukuoka,
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
