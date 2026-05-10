"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { CharacterStage } from "@/types";
import BeanCharacter from "@/components/character/BeanCharacter";
import MaryCharacter from "@/components/character/MaryCharacter";
import AdultMaryCharacter from "@/components/character/AdultMaryCharacter";
import SamuraiCharacter from "@/components/character/SamuraiCharacter";

interface Props {
  show: boolean;
  fromStage: CharacterStage;
  toStage: CharacterStage;
  toName: string;
  onClose: () => void;
}

const STAGE_EMOJI: Record<number, string> = {
  1: "🫘", 2: "🌱", 3: "🌸", 4: "🥔", 5: "👧", 6: "🕵️‍♀️", 7: "🗡️",
};

function StageVisual({ stage, size = 112 }: { stage: CharacterStage; size?: number }) {
  if (stage === 1) return <BeanCharacter size={size} />;
  if (stage === 5) return <MaryCharacter size={size} />;
  if (stage === 6) return <AdultMaryCharacter size={size} />;
  if (stage === 7) return <SamuraiCharacter size={size} />;
  return <span style={{ fontSize: size * 0.85 }}>{STAGE_EMOJI[stage]}</span>;
}

export default function LevelUpModal({ show, fromStage, toStage, toName, onClose }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md"
          style={{ background: "radial-gradient(circle at center, rgba(212,165,116,0.45) 0%, rgba(74,44,26,0.7) 70%)" }}
          onClick={onClose}
        >
          {/* 背景一閃 */}
          <motion.div
            aria-hidden
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 4, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute"
            style={{
              width: 200, height: 200, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,245,184,0.9) 0%, rgba(212,165,116,0) 70%)",
            }}
          />
          {/* 放射状の光線 */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              aria-hidden
              key={i}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: [0, 1, 0] }}
              transition={{ duration: 1.4, delay: 0.2, repeat: Infinity, repeatDelay: 0.6 }}
              className="absolute origin-center"
              style={{
                width: 4, height: 280,
                background: "linear-gradient(180deg, transparent, rgba(255,245,184,0.55), transparent)",
                transform: `rotate(${i * 30}deg)`,
              }}
            />
          ))}

          {/* 本体 */}
          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative card mx-6 max-w-sm w-full text-center px-6 py-8"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, rgba(255,250,240,0.95) 0%, rgba(245,222,196,0.85) 100%)",
            }}
          >
            <p className="text-[10px] font-bold tracking-[0.4em] text-primary-700 uppercase mb-1">
              Level Up!
            </p>
            <p className="headline text-2xl font-bold mb-5 shimmer-gold">
              {toName}
            </p>

            {/* キャラ変化アニメ：旧→新 */}
            <div className="relative h-32 flex items-center justify-center mb-4">
              <motion.div
                initial={{ scale: 1, opacity: 1, x: 0 }}
                animate={{ scale: 0.6, opacity: 0, x: -50 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="absolute"
              >
                <StageVisual stage={fromStage} size={88} />
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0, x: 50, rotate: -25 }}
                animate={{ scale: 1.05, opacity: 1, x: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.7 }}
                className="absolute"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <StageVisual stage={toStage} size={120} />
                </motion.div>
              </motion.div>
            </div>

            {/* キラキラ */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <p className="text-sm text-mocha-700 font-medium tracking-wide mb-1">
                ステージ {fromStage} → <span className="font-bold text-primary-700">{toStage}</span>
              </p>
              <p className="text-xs text-mocha-500 tracking-wide">
                おめでとう！背景もアップグレード
              </p>
            </motion.div>

            <button
              onClick={onClose}
              className="btn-primary mt-6 px-8"
            >
              続ける
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
