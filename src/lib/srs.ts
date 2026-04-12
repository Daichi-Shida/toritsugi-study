/**
 * SRS (Spaced Repetition System) — SM-2アルゴリズムベース
 * 正解・不正解に応じて次回出題までの間隔を動的に調整する
 */

import type { QuestionRecord } from "@/types";

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const INTERVAL_MODIFIER = 1.0;

/**
 * 解答結果をもとにQuestionRecordを更新する
 * @param record 既存の記録（初回はnull）
 * @param isCorrect 正解かどうか
 * @param quality 解答の質 0-5 (0=全く分からなかった, 5=完璧)
 */
export function updateRecord(
  record: QuestionRecord | null,
  questionId: string,
  isCorrect: boolean,
  quality: number = isCorrect ? 4 : 1
): QuestionRecord {
  const now = new Date();

  if (!record) {
    // 初回
    const interval = isCorrect ? 1 : 0;
    return {
      questionId,
      interval,
      easeFactor: DEFAULT_EASE_FACTOR,
      nextReviewDate: addDays(now, interval).toISOString(),
      totalAttempts: 1,
      correctAttempts: isCorrect ? 1 : 0,
      lastAttemptDate: now.toISOString(),
      lastResult: isCorrect ? "correct" : "wrong",
    };
  }

  // SM-2アルゴリズム
  let { interval, easeFactor } = record;

  if (quality >= 3) {
    // 正解系
    if (interval === 0) {
      interval = 1;
    } else if (interval === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor * INTERVAL_MODIFIER);
    }
    easeFactor = Math.max(
      MIN_EASE_FACTOR,
      easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    );
  } else {
    // 不正解系：リセット
    interval = 0;
    easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
  }

  return {
    ...record,
    interval,
    easeFactor,
    nextReviewDate: addDays(now, interval).toISOString(),
    totalAttempts: record.totalAttempts + 1,
    correctAttempts: record.correctAttempts + (isCorrect ? 1 : 0),
    lastAttemptDate: now.toISOString(),
    lastResult: isCorrect ? "correct" : "wrong",
  };
}

/**
 * 今日復習すべき問題IDのリストを返す
 */
export function getDueQuestionIds(
  records: Record<string, QuestionRecord>
): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Object.values(records)
    .filter((r) => new Date(r.nextReviewDate) <= today)
    .sort((a, b) => {
      // 間違えた問題・間隔が短い問題を優先
      if (a.lastResult !== b.lastResult) {
        return a.lastResult === "wrong" ? -1 : 1;
      }
      return a.interval - b.interval;
    })
    .map((r) => r.questionId);
}

/**
 * 正答率を計算する
 */
export function getAccuracyRate(record: QuestionRecord): number {
  if (record.totalAttempts === 0) return 0;
  return record.correctAttempts / record.totalAttempts;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
