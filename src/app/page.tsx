"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProgress } from "@/lib/storage";
import { calcStreakDays } from "@/lib/score";
import type { UserProgress } from "@/types";
import CharacterDisplay from "@/components/character/CharacterDisplay";
import PassExpectationGauge from "@/components/character/PassExpectationGauge";

export default function HomePage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  if (!progress) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-primary-400 text-sm">読み込み中...</div>
    </div>
  );

  const streak = calcStreakDays(progress.sessions);
  const totalAnswered = Object.values(progress.questionRecords).reduce(
    (sum, r) => sum + r.totalAttempts,
    0
  );

  const actionButtons = (
    <>
      <Link href="/quiz" className="btn-primary w-full text-center text-lg py-4">
        問題を解く ✏️
      </Link>
      <Link href="/quiz?mode=weak" className="btn-secondary w-full text-center">
        弱点を集中学習 🎯
      </Link>
      <Link href="/chapters" className="btn-secondary w-full text-center">
        章別に学習する 📖
      </Link>
      <Link href="/mock-exam" className="btn-secondary w-full text-center">
        模擬試験を受ける 📝
      </Link>
      <Link href="/stats" className="btn-secondary w-full text-center">
        学習状況を見る 📊
      </Link>
    </>
  );

  return (
    <>
      {/* ── モバイル表示 ── */}
      <div className="flex flex-col gap-5 p-4 pb-8 lg:hidden">
        <header className="pt-4 text-center">
          <h1 className="text-xl font-bold text-primary-700">登録販売者資格試験アプリ</h1>
          <p className="text-sm text-gray-500 mt-1">一緒に合格を目指そう！</p>
        </header>

        <div className="card">
          <CharacterDisplay character={progress.character} />
          <div className="mt-4">
            <PassExpectationGauge value={progress.character.passExpectation} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600">{streak}</p>
            <p className="text-sm text-gray-500 mt-1">連続学習日</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-primary-600">{totalAnswered}</p>
            <p className="text-sm text-gray-500 mt-1">累計解答数</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">{actionButtons}</div>
      </div>

      {/* ── デスクトップ表示 ── */}
      <div className="hidden lg:flex flex-col gap-6 p-8 pb-12">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-primary-700">登録販売者資格試験アプリ</h1>
          <p className="text-gray-500 mt-1">一緒に合格を目指そう！</p>
        </header>

        <div className="grid grid-cols-2 gap-6 items-start">
          {/* 左列: キャラクター + ゲージ + 統計 */}
          <div className="flex flex-col gap-4">
            <div className="card">
              <CharacterDisplay character={progress.character} />
              <div className="mt-6">
                <PassExpectationGauge value={progress.character.passExpectation} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card text-center">
                <p className="text-4xl font-bold text-primary-600">{streak}</p>
                <p className="text-sm text-gray-500 mt-1">連続学習日</p>
              </div>
              <div className="card text-center">
                <p className="text-4xl font-bold text-primary-600">{totalAnswered}</p>
                <p className="text-sm text-gray-500 mt-1">累計解答数</p>
              </div>
            </div>
          </div>

          {/* 右列: アクションボタン */}
          <div className="card flex flex-col gap-4 p-8">
            <h2 className="text-lg font-bold text-primary-700 mb-2">学習メニュー</h2>
            {actionButtons}
          </div>
        </div>
      </div>
    </>
  );
}
