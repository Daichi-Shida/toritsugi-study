"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { QuestionCategory, UserProgress } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { loadProgress } from "@/lib/storage";
import { calcStreakDays } from "@/lib/score";
import { ALL_QUESTIONS, QUESTION_BY_ID } from "@/data/questions";

const CATEGORIES = Object.keys(CATEGORY_CHAPTER) as QuestionCategory[];

const CHAPTER_EMOJI: Record<QuestionCategory, string> = {
  "医薬品に共通する特性と基本的な知識": "💊",
  "人体の働きと医薬品": "🫀",
  "主な医薬品とその作用": "🧴",
  "薬事関係法規・制度": "📋",
  "医薬品の適正使用・安全対策": "🛡️",
};

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function rateToColor(rate: number | null): string {
  if (rate === null) return "bg-gray-200";
  if (rate >= 80) return "bg-green-400";
  if (rate >= 60) return "bg-primary-400";
  if (rate >= 40) return "bg-amber-400";
  return "bg-red-400";
}

// GitHub風グリッド: 直近12週間（84日）
function buildHeatmapDates(weeks = 12): string[] {
  const days = weeks * 7;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().split("T")[0]);
  }
  return result;
}

function heatmapColor(count: number): string {
  if (count === 0) return "bg-gray-100";
  if (count < 5) return "bg-primary-200";
  if (count < 15) return "bg-primary-400";
  if (count < 30) return "bg-primary-500";
  return "bg-primary-700";
}

