"use client";

import { motion } from "framer-motion";
import type { CharacterStatus } from "@/types";
import MaryCharacter from "./MaryCharacter";
import BeanCharacter from "./BeanCharacter";

interface Props {
  character: CharacterStatus;
}

// ステージごとの絵文字（後でカスタムイラストに置き換え予定）
// Stage5 はメアリー（イラスト差し替え時は /public/mary.png を用意して <img> に変更）
const STAGE_EMOJI: Record<number, string> = {
  1: "🫘",
  2: "🌱",
  3: "🌸",
  4: "🥔",
  5: "👧",
};

const STAGE_DESC: Record<number, string> = {
  1: "豆から始まる旅",
  2: "少しずつ芽が出てきた",
  3: "きれいな花が咲いてきた✨",
  4: "合格ライン目前…なぜかさといもに",
  5: "合格安定！メアリーに変身🌸",
};

// ステージごとの経験値バーの色
const STAGE_COLOR: Record<number, string> = {
  1: "from-green-300 to-green-500",
  2: "from-lime-300 to-green-400",
  3: "from-pink-300 to-rose-400",
  4: "from-yellow-400 to-amber-500",
  5: "from-purple-400 to-fuchsia-500",
};

export default function CharacterDisplay({ character }: Props) {
  const emoji = STAGE_EMOJI[character.stage] ?? "🫘";
  const desc = STAGE_DESC[character.stage] ?? "";
  const barColor = STAGE_COLOR[character.stage] ?? "from-primary-400 to-primary-600";
  const isMax = character.stage >= 5;
  const expProgress =
    isMax ? 1
    : character.nextLevelExp > 0
      ? Math.min(character.experience / character.nextLevelExp, 1)
      : 1;

  return (
    <div className="flex items-center gap-4">
      {/* キャラクター */}
      <motion.div
        key={character.stage}
        className="select-none flex items-center justify-center"
        style={{ width: 72, height: 72 }}
        initial={{ scale: 0.7, rotate: -10 }}
        animate={
          character.stage === 4
            ? { y: [0, -3, 0], rotate: [0, 2, -2, 0] }
            : character.stage === 5
            ? { y: [0, -5, 0], scale: [1, 1.04, 1] }
            : { y: [0, -4, 0] }
        }
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        {character.stage === 5 ? (
          <MaryCharacter size={72} />
        ) : character.stage === 1 ? (
          <BeanCharacter size={72} />
        ) : (
          <span className="text-6xl">{emoji}</span>
        )}
      </motion.div>

      {/* ステータス */}
      <div className="flex-1">
        <p className="font-bold text-gray-800">{character.name}</p>
        <p className="text-xs text-gray-500 mb-1">{desc}</p>
        <p className="text-xs text-gray-400 mb-2">
          Lv.{character.stage} / EXP: {character.experience}
        </p>

        {/* 経験値バー */}
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${barColor} rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${expProgress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">
          {isMax ? "MAX" : `${character.experience} / ${character.nextLevelExp} EXP`}
        </p>
      </div>
    </div>
  );
}
