"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import type { QuestionCategory, UserProgress } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { loadProgress } from "@/lib/storage";
import { calcStreakDays } from "@/lib/score";
import { getCategoryOf, getQuestionSummary } from "@/lib/questionIndex";
import { ALL_QUESTIONS } from "@/data/questions";

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

function rateBg(rate: number | null): string {
  if (rate === null) return "from-cream-100 to-cream-200";
  if (rate >= 80) return "from-emerald-300 to-emerald-500";
  if (rate >= 60) return "from-primary-300 to-primary-500";
  if (rate >= 40) return "from-amber-300 to-amber-500";
  return "from-rose-300 to-rose-500";
}

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
  if (count === 0) return "bg-cream-100/70 border border-cream-200";
  if (count < 5)   return "bg-primary-200/80";
  if (count < 15)  return "bg-primary-400";
  if (count < 30)  return "bg-primary-500";
  return "bg-gradient-to-br from-primary-500 to-mocha-600";
}

export default function StatsPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const heatmapDates = useMemo(() => buildHeatmapDates(12), []);

  if (!progress) {
    return <div className="flex items-center justify-center h-64"><p className="text-mocha-400 text-sm tracking-wide">読み込み中...</p></div>;
  }

  const records = progress.questionRecords;
  const recordsArr = Object.values(records);
  const totalAnswered = recordsArr.reduce((s, r) => s + r.totalAttempts, 0);
  const totalCorrect = recordsArr.reduce((s, r) => s + r.correctAttempts, 0);
  const overallRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const streak = calcStreakDays(progress.sessions);

  const totalSeconds = progress.sessions.reduce((s, x) => s + x.durationSeconds, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMinDisplay = totalHours > 0 ? `${totalHours}h${totalMinutes % 60}m` : `${totalMinutes}m`;

  const chapterStats = CATEGORIES.map((cat) => {
    const catQs = ALL_QUESTIONS.filter((q) => q.category === cat);
    // 正答率は学習記録側から数える。出題プールを入れ替えても、外した問題の
    // 記録は retired_index 経由で章が分かるので、これまでの数字がそのまま残る。
    let attempts = 0;
    let correct = 0;
    for (const r of recordsArr) {
      if (r.totalAttempts <= 0) continue;
      if (getCategoryOf(r.questionId) !== cat) continue;
      attempts += r.totalAttempts;
      correct += r.correctAttempts;
    }
    // カバー率は現行プールに対する進み具合
    let coveredQuestions = 0;
    for (const q of catQs) {
      const r = records[q.id];
      if (r && r.totalAttempts > 0) coveredQuestions++;
    }
    const rate = attempts > 0 ? Math.round((correct / attempts) * 100) : null;
    const coverage = catQs.length > 0 ? Math.round((coveredQuestions / catQs.length) * 100) : 0;
    return { cat, rate, coverage, attempts, total: catQs.length };
  });

  const sessionsByDate = new Map<string, number>();
  for (const s of progress.sessions) {
    const d = s.date.split("T")[0];
    sessionsByDate.set(d, (sessionsByDate.get(d) ?? 0) + s.questionsAnswered);
  }

  const weakRanking = recordsArr
    .filter((r) => r.totalAttempts >= 2 && r.correctAttempts / r.totalAttempts < 0.5)
    .flatMap((r) => {
      // 出題プールから外した問題も、苦手リストからは消さずに表示する
      const question = getQuestionSummary(r.questionId);
      if (!question) return [];
      return [{
        record: r,
        question,
        rate: Math.round((r.correctAttempts / r.totalAttempts) * 100),
      }];
    })
    .sort((a, b) => a.rate - b.rate || b.record.totalAttempts - a.record.totalAttempts)
    .slice(0, 10);

  const recentSessions = [...progress.sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

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
      arr.push({ date: key, rate: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0, count: totalQ });
    }
    return arr;
  })();

  return (
    <div className="flex flex-col gap-5 p-5 pb-10">
      <header className="pt-5 flex items-center gap-3">
        <button onClick={() => router.push("/")} className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/70 flex items-center justify-center text-mocha-500 hover:text-mocha-800" aria-label="戻る">←</button>
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] text-primary-600 uppercase">Progress Report</p>
          <h1 className="headline text-xl font-bold text-mocha-800">学習状況</h1>
        </div>
      </header>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="連続学習" value={streak} unit="日" accent="primary" />
        <SummaryCard label="累計解答" value={totalAnswered} unit="問" accent="mocha" />
        <SummaryCard label="通算正答率" value={overallRate} unit="%" accent="primary" />
        <SummaryCard label="累計時間" valueText={totalMinDisplay} accent="mocha" />
      </div>

      {/* 学習カレンダー */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Activity</p>
            <h2 className="headline text-base font-bold text-mocha-800">学習カレンダー</h2>
          </div>
          <p className="text-[10px] text-mocha-400 tracking-wider uppercase">12 weeks</p>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {Array.from({ length: 12 }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1 shrink-0">
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const idx = weekIdx * 7 + dayIdx;
                const date = heatmapDates[idx];
                if (!date) return <div key={dayIdx} className="w-3 h-3" />;
                const count = sessionsByDate.get(date) ?? 0;
                return <div key={dayIdx} className={`w-3 h-3 rounded ${heatmapColor(count)}`} title={`${date}: ${count}問`} />;
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-mocha-400 tracking-wider uppercase">
          <span>少</span>
          <div className="w-3 h-3 rounded bg-cream-100/70 border border-cream-200" />
          <div className="w-3 h-3 rounded bg-primary-200/80" />
          <div className="w-3 h-3 rounded bg-primary-400" />
          <div className="w-3 h-3 rounded bg-primary-500" />
          <div className="w-3 h-3 rounded bg-gradient-to-br from-primary-500 to-mocha-600" />
          <span>多</span>
        </div>
      </div>

      {/* 章別正答率 */}
      <div className="card">
        <div className="mb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">By Chapter</p>
          <h2 className="headline text-base font-bold text-mocha-800">章別正答率</h2>
        </div>
        <div className="flex flex-col gap-3.5">
          {chapterStats.map(({ cat, rate, coverage, total }) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{CHAPTER_EMOJI[cat]}</span>
                <span className="badge badge-gold">{CATEGORY_CHAPTER[cat]}</span>
                <span className="text-[11px] text-mocha-500 truncate flex-1">{cat}</span>
                <span className="text-sm font-bold text-mocha-800 tabular-nums">
                  {rate !== null ? `${rate}%` : "—"}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-cream-100/80 border border-cream-200">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${rateBg(rate)}`}
                  initial={{ width: 0 }}
                  animate={{ width: rate !== null ? `${rate}%` : "0%" }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <p className="text-[10px] text-mocha-400 mt-1 tracking-wide">
                カバー率 {coverage}%（{total}問中）
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 推移 */}
      <div className="card">
        <div className="mb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Trend</p>
          <h2 className="headline text-base font-bold text-mocha-800">日次正答率（30日）</h2>
        </div>
        {totalAnswered === 0 ? (
          <p className="text-sm text-mocha-400">学習データがまだありません</p>
        ) : (
          <div className="flex items-end gap-0.5 h-24">
            {trendDates.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end" title={`${d.date} : ${d.count}問 / 正答率${d.rate}%`}>
                <div className={`rounded-t bg-gradient-to-t ${d.count === 0 ? "from-cream-100 to-cream-100" : rateBg(d.rate)}`}
                  style={{ height: d.count === 0 ? "4px" : `${(d.rate / 100) * 100}%` }}
                />
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between text-[10px] text-mocha-400 mt-2 tracking-wider uppercase">
          <span>{formatDateShort(trendDates[0].date)}</span>
          <span>{formatDateShort(trendDates[trendDates.length - 1].date)}</span>
        </div>
      </div>

      {/* 苦手TOP10 */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Weak Spots</p>
            <h2 className="headline text-base font-bold text-mocha-800">苦手問題 TOP10</h2>
          </div>
          {weakRanking.length > 0 && (
            <Link href="/quiz?mode=weak" className="text-[11px] text-primary-700 font-bold hover:text-primary-900 tracking-wide">
              復習する →
            </Link>
          )}
        </div>
        {weakRanking.length === 0 ? (
          <p className="text-sm text-mocha-400">苦手問題はまだ検出されていません（2回以上解いた問題が対象）</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {weakRanking.map((w, i) => (
              <div key={w.record.questionId} className="flex items-start gap-2 border-t border-cream-200/60 pt-2.5 first:border-t-0 first:pt-0">
                <span className="text-xs font-bold text-mocha-400 w-5 shrink-0 tabular-nums">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="badge badge-cream">{CATEGORY_CHAPTER[w.question.category]}</span>
                    <span className="text-[10px] text-rose-600 font-bold tabular-nums">{w.rate}%</span>
                    <span className="text-[10px] text-mocha-400 tabular-nums">{w.record.totalAttempts}回</span>
                  </div>
                  <p className="text-xs text-mocha-700 line-clamp-2 leading-relaxed">{w.question.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 直近セッション */}
      <div className="card">
        <div className="mb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">History</p>
          <h2 className="headline text-base font-bold text-mocha-800">直近の学習</h2>
        </div>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-mocha-400">まだ学習履歴がありません</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentSessions.map((s, i) => {
              const d = new Date(s.date);
              const dateLabel = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              const rate = s.questionsAnswered > 0 ? Math.round((s.correctCount / s.questionsAnswered) * 100) : 0;
              const min = Math.floor(s.durationSeconds / 60);
              const sec = s.durationSeconds % 60;
              return (
                <div key={i} className="flex items-center gap-3 text-sm border-t border-cream-200/60 pt-2 first:border-t-0 first:pt-0">
                  <span className="text-[10px] text-mocha-400 w-20 shrink-0 tabular-nums tracking-wide">{dateLabel}</span>
                  <span className="text-mocha-700 font-medium w-14 shrink-0 tabular-nums">{s.questionsAnswered}問</span>
                  <span className={`text-xs font-bold shrink-0 tabular-nums ${rate >= 70 ? "text-emerald-700" : rate >= 40 ? "text-amber-600" : "text-rose-600"}`}>
                    {rate}%
                  </span>
                  <span className="text-[10px] text-mocha-400 ml-auto tabular-nums tracking-wide">
                    {min > 0 ? `${min}m${sec}s` : `${sec}s`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <Link href="/quiz" className="btn-primary w-full text-center">学習を続ける</Link>
        <Link href="/" className="btn-secondary w-full text-center">ホームに戻る</Link>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, valueText, unit, accent }: { label: string; value?: number; valueText?: string; unit?: string; accent: "primary" | "mocha" }) {
  return (
    <div className="card-flat relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-30 ${accent === "primary" ? "bg-primary-300" : "bg-mocha-300"}`} />
      <p className="text-[10px] font-bold tracking-[0.2em] text-mocha-500 uppercase mb-1">{label}</p>
      <p className="headline font-bold text-mocha-800 text-3xl leading-none tabular-nums">
        {value !== undefined ? value : valueText}
        {unit && <span className="text-base ml-0.5 text-mocha-500 font-normal">{unit}</span>}
      </p>
    </div>
  );
}
