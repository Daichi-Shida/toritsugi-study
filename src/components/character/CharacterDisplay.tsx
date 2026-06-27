"use client";

import { motion } from "framer-motion";
import type { CharacterStatus } from "@/types";
import MaryCharacter from "./MaryCharacter";
import BeanCharacter from "./BeanCharacter";
import AdultMaryCharacter from "./AdultMaryCharacter";
import SamuraiCharacter from "./SamuraiCharacter";
import GoldenBeanSamuraiCharacter from "./GoldenBeanSamuraiCharacter";
import CatCharacter from "./CatCharacter";

interface Props {
  character: CharacterStatus;
}

const STAGE_EMOJI: Record<number, string> = {
  1: "🫘",
  2: "🌱",
  3: "🌸",
  4: "🥔",
  5: "👧",
  6: "🕵️‍♀️",
  7: "🗡️",
  8: "🫛",
  9: "🐱",
};

const STAGE_DESC: Record<number, string> = {
  1: "豆から始まる旅",
  2: "少しずつ芽が出てきた",
  3: "きれいな花が咲いてきた✨",
  4: "合格ライン目前…なぜかさといもに",
  5: "合格安定！メアリーに変身🌸",
  6: "HOPE",
  7: "はらぺこ、、、",
  8: "金色に輝く豆の侍✨",
  9: "にゃ〜ん🐾",
};

const STAGE_COLOR: Record<number, string> = {
  1: "from-green-300 to-emerald-500",
  2: "from-lime-300 to-green-400",
  3: "from-rose-200 to-rose-400",
  4: "from-primary-300 to-primary-500",
  5: "from-primary-300 via-primary-400 to-primary-600",
  6: "from-amber-200 via-primary-300 to-primary-500",
  7: "from-mocha-400 via-primary-500 to-mocha-700",
  8: "from-yellow-300 via-amber-400 to-yellow-600",
  9: "from-pink-300 via-rose-300 to-amber-300",
};

// レアキャラ（Lv6以上）にだけ重ねるキラキラ演出
function SparkleOverlay({ tone }: { tone: "gold" | "rainbow" | "pink" }) {
  const colors =
    tone === "gold"
      ? ["#ffe97a", "#fff5b8", "#ffd24a"]
      : tone === "pink"
        ? ["#fbcfe8", "#fda4af", "#fde68a"]
        : ["#a78bfa", "#f0abfc", "#fde68a"];
  const stars = [
    { x: 8, y: 12, size: 4, delay: 0 },
    { x: 60, y: 6, size: 3, delay: 0.4 },
    { x: 4, y: 50, size: 3, delay: 0.8 },
    { x: 64, y: 56, size: 4, delay: 1.2 },
    { x: 40, y: 2, size: 2.5, delay: 1.6 },
    { x: 20, y: 64, size: 2.5, delay: 2.0 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            color: colors[i % colors.length],
            fontSize: `${s.size + 6}px`,
            textShadow: `0 0 6px ${colors[i % colors.length]}`,
          }}
          initial={{ opacity: 0, scale: 0.5, rotate: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.4, 1.2, 0.4],
            rotate: [0, 90, 180],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        >
          ✦
        </motion.span>
      ))}
    </div>
  );
}

