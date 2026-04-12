"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { CharacterStatus } from "@/types";
import CharacterDisplay from "@/components/character/CharacterDisplay";

interface Props {
  correct: number;
  total: number;
  character: CharacterStatus;
  backHref?: string;
  backLabel?: string;
}

export default function SessionComplete({ correct, total, character, backHref = "/", backLabel = "ホームに戻る" }: Props) {
  const rate = Math.round((correct / total) * 100);
  const message =
    rate === 100 ? "パーフェクト！🎊" :
    rate >= 80  ? "すごい！よく頑張った！" :
    rate >= 60  ? "いい調子！続けよう！" :
    "次はもっとできる！";

  return (
    <div className="flex flex-col gap-5 p-4 pb-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="card text-center"
      >
        <p className="text-4xl mb-2">{rate === 100 ? "🏆" : rate >= 80 ? "⭐️" : "📝"}</p>
        <h2 className="text-xl font-bold text-gray-800 mb-1">セッション完了！</h2>
        <p className="text-gray-500 text-sm mb-4">{message}</p>

        <div className="flex justify-center gap-8 mb-4">
          <div>
            <p className="text-3xl font-bold text-primary-600">{correct}/{total}</p>
            <p className="text-xs text-gray-500">正解数</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-primary-600">{rate}%</p>
            <p className="text-xs text-gray-500">正答率</p>
          </div>
        </div>

        <CharacterDisplay character={character} />
      </motion.div>

      <div className="flex flex-col gap-3">
        <Link href="/quiz" className="btn-primary w-full text-center">
          もう一セット解く ✏️
        </Link>
        <Link href={backHref} className="btn-secondary w-full text-center">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
