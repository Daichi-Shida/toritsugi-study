"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Question, SeigoCombinationQuestion, CharacterStage } from "@/types";
import BeanCharacter from "@/components/character/BeanCharacter";
import MaryCharacter from "@/components/character/MaryCharacter";
import AdultMaryCharacter from "@/components/character/AdultMaryCharacter";
import SamuraiCharacter from "@/components/character/SamuraiCharacter";
import GoldenBeanSamuraiCharacter from "@/components/character/GoldenBeanSamuraiCharacter";
import CatCharacter from "@/components/character/CatCharacter";

interface Props {
  show: boolean;
  question: Question;
  selectedIndex: number;
  onNext: () => void;
  onClose?: () => void;
  isLast: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  characterStage: CharacterStage;
}

const STAGE_EMOJI: Record<number, string> = {
  1: "🫘", 2: "🌱", 3: "🌸", 4: "🥔", 5: "👧", 6: "🕵️‍♀️", 7: "🗡️", 8: "🫛", 9: "🐱",
};

// ───── 動きパターン（共通・各5種類） ─────
type MoveSpec = {
  y?: number[];
  x?: number[];
  rotate?: number[];
  scale?: number[];
  duration: number;
};

const CORRECT_MOVES: MoveSpec[] = [
  // 1. 大ジャンプ＋微回転
  { y: [0, -28, 0, -14, 0], rotate: [0, -8, 8, -4, 0], duration: 1.4 },
  // 2. ぐるりと一回転
  { y: [0, -10, 0], rotate: [0, 360], duration: 1.2 },
  // 3. ぴょこぴょこ多段
  { y: [0, -10, 0, -8, 0, -6, 0], duration: 1.4 },
  // 4. 拡大しながら浮上
  { y: [0, -16, 0], scale: [1, 1.15, 1], duration: 1.2 },
  // 5. 横揺れ歓喜
  { x: [0, -8, 8, -6, 6, 0], y: [0, -8, 0, -4, 0], rotate: [0, -6, 6, -3, 0], duration: 1.4 },
];

const WRONG_MOVES: MoveSpec[] = [
  // 1. 横揺れ（ぶるぶる）
  { x: [0, -10, 10, -8, 8, -4, 0], duration: 0.8 },
  // 2. 沈み込み
  { y: [0, 6, 4, 8, 4], scale: [1, 0.95, 0.92, 0.95, 0.95], duration: 1.2 },
  // 3. お辞儀
  { rotate: [0, -25, -15, -25, -10], y: [0, 4, 2, 4, 2], duration: 1.2 },
  // 4. 縮こまる
  { scale: [1, 0.85, 0.92, 0.85, 0.9], y: [0, 4, 2, 4, 4], duration: 1.2 },
  // 5. ふらふら倒れ風
  { rotate: [0, -15, 15, -10, 10, -5, 0], duration: 1.0 },
];

// ───── ステージ別セリフ（各5種類×2） ─────
const LINES: Record<CharacterStage, { correct: string[]; wrong: string[] }> = {
  1: {
    correct: ["ぷりぷり！", "やったね〜豆", "豆まき気分🫘", "すくすく〜！", "豆パワー全開！"],
    wrong:   ["ふんが〜...", "豆っちゃった", "お水ちょうだい...", "にがい...", "うぅ〜"],
  },
  2: {
    correct: ["光合成〜！", "つるん！", "葉っぱピーン", "ぐんぐん伸びる", "新緑きらめく✨"],
    wrong:   ["萎れちゃう...", "お水ちょうだい", "元気ない...", "うぅ...", "がんばる..."],
  },
  3: {
    correct: ["ふわっ✨", "きれいに咲いた！", "いい香り〜🌸", "春爛漫", "ひらり"],
    wrong:   ["ぽろり...", "花弁が...", "もう一度咲く", "ちょっと萎れた", "うぅ..."],
  },
  4: {
    correct: ["ねっとり〜", "ほっくほく！", "もちもち", "煮物にして", "さといもパワー"],
    wrong:   ["ぬるん...", "滑った...", "皮むけちゃう", "おいも涙", "ぐにゃり..."],
  },
  5: {
    correct: ["やった〜！", "よくできました！", "さすが✨", "いい感じ！", "一緒にがんばろう"],
    wrong:   ["次があるよ", "ドンマイ", "もう一度！", "大丈夫だよ", "落ち込まないで"],
  },
  6: {
    // 大人メアリー（FBI）：希望／破壊の英単語
    correct: ["HOPE", "FAITH", "VICTORY", "GLORY", "ASCEND"],
    wrong:   ["DESTRUCTION", "DESPAIR", "DARKNESS", "VOID", "RUIN"],
  },
  7: {
    // 侍メアリー：意味不明な語感
    correct: ["うまみ。。", "腹ペコ侍！", "太郎侍参上", "寿司食いたし", "侘び寂び正解"],
    wrong:   ["ねむみ。。。", "かわたい", "闇の刻", "侍ロス", "もぐもぐ虚無"],
  },
  8: {
    // 豆侍：金色に光る豆の侍。変な名前・語感
    correct: ["太郎次郎！", "うまたにえん", "豆太郎、推参", "金豆まいったか", "ぷりぷり斬り", "豆ノ介、正解", "黄金まめ侍"],
    wrong:   ["まめ次郎、無念", "うまたにえん…", "煮豆になる…", "さや落ち侍", "豆ロス候", "金欠まめ侍"],
  },
  9: {
    // ねこさん：最上位レア。にゃー多めの可愛いセリフ
    correct: ["にゃー！", "にゃ♪", "にゃにゃっ✨", "にゃんと正解", "ごろにゃ〜", "みゃ〜お", "にゃはは！", "にゃ、お見事", "ふみゃ♪", "にゃんだふる"],
    wrong:   ["にゃ…ん？", "しょんにょり", "にゃーん…", "みゃう…", "ぷいっ。", "にゃんも…", "ねむにゃい…", "ごめんにゃ"],
  },
};

