import type { Question } from "@/types";
// ===== 問題プール（2026-08 入れ替え・令和7年度＋手引き令和8年4月改訂対応）=====
// 本試験の実過去問（正誤組み合わせ形式）が主力。登録販売者試験はブロック単位で
// 共通問題のため、問題文の重複を避けるべく「ブロックごとに1県」を選んでいる。
//   首都圏（南関東＝東京都）は令和3〜7年度の5年分、
//   ほかは令和7年度で全ブロック：
//     北海道・東北=北海道 / 北関東・甲信越=茨城 / 東海・北陸=愛知 /
//     関西広域連合 / 中国・四国=広島 / 九州・沖縄=福岡
//   （奈良県ブロックのみ令和7年度の出典が未公開のため未収録）
// 「試験問題の作成に関する手引き（令和8年4月一部改訂）」で制度が変わった論点は、
// 改訂前の過去問を生成時に除外したうえで r8_tebiki_questions が現行制度を扱う。
import kakomonR7Tokyo from "./kakomon_r7_tokyo.json";
import kakomonR6Tokyo from "./kakomon_r6_tokyo.json";
import kakomonR5Tokyo from "./kakomon_r5_tokyo.json";
import kakomonR4Tokyo from "./kakomon_r4_tokyo.json";
import kakomonR3Tokyo from "./kakomon_r3_tokyo.json";
import kakomonR7Hokkaidou from "./kakomon_r7_hokkaidou.json";
import kakomonR7Ibaraki from "./kakomon_r7_ibaraki.json";
import kakomonR7Aiti from "./kakomon_r7_aiti.json";
import kakomonR7Kansai from "./kakomon_r7_kansai.json";
import kakomonR7Hirosima from "./kakomon_r7_hirosima.json";
import kakomonR7Hukuoka from "./kakomon_r7_hukuoka.json";
import r8TebikiQuestions from "./r8_tebiki_questions.json";

export const ALL_QUESTIONS: Question[] = [
  ...kakomonR7Tokyo,
  ...kakomonR6Tokyo,
  ...kakomonR5Tokyo,
  ...kakomonR4Tokyo,
  ...kakomonR3Tokyo,
  ...kakomonR7Hokkaidou,
  ...kakomonR7Ibaraki,
  ...kakomonR7Aiti,
  ...kakomonR7Kansai,
  ...kakomonR7Hirosima,
  ...kakomonR7Hukuoka,
  ...r8TebikiQuestions,
] as Question[];

export const QUESTION_BY_ID: Record<string, Question> = ALL_QUESTIONS.reduce(
  (acc, q) => {
    acc[q.id] = q;
    return acc;
  },
  {} as Record<string, Question>
);
