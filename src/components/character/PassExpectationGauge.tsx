"use client";

import { motion } from "framer-motion";

interface Props {
  value: number; // 0-100
}

export default function PassExpectationGauge({ value }: Props) {
  const color =
    value >= 80
      ? "from-green-400 to-emerald-500"
      : value >= 50
      ? "from-primary-400 to-primary-600"
      : "from-orange-400 to-amber-500";

  const label =
    value >= 80 ? "合格圏内！" : value >= 50 ? "順調に成長中" : "もっと頑張ろう";

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-bold text-gray-700">合格期待値</span>
        <span className="text-sm text-gray-500">{label}</span>
      </div>

      <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1.0, ease: "easeOut", delay: 0.2 }}
        />

        {/* パーセント表示 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white drop-shadow">
            {value}%
          </span>
        </div>
      </div>

      {/* 合格ライン（70%）マーカー */}
      <div className="relative mt-1">
        <div
          className="absolute w-px h-2 bg-gray-400"
          style={{ left: "70%" }}
        />
        <p className="text-xs text-gray-400" style={{ marginLeft: "68%" }}>
          合格ライン
        </p>
      </div>
    </div>
  );
}
