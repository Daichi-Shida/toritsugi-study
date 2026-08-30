/**
 * ローカルストレージによる学習データの永続化
 * IndexedDB への移行を想定したラッパー
 */

import type { UserProgress, QuestionRecord, StudySession } from "@/types";
import { createInitialCharacter, getStageFromExp, getStageName, getNextLevelExp } from "./score";

const STORAGE_KEY = "toritsugi_progress";

export function loadProgress(): UserProgress {
  if (typeof window === "undefined") return createDefaultProgress();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const progress = JSON.parse(raw) as UserProgress;
    // キャラ名を常に最新の定義から再生成（名前変更・ステージ追加に追従）
    const stage = getStageFromExp(progress.character.experience);
    progress.character.stage = stage;
    progress.character.name = getStageName(stage);
    // 次レベルまでの経験値も再生成する。ステージを増やしたとき、
    // 最上位だった人のゲージが満タンのまま止まらないようにするため。
    progress.character.nextLevelExp = getNextLevelExp(stage) || progress.character.experience;
    // 後方互換: bookmarkedIds が無い古い保存を補完
    if (!Array.isArray(progress.bookmarkedIds)) {
      progress.bookmarkedIds = [];
    }
    if (!Array.isArray(progress.sessions)) {
      progress.sessions = [];
    }
    return progress;
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: UserProgress): void {
  if (typeof window === "undefined") return;
  progress.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function updateQuestionRecord(
  progress: UserProgress,
  record: QuestionRecord
): UserProgress {
  return {
    ...progress,
    questionRecords: {
      ...progress.questionRecords,
      [record.questionId]: record,
    },
  };
}

export function addSession(
  progress: UserProgress,
  session: StudySession
): UserProgress {
  // 今日のセッションがあればマージ、なければ追加
  const today = new Date().toISOString().split("T")[0];
  const sessions = [...progress.sessions];
  const todayIndex = sessions.findIndex((s) => s.date.startsWith(today));

  if (todayIndex >= 0) {
    sessions[todayIndex] = {
      ...sessions[todayIndex],
      questionsAnswered:
        sessions[todayIndex].questionsAnswered + session.questionsAnswered,
      correctCount: sessions[todayIndex].correctCount + session.correctCount,
      durationSeconds:
        sessions[todayIndex].durationSeconds + session.durationSeconds,
      categoriesStudied: Array.from(
        new Set([
          ...sessions[todayIndex].categoriesStudied,
          ...session.categoriesStudied,
        ])
      ),
    };
  } else {
    sessions.push(session);
  }

  return { ...progress, sessions };
}

function createDefaultProgress(): UserProgress {
  return {
    questionRecords: {},
    sessions: [],
    character: createInitialCharacter(),
    totalStudyDays: 0,
    bookmarkedIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function toggleBookmark(progress: UserProgress, questionId: string): UserProgress {
  const set = new Set(progress.bookmarkedIds);
  if (set.has(questionId)) set.delete(questionId);
  else set.add(questionId);
  return { ...progress, bookmarkedIds: Array.from(set) };
}

// ===== 直近に出した問題 =====
// 章別学習などで同じ問題が続けて出ないように、最近出題した問題IDを覚えておく。
// 学習記録（questionRecords）とは別に持つので、達成度の集計には影響しない。
const RECENT_KEY = "toritsugi_recent_questions";
const RECENT_LIMIT = 80;

export function loadRecentQuestionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? (ids as string[]) : [];
  } catch {
    return [];
  }
}

/** 出題した問題IDを新しい順で記録する（上限 RECENT_LIMIT 件） */
export function pushRecentQuestionIds(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const fresh = new Set(ids);
  const next = [...ids, ...loadRecentQuestionIds().filter((id) => !fresh.has(id))].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても出題は続けられるので握りつぶす
  }
}
