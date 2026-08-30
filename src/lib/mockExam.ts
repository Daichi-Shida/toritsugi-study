/**
 * 模擬試験ロジック
 * 合否判定・カテゴリ別スコア計算・問題配分
 */

import type {
  Question,
  QuestionCategory,
  CharacterStage,
  MockExamSession,
  MockExamResult,
} from "@/types";
import { CATEGORY_QUESTION_COUNT } from "@/types";
import { pickDiverse } from "./questionPicker";

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
// 採点済みの試験。結果画面を開き直しても問題と解説を見返せるように残しておく。
// （以前は結果画面を開いた瞬間に受験データを消していたので、戻る・再読み込みで
//   問題を確認できなくなっていた）
const MOCK_RESULT_KEY = "toritsugi_mock_exam_result";

/**
 * 問題プールからカテゴリ配分に従って模擬試験用問題を選択する
 */
function buildQuestions(
  allQuestions: Question[],
  countMap: Record<QuestionCategory, number>
): Question[] {
  const result: Question[] = [];
  for (const [category, count] of Object.entries(countMap)) {
    const pool = allQuestions.filter((q) => q.category === (category as QuestionCategory));
    // ランダムに引きつつ、年度違いで同じ論点を聞く問題が重ならないようにする
    const selected = pickDiverse(pool, count, result);
    // プールが出題数に満たない時だけ、足りない分を埋める（通常は起きない）
    for (let i = 0; selected.length < count && pool.length > 0; i++) {
      selected.push(pool[i % pool.length]);
    }
    result.push(...selected);
  }
  // 選択肢は本試験の並びのまま。順序を変えると正解の番号が原文と食い違う
  return result;
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

// ===== 採点済みの試験（結果画面用） =====

/** 模擬試験で伸びたキャラクターの成長ぶん（表示用。加算そのものは提出時に1回だけ行う） */
export interface MockExamGrowth {
  gainedExp: number;
  totalExp: number;
  nextLevelExp: number;
  fromStage: CharacterStage;
  toStage: CharacterStage;
  toName: string;
  /** レベルアップ演出を出したか（結果画面を開き直すたびに出さないための印） */
  celebrated?: boolean;
}

export interface StoredMockExamResult {
  session: MockExamSession;
  result: MockExamResult;
  growth?: MockExamGrowth;
}

/**
 * 試験を締めて採点し、結果を保存する。
 * 学習記録（SRS・学習セッション）の反映は呼び出し側で1回だけ行う。
 * ここは表示用のデータを置くだけなので、結果画面を何度開いても
 * ステータスの進行が二重に進むことはない。
 */
export function finishMockExam(session: MockExamSession, growth?: MockExamGrowth): StoredMockExamResult {
  const finished: MockExamSession = { ...session, isFinished: true };
  const stored: StoredMockExamResult = { session: finished, result: scoreMockExam(finished), growth };
  if (typeof window !== "undefined") {
    localStorage.setItem(MOCK_RESULT_KEY, JSON.stringify(stored));
    // 受験中のセッションは終了したので消す（「再開する」を出さないため）
    localStorage.removeItem(MOCK_EXAM_KEY);
  }
  return stored;
}

export function loadMockExamResult(): StoredMockExamResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MOCK_RESULT_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as StoredMockExamResult;
      if (stored?.session?.questions?.length && stored.result) return stored;
    }
    // 旧バージョン互換：結果キーが無く、終了済みセッションだけが残っている場合
    const legacy = localStorage.getItem(MOCK_EXAM_KEY);
    if (legacy) {
      const session = JSON.parse(legacy) as MockExamSession;
      if (session?.isFinished && session.questions?.length) {
        return { session, result: scoreMockExam(session) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** レベルアップ演出を出し終えた印をつける（表示用のデータだけを書き換える） */
export function markMockExamGrowthCelebrated(): void {
  if (typeof window === "undefined") return;
  const stored = loadMockExamResult();
  if (!stored?.growth) return;
  const next: StoredMockExamResult = { ...stored, growth: { ...stored.growth, celebrated: true } };
  localStorage.setItem(MOCK_RESULT_KEY, JSON.stringify(next));
}

export function hasMockExamResult(): boolean {
  return loadMockExamResult() !== null;
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

