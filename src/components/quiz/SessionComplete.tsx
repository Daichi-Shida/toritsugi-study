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
    rate === 100 ? "パーフェクト ✦" :
    rate >= 80  ? "見事な集中力" :
    rate >= 60  ? "いい調子。続けよう" :
    "次はもっといける";

  return (
    <div className="flex flex-col gap-5 p-5 pb-10">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 15 }}
        className="card text-center relative overflow-hidden"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-rose-gold opacity-20 blur-3xl" />
        <p className="text-[10px] font-bold tracking-[0.3em] text-primary-600 uppercase mb-2">
          Session Complete
        </p>
        <p className="text-5xl mb-3">{rate === 100 ? "🏆" : rate >= 80 ? "✨" : "📝"}</p>
        <h2 className="headline text-xl font-bold text-mocha-800 mb-1">セッション完了</h2>
        <p className="text-sm text-mocha-500 mb-5 tracking-wide">{message}</p>

        <div className="flex justify-center gap-10 mb-5">
          <div>
            <p className="headline text-3xl font-bold text-mocha-800">{correct}<span className="text-base font-normal text-mocha-500">/{total}</span></p>
            <p className="text-[10px] text-mocha-500 mt-1 tracking-[0.2em] uppercase">正解</p>
          </div>
          <div className="w-px bg-cream-200" />
          <div>
            <p className="headline text-3xl font-bold text-mocha-800">{rate}<span className="text-base font-normal text-mocha-500">%</span></p>
            <p className="text-[10px] text-mocha-500 mt-1 tracking-[0.2em] uppercase">正答率</p>
          </div>
        </div>

        <div className="hr-soft my-3" />
        <CharacterDisplay character={character} />
      </motion.div>

      <div className="flex flex-col gap-2.5">
        <Link href="/quiz" className="btn-primary w-full text-center">
          もう一セット解く
        </Link>
        <Link href={backHref} className="btn-secondary w-full text-center">
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
