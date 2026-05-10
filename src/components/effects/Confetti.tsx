"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

interface Props {
  show: boolean;
  /** 紙吹雪の数 */
  count?: number;
  /** "gold" or "rainbow" */
  tone?: "gold" | "rainbow";
}

const PALETTES: Record<string, string[]> = {
  gold:    ["#f4d6b8", "#e3b582", "#d4a574", "#c08a5b", "#fff5b8", "#e6c970"],
  rainbow: ["#f49a90", "#e3b582", "#fde68a", "#a7d99e", "#7eb6e0", "#c4a3e6"],
};

/**
 * 画面中央上部から紙吹雪を散らす演出。show=trueになった瞬間に飛び散る。
 */
export default function Confetti({ show, count = 28, tone = "gold" }: Props) {
  const colors = PALETTES[tone];

  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * (Math.random() * 0.85 + 0.075)) - Math.PI / 2; // -90°〜+90°
      const dist  = 220 + Math.random() * 180;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      return {
        id: i,
        color: colors[i % colors.length],
        size: 6 + Math.random() * 8,
        rot:  Math.random() * 360,
        rotEnd: Math.random() * 720 - 360,
        dx,
        dy,
        delay: Math.random() * 0.15,
        shape: Math.random() < 0.5 ? "rect" : "circle",
      };
    }), [count, colors]
  );

  if (!show) return null;

  return (
    <div aria-hidden className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center">
      <div className="relative w-1 h-1 mt-32">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: 0, y: 0, rotate: p.rot, opacity: 1, scale: 1 }}
            animate={{
              x: p.dx,
              y: [0, -40, p.dy + 220],
              rotate: p.rot + p.rotEnd,
              opacity: [1, 1, 0],
              scale: [0.6, 1, 0.7],
            }}
            transition={{
              duration: 1.8,
              delay: p.delay,
              ease: ["easeOut", "easeIn"],
              times: [0, 0.3, 1],
            }}
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width:  p.shape === "rect" ? p.size : p.size,
              height: p.shape === "rect" ? p.size * 0.4 : p.size,
              backgroundColor: p.color,
              borderRadius: p.shape === "rect" ? 2 : 999,
              boxShadow: `0 0 6px ${p.color}88`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