export default function StatsPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const heatmapDates = useMemo(() => buildHeatmapDates(12), []);

  if (!progress) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">読み込み中...</p></div>;
  }

  // 累計
  const records = progress.questionRecords;
  const recordsArr = Object.values(records);
  const totalAnswered = recordsArr.reduce((s, r) => s + r.totalAttempts, 0);
  const totalCorrect = recordsArr.reduce((s, r) => s + r.correctAttempts, 0);
  const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const streak = calcStreakDays(progress.sessions);

  const totalSeconds = progress.sessions.reduce((s, x) => s + x.durationSeconds, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMinDisplay = totalHours > 0 ? `${totalHours}時間${totalMinutes % 60}分` : `${totalMinutes}分`;

  // 章別正答率
  const chapterStats = CATEGORIES.map((cat) => {
    const catQs = ALL_QUESTIONS.filter((q) => q.category === cat);
    let attempts = 0;
    let correct = 0;
    let coveredQuestions = 0;
    for (const q of catQs) {
      const r = records[q.id];
      if (r && r.totalAttempts > 0) {
        attempts += r.totalAttempts;
        correct += r.correctAttempts;
        coveredQuestions++;
      }
    }
    const rate = attempts > 0 ? Math.round((correct / attempts) * 100) : null;
    const coverage = catQs.length > 0 ? Math.round((coveredQuestions / catQs.length) * 100) : 0;
    return { cat, rate, coverage, attempts, total: catQs.length };
  });

  // 学習カレンダー: 日付 -> 解答数
  const sessionsByDate = new Map<string, number>();
  for (const s of progress.sessions) {
    const d = s.date.split("T")[0];
    sessionsByDate.set(d, (sessionsByDate.get(d) ?? 0) + s.questionsAnswered);
  }

  // 苦手問題TOP10（試行2回以上 & 正答率50%未満）
  const weakRanking = recordsArr
    .filter((r) => r.totalAttempts >= 2 && r.correctAttempts / r.totalAttempts < 0.5)
    .map((r) => ({
      record: r,
      question: QUESTION_BY_ID[r.questionId],
      rate: Math.round((r.correctAttempts / r.totalAttempts) * 100),
    }))
    .filter((x) => x.question)
    .sort((a, b) => a.rate - b.rate || b.record.totalAttempts - a.record.totalAttempts)
    .slice(0, 10);

  // 直近セッション履歴（新しい順、最大10件）
  const recentSessions = [...progress.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  // 推移グラフ: 直近30日の日次正答率（解答があった日のみ）
  const trendDates = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const arr: { date: string; rate: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const sessions = progress.sessions.filter((s) => s.date.startsWith(key));
      const totalQ = sessions.reduce((s, x) => s + x.questionsAnswered, 0);
      const totalC = sessions.reduce((s, x) => s + x.correctCount, 0);
      arr.push({
        date: key,
        rate: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
        count: totalQ,
      });
    }
    return arr;
  })();
  const maxRate = 100;

  return (
    <div className="flex flex-col gap-5 p-4 pb-8">
      <header className="pt-4 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="text-gray-400 text-lg">←</button>
        <div>
          <h1 className="text-xl font-bold text-primary-700">学習状況 📊</h1>
          <p className="text-sm text-gray-500">これまでの努力を可視化</p>
        </div>
      </header>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{streak}</p>
          <p className="text-xs text-gray-500 mt-1">連続学習日</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{totalAnswered}</p>
          <p className="text-xs text-gray-500 mt-1">累計解答数</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{overallRate}<span className="text-lg">%</span></p>
          <p className="text-xs text-gray-500 mt-1">通算正答率</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{totalMinDisplay}</p>
          <p className="text-xs text-gray-500 mt-1">累計学習時間</p>
        </div>
      </div>

      {/* 学習カレンダー（GitHub風） */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">学習カレンダー</h2>
          <p className="text-xs text-gray-400">直近12週間</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {Array.from({ length: 12 }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const idx = weekIdx * 7 + dayIdx;
                const date = heatmapDates[idx];
                if (!date) return <div key={dayIdx} className="w-3 h-3" />;
                const count = sessionsByDate.get(date) ?? 0;
                return (
                  <div
                    key={dayIdx}
                    className={`w-3 h-3 rounded-sm ${heatmapColor(count)}`}
                    title={`${date} : ${count}問`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <span>少</span>
          <div className="w-3 h-3 rounded-sm bg-gray-100" />
          <div className="w-3 h-3 rounded-sm bg-primary-200" />
          <div className="w-3 h-3 rounded-sm bg-primary-400" />
          <div className="w-3 h-3 rounded-sm bg-primary-500" />
          <div className="w-3 h-3 rounded-sm bg-primary-700" />
          <span>多</span>
        </div>
      </div>

      {/* 章別正答率 */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-3">章別正答率</h2>
        <div className="flex flex-col gap-3">
          {chapterStats.map(({ cat, rate, coverage, total }) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{CHAPTER_EMOJI[cat]}</span>
                <span className="text-xs font-bold text-primary-600">{CATEGORY_CHAPTER[cat]}</span>
                <span className="text-xs text-gray-500 truncate flex-1">{cat}</span>
                <span className="text-sm font-bold text-gray-700">
                  {rate !== null ? `${rate}%` : "—"}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${rateToColor(rate)}`}
                  initial={{ width: 0 }}
                  animate={{ width: rate !== null ? `${rate}%` : "0%" }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                カバー率 {coverage}%（{total}問中）
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 推移グラフ（直近30日） */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-3">日次正答率の推移（30日）</h2>
        {totalAnswered === 0 ? (
          <p className="text-sm text-gray-400">学習データがまだありません</p>
        ) : (
          <div className="flex items-end gap-0.5 h-24">
            {trendDates.map((d, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end relative group"
                title={`${d.date} : ${d.count}問 / 正答率${d.rate}%`}
              >
                <div
                  className={`rounded-t-sm ${d.count === 0 ? "bg-gray-100" : rateToColor(d.rate)}`}
                  style={{ height: d.count === 0 ? "4px" : `${(d.rate / maxRate) * 100}%` }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{formatDateShort(trendDates[0].date)}</span>
          <span>{formatDateShort(trendDates[trendDates.length - 1].date)}</span>
        </div>
      </div>

      {/* 苦手問題TOP10 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">苦手問題 TOP10</h2>
          {weakRanking.length > 0 && (
            <Link href="/quiz?mode=weak" className="text-xs text-primary-600 font-bold">
              復習する →
            </Link>
          )}
        </div>
        {weakRanking.length === 0 ? (
          <p className="text-sm text-gray-400">苦手問題はまだ検出されていません（2回以上解いた問題が対象）</p>
        ) : (
          <div className="flex flex-col gap-2">
            {weakRanking.map((w, i) => (
              <div key={w.record.questionId} className="flex items-start gap-2 border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-primary-600">
                      {CATEGORY_CHAPTER[w.question.category]}
                    </span>
                    <span className="text-xs text-red-600 font-bold">正答率 {w.rate}%</span>
                    <span className="text-xs text-gray-400">{w.record.totalAttempts}回挑戦</span>
                  </div>
                  <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{w.question.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 直近セッション履歴 */}
      <div className="card">
        <h2 className="font-bold text-gray-800 mb-3">直近の学習履歴</h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-gray-400">まだ学習履歴がありません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentSessions.map((s, i) => {
              const d = new Date(s.date);
              const dateLabel = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              const rate = s.questionsAnswered > 0 ? Math.round((s.correctCount / s.questionsAnswered) * 100) : 0;
              const min = Math.floor(s.durationSeconds / 60);
              const sec = s.durationSeconds % 60;
              return (
                <div key={i} className="flex items-center gap-3 text-sm border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                  <span className="text-xs text-gray-400 w-16 shrink-0">{dateLabel}</span>
                  <span className="text-gray-700 font-medium w-16 shrink-0">{s.questionsAnswered}問</span>
                  <span className={`text-xs font-bold shrink-0 ${rate >= 70 ? "text-green-600" : rate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                    {rate}%
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {min > 0 ? `${min}分${sec}秒` : `${sec}秒`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/quiz" className="btn-primary w-full text-center">
          学習を続ける ✏️
        </Link>
        <Link href="/" className="btn-secondary w-full text-center">
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
