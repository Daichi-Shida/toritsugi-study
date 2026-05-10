"use client";

import { motion, AnimatePresence } from "framer-motion";

interface Props {
  /** 表示するEXP増加分（0または負ならこのコンポーネントは何も出さない） */
  exp: number | null;
  /** key を変えると再アニメーション */
  triggerKey: string | number;
}

/**
 * 画面右上にふわっと「+20 EXP ✦」が浮き上がるフローター。
 */
export default function ExpFloater({ exp, triggerKey }: Props) {
  return (
    <div aria-hidden className="fixed top-24 right-6 z-50 pointer-events-none">
      <AnimatePresence>
        {exp !== null && exp > 0 && (
          <motion.div
            key={triggerKey}
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: -30, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="relative"
          >
            <span
              className="block text-base font-bold tracking-wider"
              style={{
                background: "linear-gradient(135deg, #d4a574 0%, #c08a5b 50%, #7e5733 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 1px 8px rgba(212,165,116,0.3)",
              }}
            >
              +{exp} EXP ✦
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
