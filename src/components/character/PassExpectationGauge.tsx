"use client";

import { motion } from "framer-motion";

interface Props {
  value: number; // 0-100
}

export default function PassExpectationGauge({ value }: Props) {
  const colorClass =
    value >= 80
      ? "from-emerald-400 via-green-500 to-emerald-600"
      : value >= 50
      ? "from-primary-300 via-primary-400 to-primary-600"
      : "from-rose-300 via-rose-400 to-rose-500";

  const label =
    value >= 80 ? "合格圏内 ✦" : value >= 50 ? "順調に成長中" : "コツコツ前進";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] tracking-[0.2em] font-bold text-mocha-500 uppercase">
            Pass Expectation
          </span>
        </div>
        <span className="text-xs text-mocha-500 font-medium">{label}</span>
      </div>

      <div className="relative h-5 rounded-full overflow-hidden bg-cream-100/70 border border-cream-200">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorClass} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white tracking-wider drop-shadow-sm">
            {value}%
          </span>
        </div>
      </div>

      {/* 合格ライン70% */}
      <div className="relative mt-1.5 h-3">
        <div
          className="absolute w-px h-2 bg-mocha-400"
          style={{ left: "70%" }}
        />
        <p className="absolute text-[10px] text-mocha-500 tracking-wide whitespace-nowrap"
           style={{ left: "68%" }}>
          合格 70%
        </p>
      </div>
    </div>
  );
}
