"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Question, SeigoCombinationQuestion, CharacterStage } from "@/types";
import BeanCharacter from "@/components/character/BeanCharacter";
import MaryCharacter from "@/components/character/MaryCharacter";
import AdultMaryCharacter from "@/components/character/AdultMaryCharacter";
import SamuraiCharacter from "@/components/character/SamuraiCharacter";

interface Props {
  show: boolean;
  question: Question;
  selectedIndex: number;
  onNext: () => void;
  isLast: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  /** 現在のキャラステージ（キャラ画像と吹き出しトーンに反映） */
  characterStage: CharacterStage;
}

const STAGE_EMOJI: Record<number, string> = {
  1: "🫘", 2: "🌱", 3: "🌸", 4: "🥔", 5: "👧", 6: "🕵️‍♀️", 7: "🗡️",
};

function CharacterAvatar({ stage, isCorrect }: { stage: CharacterStage; isCorrect: boolean }) {
  // キャラ反応：正解→嬉しそうにジャンプ、不正解→おじぎ風に上下
  const animation = isCorrect
    ? { y: [0, -10, 0, -6, 0], rotate: [0, -6, 6, -3, 0] }
    : { y: [0, 4, 0], rotate: [0, -3, 3, 0] };

  const inner = (
    <motion.div
      animate={animation}
      transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.4 }}
      style={{ transformOrigin: "50% 80%" }}
    >
      {stage === 7 ? <SamuraiCharacter size={64} /> :
       stage === 6 ? <AdultMaryCharacter size={64} /> :
       stage === 5 ? <MaryCharacter size={64} /> :
       stage === 1 ? <BeanCharacter size={64} /> :
       <span className="text-5xl leading-none">{STAGE_EMOJI[stage]}</span>}
    </motion.div>
  );
  return inner;
}

function speech(isCorrect: boolean, stage: CharacterStage): string {
  if (isCorrect) {
    if (stage === 7) return "見事なり！";
    if (stage === 6) return "Excellent.";
    if (stage === 5) return "やったー！";
    if (stage === 4) return "ねっとり正解🥔";
    if (stage === 3) return "きれいに咲いた🌸";
    if (stage === 2) return "すくすく！🌱";
    return "やった〜！";
  } else {
    if (stage === 7) return "次なる稽古を…";
    if (stage === 6) return "Don't worry.";
    if (stage === 5) return "次があるよ！";
    if (stage === 4) return "もう一度…🥔";
    if (stage === 3) return "あと少し！";
    if (stage === 2) return "がんばって！";
    return "ドンマイ！";
  }
}

export default function ResultSheet({ show, question, selectedIndex, onNext, isLast, isBookmarked, onToggleBookmark, characterStage }: Props) {
  const isCorrect = selectedIndex === question.correctIndex;
  const qType = question.type ?? "simple_select";
  const msg = speech(isCorrect, characterStage);

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* バックドロップ：解説シート背後を少し暗く */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-30 bg-mocha-900/15 backdrop-blur-[2px] pointer-events-none"
          />

          {/* シート本体 */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md z-40 flex flex-col"
            style={{ maxHeight: "calc(100dvh - 64px)" }}
          >
            <div
              className="rounded-t-3xl backdrop-blur-2xl border-t border-x border-white/70 shadow-glass overflow-hidden flex flex-col"
              style={{
                background: isCorrect
                  ? "linear-gradient(180deg, rgba(232, 247, 220, 0.92) 0%, rgba(255, 252, 246, 0.95) 18%, rgba(255, 252, 246, 0.97) 100%)"
                  : "linear-gradient(180deg, rgba(255, 224, 220, 0.92) 0%, rgba(255, 252, 246, 0.95) 18%, rgba(255, 252, 246, 0.97) 100%)",
              }}
            >
              {/* グラブハンドル */}
              <div className="flex justify-center pt-2 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-mocha-300/60" />
              </div>

              {/* ヘッダー：キャラ + 吹き出し */}
              <div className="px-5 pt-1 pb-3 flex items-end gap-3 shrink-0">
                {/* キャラ */}
                <motion.div
                  initial={{ x: -80, scale: 0.6, opacity: 0, rotate: -25 }}
                  animate={{ x: 0, scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.05 }}
                  className="shrink-0"
                  style={{ width: 64, height: 64 }}
                >
                  <CharacterAvatar stage={characterStage} isCorrect={isCorrect} />
                </motion.div>

                {/* 吹き出し */}
                <motion.div
                  initial={{ x: -10, opacity: 0, scale: 0.85 }}
                  animate={{ x: 0, opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, type: "spring", stiffness: 220, damping: 18 }}
                  className="relative flex-1 mb-1"
                >
                  <div
                    className={`relative rounded-2xl px-4 py-2 inline-block max-w-full font-bold ${
                      isCorrect
                        ? "bg-gradient-to-br from-emerald-50 to-green-100 border-2 border-emerald-300 text-emerald-800"
                        : "bg-gradient-to-br from-rose-50 to-rose-100 border-2 border-rose-300 text-rose-700"
                    }`}
                  >
                    <span className="text-base tracking-wide">{isCorrect ? "✦ 正解！" : "もう一歩…"}</span>
                    <span className="block text-xs font-medium mt-0.5 tracking-wide opacity-80">{msg}</span>
                    {/* 吹き出しのしっぽ */}
                    <span
                      className={`absolute -left-2 bottom-3 w-3 h-3 ${
                        isCorrect ? "bg-emerald-50 border-emerald-300" : "bg-rose-50 border-rose-300"
                      } border-l-2 border-b-2 rotate-45`}
                    />
                  </div>
                </motion.div>
              </div>

              {/* スクロール可能領域：解説 */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 scrollbar-thin">
                {/* 正誤組み合わせ型の場合のみ表示 */}
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

                {/* 解説 */}
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

              {/* 固定フッター：ボタン */}
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
