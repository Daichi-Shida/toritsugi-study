/**
 * キャラクター成長・合格期待値の計算ロジック
 */

import type {
  CharacterStatus,
  CharacterStage,
  QuestionRecord,
  StudySession,
} from "@/types";

export const STAGE_NAMES: Record<CharacterStage, string> = {
  1: "豆ころ",
  2: "芽が出てきた",
  3: "花が咲いてきた",
  4: "…さといも",
  5: "メアリー！",
  6: "大人メアリー",
  7: "侍メアリー",
};

const STAGE_THRESHOLDS = [0, 200, 500, 1000, 2000, 3500, 6000]; // 各ステージに必要な経験値

/**
 * 学習記録から合格期待値（0-100）を計算する
 */
export function calcPassExpectation(
  records: Record<string, QuestionRecord>,
  targetQuestionCount: number = 120
): number {
  const allRecords = Object.values(records);
  if (allRecords.length === 0) return 0;

  // 加重平均正答率（試行回数が多い問題ほど信頼度が高い）
  let weightedCorrect = 0;
  let totalWeight = 0;

  for (const r of allRecords) {
    const weight = Math.min(r.totalAttempts, 5); // 最大5回分の重み
    weightedCorrect += r.correctAttempts * weight;
    totalWeight += r.totalAttempts * weight;
  }

  const accuracyRate = totalWeight > 0 ? weightedCorrect / totalWeight : 0;

  // カバレッジ（何問カバーしたか）
  const coverage = Math.min(allRecords.length / targetQuestionCount, 1);

  // 合格期待値 = 正答率70% × カバレッジ30%
  const expectation = accuracyRate * 0.7 + coverage * 0.3;

  return Math.round(expectation * 100);
}

/**
 * 解答結果から獲得経験値を計算する
 */
export function calcExperience(isCorrect: boolean, difficulty: 1 | 2 | 3): number {
  const base = isCorrect ? 10 : 2;
  return base * difficulty;
}

/**
 * ステージ番号からキャラクター名を取得する
 */
export function getStageName(stage: CharacterStage): string {
  return STAGE_NAMES[stage] ?? "豆ころ";
}

/**
 * 経験値からキャラクターステージを取得する
 */
export function getStageFromExp(exp: number): CharacterStage {
  let stage: CharacterStage = 1;
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= STAGE_THRESHOLDS[i]) {
      stage = (i + 1) as CharacterStage;
      break;
    }
  }
  return Math.min(stage, 7) as CharacterStage;
}

/**
 * キャラクターステータスを更新する
 */
export function updateCharacter(
  current: CharacterStatus,
  gainedExp: number,
  passExpectation: number
): CharacterStatus {
  const newExp = current.experience + gainedExp;
  const newStage = getStageFromExp(newExp);
  const nextThreshold = STAGE_THRESHOLDS[newStage] ?? newExp;

  return {
    stage: newStage,
    name: STAGE_NAMES[newStage],
    experience: newExp,
    nextLevelExp: nextThreshold,
    passExpectation,
  };
}

/**
 * 初期キャラクターステータスを生成する
 */
export function createInitialCharacter(): CharacterStatus {
  return {
    stage: 1,
    name: STAGE_NAMES[1],
    experience: 0,
    nextLevelExp: STAGE_THRESHOLDS[1],
    passExpectation: 0,
  };
}

/**
 * 連続学習日数を計算する
 */
export function calcStreakDays(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;

  const sortedDates = sessions
    .map((s) => s.date.split("T")[0])
    .sort()
    .reverse();

  const today = new Date().toISOString().split("T")[0];
  let streak = 0;
  let current = today;

  for (const date of sortedDates) {
    if (date === current) {
      streak++;
      const prev = new Date(current);
      prev.setDate(prev.getDate() - 1);
      current = prev.toISOString().split("T")[0];
    } else if (date < current) {
      break;
    }
  }

  return streak;
}
