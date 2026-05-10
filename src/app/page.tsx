"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { loadProgress } from "@/lib/storage";
import { calcStreakDays } from "@/lib/score";
import type { UserProgress } from "@/types";
import CharacterDisplay from "@/components/character/CharacterDisplay";
import PassExpectationGauge from "@/components/character/PassExpectationGauge";
import CountUp from "@/components/effects/CountUp";

const menuItems = [
  { href: "/quiz",                label: "問題を解く",       sub: "今日の10問でレベルアップ", emoji: "✏️", primary: true  },
  { href: "/quiz?mode=weak",      label: "弱点を集中学習",   sub: "間違えた問題から優先",     emoji: "🎯", primary: false },
  { href: "/chapters",            label: "章別に学習",       sub: "苦手な章を狙い撃ち",       emoji: "📖", primary: false },
  { href: "/mock-exam",           label: "模擬試験を受ける", sub: "120問・本番形式",          emoji: "📝", primary: false },
  { href: "/stats",               label: "学習状況を見る",   sub: "カレンダー・推移・ランキング", emoji: "📊", primary: false },
];

export default function HomePage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-mocha-400 text-sm tracking-wide">読み込み中...</div>
    </div>
  );

  const streak = calcStreakDays(progress.sessions);
  const totalAnswered = Object.values(progress.questionRecords).reduce(
    (sum, r) => sum + r.totalAttempts,
    0
  );
  const bookmarks = progress.bookmarkedIds.length;

  return (
    <>
      {/* ───────── モバイル ───────── */}
      <div className="flex flex-col gap-5 p-5 pb-10 lg:hidden">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="pt-6 text-center"
        >
          <p className="text-[11px] font-bold tracking-[0.3em] text-primary-600 uppercase mb-1">
            Toritsugi Study
          </p>
          <h1 className="headline text-2xl font-bold">
            登録販売者<span className="shimmer-gold">資格試験</span>
          </h1>
          <p className="text-xs text-mocha-500 mt-1.5 tracking-wide">一緒に合格を目指そう</p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card relative overflow-hidden"
        >
          {/* 装飾のサークル */}
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-rose-gold opacity-20 blur-2xl" />
          <CharacterDisplay character={progress.character} />
          <div className="mt-5">
            <PassExpectationGauge value={progress.character.passExpectation} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="grid grid-cols-3 gap-2"
        >
          <StatTile label="連続学習" value={streak} unit="日" />
          <StatTile label="累計解答" value={totalAnswered} unit="問" />
          <StatTile label="見直し" value={bookmarks} unit="件" />
        </motion.div>

        <div className="flex flex-col gap-2.5 mt-1">
          {menuItems.map((m, i) => (
            <motion.div
              key={m.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.22 + i * 0.05 }}
            >
              <MenuItem {...m} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* ───────── デスクトップ ───────── */}
      <div className="hidden lg:flex flex-col gap-8 p-10 pb-16">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.4em] text-primary-600 uppercase mb-2">
              Toritsugi Study
            </p>
            <h1 className="headline text-4xl font-bold">
              登録販売者<span className="shimmer-gold">資格試験</span>
            </h1>
            <p className="text-sm text-mocha-500 mt-2 tracking-wide">一緒に合格を目指そう</p>
          </div>
          <div className="flex gap-3">
            <StatTile label="連続学習" value={streak} unit="日" big />
            <StatTile label="累計解答" value={totalAnswered} unit="問" big />
            <StatTile label="見直し" value={bookmarks} unit="件" big />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="col-span-5 card relative overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-gradient-rose-gold opacity-25 blur-3xl" />
            <CharacterDisplay character={progress.character} />
            <div className="mt-6">
              <PassExpectationGauge value={progress.character.passExpectation} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="col-span-7 card flex flex-col gap-3"
          >
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="headline text-lg font-bold">学習メニュー</h2>
              <span className="text-[11px] tracking-[0.2em] text-mocha-400 uppercase">Menu</span>
            </div>
            {menuItems.map((m) => <MenuItem key={m.href} {...m} />)}
          </motion.div>
        </div>
      </div>
    </>
  );
}

function StatTile({ label, value, unit, big = false }: { label: string; value: number; unit: string; big?: boolean }) {
  return (
    <div className={`card-flat ${big ? "py-3 px-5 min-w-[112px]" : "py-2.5 px-2 text-center"} relative overflow-hidden`}>
      <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full bg-gradient-rose-gold opacity-15 blur-xl`} />
      <p className={`headline font-bold text-mocha-800 ${big ? "text-3xl" : "text-2xl"} leading-none tabular-nums`}>
        <CountUp value={value} />
        <span className="text-xs ml-0.5 text-mocha-500 font-normal">{unit}</span>
      </p>
      <p className={`${big ? "text-[10px] mt-1.5" : "text-[10px] mt-1"} tracking-[0.18em] text-mocha-500 uppercase`}>
        {label}
      </p>
    </div>
  );
}

function MenuItem({ href, label, sub, emoji, primary }: { href: string; label: string; sub: string; emoji: string; primary: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "btn-primary group !rounded-2xl !py-4 !justify-start !pl-4"
          : "card-flat group flex items-center gap-3 px-4 py-3.5 active:scale-[0.98] transition-all hover:bg-white/85 hover:border-primary-300"
      }
    >
      <span className={`text-2xl ${primary ? "" : ""}`}>{emoji}</span>
      <div className="flex-1 text-left">
        <p className={primary ? "font-bold text-base text-white" : "font-bold text-base text-mocha-800"}>
          {label}
        </p>
        <p className={primary ? "text-[11px] text-white/85 font-normal mt-0.5" : "text-[11px] text-mocha-500 mt-0.5"}>
          {sub}
        </p>
      </div>
      <span className={`text-lg ${primary ? "text-white/70" : "text-mocha-400 group-hover:text-primary-500"} transition-colors`}>›</span>
    </Link>
  );
}