export default function CharacterDisplay({ character }: Props) {
  const emoji = STAGE_EMOJI[character.stage] ?? "🫘";
  const desc = STAGE_DESC[character.stage] ?? "";
  const barColor = STAGE_COLOR[character.stage] ?? "from-primary-400 to-primary-600";
  const isMax = character.stage >= 9;
  const expProgress =
    isMax ? 1
    : character.nextLevelExp > 0
      ? Math.min(character.experience / character.nextLevelExp, 1)
      : 1;

  const isRare = character.stage >= 6;
  const sparkleTone: "gold" | "rainbow" | "pink" =
    character.stage === 6 || character.stage === 8
      ? "gold"
      : character.stage === 9
        ? "pink"
        : "rainbow";

  // ステージ別のレアフレーム背景
  const rareBgClass =
    character.stage === 6 || character.stage === 8
      ? "bg-gradient-to-br from-amber-50 via-yellow-50 to-white"
      : character.stage === 9
        ? "bg-gradient-to-br from-rose-50 via-pink-50 to-white"
        : character.stage === 7
          ? "bg-gradient-to-br from-indigo-50 via-fuchsia-50 to-white"
          : "";

  return (
    <div className="flex items-center gap-4">
      {/* キャラクター */}
      <div
        className={`relative shrink-0 rounded-2xl ${isRare ? "p-2 ring-2 ring-offset-2 " + (character.stage === 6 || character.stage === 8 ? "ring-amber-300 ring-offset-amber-50" : character.stage === 9 ? "ring-rose-300 ring-offset-rose-50" : "ring-fuchsia-300 ring-offset-fuchsia-50") + " " + rareBgClass : ""}`}
        style={{ width: isRare ? 88 : 72, height: isRare ? 88 : 72 }}
      >
        <motion.div
          key={character.stage}
          className="select-none flex items-center justify-center w-full h-full"
          initial={{ scale: 0.7, rotate: -10 }}
          animate={
            character.stage === 4
              ? { y: [0, -3, 0], rotate: [0, 2, -2, 0] }
              : character.stage === 5
              ? { y: [0, -5, 0], scale: [1, 1.04, 1] }
              : character.stage === 6
              ? { y: [0, -4, 0], rotate: [0, 1, -1, 0] }
              : character.stage === 7
              ? { y: [0, -5, 0], scale: [1, 1.05, 1], rotate: [0, 1.5, -1.5, 0] }
              : character.stage === 8
              ? { y: [0, -6, 0], scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] }
              : character.stage === 9
              ? { y: [0, -5, 0], rotate: [0, -3, 3, 0] }
              : { y: [0, -4, 0] }
          }
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          {character.stage === 9 ? (
            <CatCharacter size={72} />
          ) : character.stage === 8 ? (
            <GoldenBeanSamuraiCharacter size={72} />
          ) : character.stage === 7 ? (
            <SamuraiCharacter size={72} />
          ) : character.stage === 6 ? (
            <AdultMaryCharacter size={72} />
          ) : character.stage === 5 ? (
            <MaryCharacter size={72} />
          ) : character.stage === 1 ? (
            <BeanCharacter size={72} />
          ) : (
            <span className="text-6xl">{emoji}</span>
          )}
        </motion.div>
        {isRare && <SparkleOverlay tone={sparkleTone} />}
        {isRare && (
          <span
            className={`absolute -top-1 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm ${
              character.stage === 6 || character.stage === 8
                ? "bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-900"
                : character.stage === 9
                  ? "bg-gradient-to-r from-rose-400 to-pink-300 text-rose-900"
                  : "bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white"
            }`}
          >
            ★RARE
          </span>
        )}
      </div>

      {/* ステータス */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <p className="headline font-bold text-mocha-800 text-base truncate">{character.name}</p>
          <span className="text-[10px] tracking-[0.18em] text-mocha-400 uppercase shrink-0">
            Lv.{character.stage}
          </span>
        </div>
        <p className={`text-xs mb-2 ${isRare ? "font-bold tracking-[0.15em] " + (character.stage === 6 ? "text-primary-700" : "text-mocha-700") : "text-mocha-500"}`}>
          {desc}
        </p>

        {/* 経験値バー */}
        <div className="relative h-2.5 rounded-full overflow-hidden bg-cream-100/80 border border-cream-200">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${expProgress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-[10px] text-mocha-400 mt-1 text-right tracking-wide">
          {isMax ? "MAX" : `${character.experience} / ${character.nextLevelExp} EXP`}
        </p>
      </div>
    </div>
  );
}
