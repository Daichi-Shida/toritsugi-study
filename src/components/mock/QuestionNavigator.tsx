"use client";

import { motion } from "framer-motion";

interface Props {
  total: number;
  answers: (number | null)[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function QuestionNavigator({ total, answers, currentIndex, onSelect, onClose, onSubmit }: Props) {
  const unanswered = answers.filter((a) => a === null).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-mocha-900/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        className="mt-auto rounded-t-3xl max-h-[82vh] flex flex-col bg-cream-50/95 backdrop-blur-xl border-t border-white/70 shadow-glass"
        onClick={(e) => e.stopPropagation()}
      >
        {/* グラブハンドル */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-mocha-300/60" />
        </div>
        <div className="flex items-baseline justify-between px-5 pt-2 pb-3 border-b border-cream-200">
          <div>
            <p className="text-[10px] font-bold tracking-[0.25em] text-primary-600 uppercase">Navigator</p>
            <h2 className="headline font-bold text-mocha-800 text-base">問題一覧</h2>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-mocha-500">
            <span className="tracking-wide">未回答 <span className={unanswered > 0 ? "text-rose-600 font-bold tabular-nums" : "text-mocha-700 font-bold tabular-nums"}>{unanswered}問</span></span>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/60 border border-cream-200 text-mocha-500 hover:text-mocha-800 flex items-center justify-center" aria-label="閉じる">✕</button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 flex-1 scrollbar-thin">
          <div className="grid grid-cols-8 gap-2">
            {answers.map((a, i) => (
              <button
                key={i}
                onClick={() => onSelect(i)}
                className={`aspect-square rounded-xl text-xs font-bold flex items-center justify-center transition-all duration-150 ${
                  i === currentIndex
                    ? "text-white shadow-glow-soft scale-105"
                    : a !== null
                    ? "bg-gradient-to-br from-primary-100 to-primary-200 text-primary-800 border border-primary-200/70"
                    : "bg-white/65 text-mocha-400 border border-cream-200"
                }`}
                style={i === currentIndex ? { background: "linear-gradient(135deg, #e3b582 0%, #c08a5b 100%)" } : {}}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-6 pt-3 border-t border-cream-200 flex gap-3 items-center">
          <div className="flex items-center gap-3 text-[10px] text-mocha-500 flex-1 tracking-wide">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary-200 inline-block border border-primary-300/50"></span>回答済</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white/70 border border-cream-200 inline-block"></span>未回答</span>
          </div>
          <button onClick={onSubmit} className="btn-primary text-sm px-5 py-2 !rounded-full" style={{ minHeight: "auto" }}>
            提出する
          </button>
        </div>
      </motion.div>
    </div>
  );
}