const HEADER: Record<"correct" | "wrong", Record<CharacterStage, string>> = {
  correct: { 1: "✦ 正解！", 2: "✦ 正解！", 3: "✦ 正解！", 4: "✦ 正解！", 5: "✦ 正解！", 6: "✦ CORRECT", 7: "✦ 見事なり！", 8: "✦ 黄金の正解！", 9: "✦ にゃ正解！" },
  wrong:   { 1: "もう一歩…", 2: "もう一歩…", 3: "もう一歩…", 4: "もう一歩…", 5: "もう一歩…", 6: "INCORRECT", 7: "未熟者…", 8: "豆ながら無念…", 9: "おしいにゃ…" },
};

// ハッシュ関数（question.id + selectedIndex から決定的にランダム選択）
function hashPick(seed: string, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % max;
}

function CharacterAvatar({ stage, move }: { stage: CharacterStage; move: MoveSpec }) {
  const animate: Record<string, number[]> = {};
  if (move.y) animate.y = move.y;
  if (move.x) animate.x = move.x;
  if (move.rotate) animate.rotate = move.rotate;
  if (move.scale) animate.scale = move.scale;

  return (
    <motion.div
      animate={animate}
      transition={{ duration: move.duration, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
      style={{ transformOrigin: "50% 80%" }}
    >
      {stage === 9 ? <CatCharacter size={64} /> :
       stage === 8 ? <GoldenBeanSamuraiCharacter size={64} /> :
       stage === 7 ? <SamuraiCharacter size={64} /> :
       stage === 6 ? <AdultMaryCharacter size={64} /> :
       stage === 5 ? <MaryCharacter size={64} /> :
       stage === 1 ? <BeanCharacter size={64} /> :
       <span className="text-5xl leading-none">{STAGE_EMOJI[stage]}</span>}
    </motion.div>
  );
}

export default function ResultSheet({ show, question, selectedIndex, onNext, onClose, isLast, isBookmarked, onToggleBookmark, characterStage }: Props) {
  const isCorrect = selectedIndex === question.correctIndex;
  const qType = question.type ?? "simple_select";

  // ランダム選択：question.id + selectedIndex でシード
  const seed = `${question.id}_${selectedIndex}`;
  const moveIndex = hashPick(seed, 5);
  const linePool = LINES[characterStage][isCorrect ? "correct" : "wrong"];
  const lineIndex = hashPick(seed + "_line", linePool.length);

  const move = (isCorrect ? CORRECT_MOVES : WRONG_MOVES)[moveIndex];
  const speechLine = linePool[lineIndex];
  const headerText = HEADER[isCorrect ? "correct" : "wrong"][characterStage];

  // 大人メアリー（Lv6）の英単語表現はちょっと大きく見せる
  const isFBI = characterStage === 6;

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            aria-hidden={!onClose}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`fixed inset-0 z-30 bg-mocha-900/15 backdrop-blur-[2px] ${onClose ? "cursor-pointer" : "pointer-events-none"}`}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm rounded-3xl backdrop-blur-2xl border border-white/70 shadow-glass overflow-hidden flex flex-col"
              style={{
                maxHeight: "calc(100dvh - 32px)",
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(232, 247, 220, 0.94) 0%, rgba(255, 252, 246, 0.96) 22%, rgba(255, 252, 246, 0.98) 100%)"
                  : "linear-gradient(180deg, rgba(255, 224, 220, 0.94) 0%, rgba(255, 252, 246, 0.96) 22%, rgba(255, 252, 246, 0.98) 100%)",
              }}
            >
              {onClose && (
                <div className="flex items-center justify-end px-3 pt-2.5 shrink-0">
                  <button
                    onClick={onClose}
                    aria-label="閉じる"
                    className="w-7 h-7 rounded-full bg-white/60 hover:bg-white/90 border border-cream-200 text-mocha-500 hover:text-mocha-800 flex items-center justify-center text-sm font-bold shadow-soft"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* ヘッダー：キャラ + 吹き出し */}
              <div className="px-5 pt-1 pb-3 flex items-end gap-3 shrink-0">
                <motion.div
                  initial={{ x: -80, scale: 0.6, opacity: 0, rotate: -25 }}
                  animate={{ x: 0, scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.05 }}
                  className="shrink-0"
                  style={{ width: 64, height: 64 }}
                >
                  <CharacterAvatar stage={characterStage} move={move} />
                </motion.div>

                <motion.div
                  initial={{ x: -10, opacity: 0, scale: 0.85 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 220, damping: 18 }}
                  className="relative flex-1 mb-1 min-w-0"
                >
                  <div
                    className={`relative rounded-2xl px-4 py-2 inline-block max-w-full font-bold ${
                      isCorrect
                        ? "bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-300 text-emerald-800"
                        : "bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-300 text-rose-700"
                    }`}
                  >
                    <span className="text-base tracking-wide">{headerText}</span>
                    <span
                      className={`block font-bold mt-0.5 break-words ${
                        isFBI ? "text-lg tracking-[0.25em] uppercase" : "text-xs tracking-wide opacity-85"
                      }`}
                    >
                      {speechLine}
                    </span>
                    <span
                      className={`absolute -left-2 bottom-3 w-3 h-3 ${
                        isCorrect ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"
                      } border-l-2 border-b-2 rotate-45`}
                    />
                  </div>
                </motion.div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-3 scrollbar-thin">
                {qType === "seigo_combination" && (() => {
                  const q = question as SeigoCombinationQuestion;
                  const correctCombo = q.seigo_options[q.correctIndex];
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="rounded-2xl p-3 mb-3 border border-cream-200 bg-cream-50/70"
                    >
                      <p className="text-[10px] font-bold tracking-[0.2em] text-mocha-500 mb-2 uppercase">正答の組み合わせ</p>
                      <div className="flex flex-col gap-1">
                        {q.statements.map((s, i) => (
                          <div key={s.label} className="flex items-start gap-2 text-sm">
                            <span className="font-bold text-primary-600 shrink-0">{s.label}</span>
                            <span className={`shrink-0 font-bold ${correctCombo[i] ? "text-emerald-700" : "text-rose-600"}`}>
                              {correctCombo[i] ? "正" : "誤"}
                            </span>
                            <span className="text-mocha-700 leading-relaxed">{s.text}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="rounded-2xl bg-white/60 border border-cream-200 p-3.5"
                >
                  <p className="text-[10px] font-bold tracking-[0.2em] text-mocha-500 mb-1.5 uppercase">解説</p>
                  <p className="text-sm text-mocha-700 leading-relaxed whitespace-pre-line">{question.explanation}</p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="px-5 pt-3 pb-5 flex gap-2 border-t border-cream-200 bg-white/60 shrink-0"
              >
                {onToggleBookmark && (
                  <button
                    onClick={onToggleBookmark}
                    className={`shrink-0 rounded-full px-4 font-bold transition-all active:scale-95 backdrop-blur-md ${
                      isBookmarked
                        ? "bg-gradient-to-br from-primary-100 to-primary-200 border-2 border-primary-400 text-primary-800"
                        : "bg-white/70 border-2 border-cream-200 text-mocha-500 hover:border-primary-300"
                    }`}
                    aria-label={isBookmarked ? "見直しから外す" : "見直しに追加"}
                  >
                    {isBookmarked ? "★" : "☆"}
                  </button>
                )}
                <button onClick={onNext} className="btn-primary flex-1">
                  {isLast ? "結果を見る 🎉" : "次の問題へ →"}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
