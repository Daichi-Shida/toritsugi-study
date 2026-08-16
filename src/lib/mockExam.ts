/**
 * 模擬試験ロジック
 * 合否判定・カテゴリ別スコア計算・問題配分
 */

import type {
  Question,
  QuestionCategory,
  MockExamSession,
  MockExamResult,
} from "@/types";
import { CATEGORY_QUESTION_COUNT } from "@/types";
import { shuffleQuestion } from "./shuffle";

const PASS_RATE_TOTAL = 0.7;         // 総合合格ライン 70%
const PASS_RATE_CATEGORY = 0.35;     // カテゴリ別合格ライン 35%
// 制限時間は設けない（自分のペースで解けるようにするため）。
// 経過時間は計測を続け、結果画面の所要時間と学習時間の集計に使う。

// クイック模擬試験の章別出題数（通常の1/4）
const QUICK_CATEGORY_QUESTION_COUNT: Record<QuestionCategory, number> = {
  "医薬品に共通する特性と基本的な知識": 5,
  "人体の働きと医薬品": 5,
  "主な医薬品とその作用": 10,
  "薬事関係法規・制度": 5,
  "医薬品の適正使用・安全対策": 5,
};

const MOCK_EXAM_KEY = "toritsugi_mock_exam";

/**
 * 問題プールからカテゴリ配分に従って模擬試験用問題を選択する
 */
function buildQuestions(
  allQuestions: Question[],
  countMap: Record<QuestionCategory, number>
): Question[] {
  const result: Question[] = [];
  for (const [category, count] of Object.entries(countMap)) {
    const pool = allQuestions
      .filter((q) => q.category === (category as QuestionCategory))
      .sort(() => Math.random() - 0.5);
    const selected: Question[] = [];
    for (let i = 0; i < count; i++) {
      selected.push(pool[i % pool.length]);
    }
    result.push(...selected);
  }
  return result.map(shuffleQuestion);
}

export function buildMockExamQuestions(allQuestions: Question[]): Question[] {
  return buildQuestions(allQuestions, CATEGORY_QUESTION_COUNT);
}

export function buildQuickMockExamQuestions(allQuestions: Question[]): Question[] {
  return buildQuestions(allQuestions, QUICK_CATEGORY_QUESTION_COUNT);
}

/**
 * 模擬試験セッションを開始する
 */
export function startMockExam(questions: Question[]): MockExamSession {
  const session: MockExamSession = {
    questions,
    answers: new Array(questions.length).fill(null),
    startedAt: new Date().toISOString(),
    isFinished: false,
  };
  saveMockExamSession(session);
  return session;
}

/**
 * 解答を記録する
 */
export function recordAnswer(
  session: MockExamSession,
  questionIndex: number,
  answerIndex: number
): MockExamSession {
  const answers = [...session.answers];
  answers[questionIndex] = answerIndex;
  const updated = { ...session, answers };
  saveMockExamSession(updated);
  return updated;
}

/**
 * 模擬試験を採点する
 */
export function scoreMockExam(session: MockExamSession): MockExamResult {
  const { questions, answers, startedAt } = session;
  const now = new Date();
  const durationSeconds = Math.floor(
    (now.getTime() - new Date(startedAt).getTime()) / 1000
  );

  // カテゴリ別スコアを初期化
  const categoryScores = {} as MockExamResult["categoryScores"];
  for (const cat of Object.keys(CATEGORY_QUESTION_COUNT) as QuestionCategory[]) {
    categoryScores[cat] = { score: 0, possible: 0 };
  }

  let totalScore = 0;
  const wrongQuestionIds: string[] = [];

  questions.forEach((q, i) => {
    const cat = q.category;
    if (!categoryScores[cat]) {
      categoryScores[cat] = { score: 0, possible: 0 };
    }
    categoryScores[cat].possible += 1;

    const isCorrect = answers[i] === q.correctIndex;
    if (isCorrect) {
      totalScore += 1;
      categoryScores[cat].score += 1;
    } else {
      wrongQuestionIds.push(q.id);
    }
  });

  // 合否判定
  const totalPossible = questions.length;
  const passedTotal = totalScore / totalPossible >= PASS_RATE_TOTAL;
  const passedAllCategories = Object.values(categoryScores).every(
    ({ score, possible }) => possible === 0 || score / possible >= PASS_RATE_CATEGORY
  );
  const isPassed = passedTotal && passedAllCategories;

  return {
    totalScore,
    totalPossible,
    isPassed,
    categoryScores,
    wrongQuestionIds,
    durationSeconds,
    date: now.toISOString(),
  };
}

/**
 * 開始からの経過時間（秒）を計算する
 */
export function calcElapsedSeconds(session: MockExamSession): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
  );
}

/**
 * 時間を MM:SS（1時間以上は H:MM:SS）形式にフォーマット
 */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ===== 永続化 =====
export function saveMockExamSession(session: MockExamSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOCK_EXAM_KEY, JSON.stringify(session));
}

export function loadMockExamSession(): MockExamSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MOCK_EXAM_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MockExamSession;
    if (session.isFinished) return null; // 終了済みは読み込まない
    return session;
  } catch {
    return null;
  }
}

export function clearMockExamSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MOCK_EXAM_KEY);
}
