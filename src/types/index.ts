// ===== 問題データ =====
// 手引き（令和7年4月）の正式名称に準拠
export type QuestionCategory =
  | "医薬品に共通する特性と基本的な知識"  // 第1章 20問
  | "人体の働きと医薬品"                  // 第2章 20問
  | "主な医薬品とその作用"                // 第3章 40問
  | "薬事関係法規・制度"                  // 第4章 20問
  | "医薬品の適正使用・安全対策";         // 第5章 20問

// カテゴリごとの出題数（実試験準拠）
export const CATEGORY_QUESTION_COUNT: Record<QuestionCategory, number> = {
  "医薬品に共通する特性と基本的な知識": 20,
  "人体の働きと医薬品": 20,
  "主な医薬品とその作用": 40,
  "薬事関係法規・制度": 20,
  "医薬品の適正使用・安全対策": 20,
};

// 第N章の表示ラベル
export const CATEGORY_CHAPTER: Record<QuestionCategory, string> = {
  "医薬品に共通する特性と基本的な知識": "第1章",
  "人体の働きと医薬品": "第2章",
  "主な医薬品とその作用": "第3章",
  "薬事関係法規・制度": "第4章",
  "医薬品の適正使用・安全対策": "第5章",
};

// 文章（ア・イ・ウ・エ）の単位
export interface Statement {
  label: string; // "ア" | "イ" | "ウ" | "エ"
  text: string;
}

interface QuestionBase {
  id: string;
  category: QuestionCategory;
  year: number;
  prefecture?: string;
  text: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

// ① 単純選択型（現行形式・後方互換）
export interface SimpleSelectQuestion extends QuestionBase {
  type?: "simple_select";
  options: string[];
  correctIndex: number;
}

// ② 正誤組み合わせ型（最頻出）
//    seigo_options: 各選択肢について [ア,イ,ウ,エ] の 正(true)/誤(false) 配列
export interface SeigoCombinationQuestion extends QuestionBase {
  type: "seigo_combination";
  statements: Statement[];
  seigo_options: boolean[][];
  correctIndex: number;
}

// ③ 正しい組み合わせ型
//    combo_options: 各選択肢が「正しい文のラベル配列」 例: ["ア","ウ"]
export interface CorrectCombinationQuestion extends QuestionBase {
  type: "correct_combination";
  statements: Statement[];
  combo_options: string[][];
  correctIndex: number;
}

// ④ 語句の組み合わせ型（穴埋め）
//    passage の（ ａ ）（ ｂ ）… に入る字句の組み合わせを選ぶ。
//    word_options の各行は word_headers と同じ並びの字句。
export interface WordCombinationQuestion extends QuestionBase {
  type: "word_combination";
  passage: string;
  word_headers: string[];
  word_options: string[][];
  correctIndex: number;
}

export type Question =
  | SimpleSelectQuestion
  | SeigoCombinationQuestion
  | CorrectCombinationQuestion
  | WordCombinationQuestion;

// ===== 学習記録 =====
export interface QuestionRecord {
  questionId: string;
  // SRS (Spaced Repetition System)
  interval: number;       // 次回出題までの日数
  easeFactor: number;     // 難易度係数 (1.3〜2.5)
  nextReviewDate: string; // ISO日付文字列
  // 統計
  totalAttempts: number;
  correctAttempts: number;
  lastAttemptDate: string;
  lastResult: "correct" | "wrong";
}

export interface StudySession {
  date: string;           // ISO日付文字列
  questionsAnswered: number;
  correctCount: number;
  durationSeconds: number;
  categoriesStudied: QuestionCategory[];
}

// ===== キャラクター・進捗 =====
export type CharacterStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // 1=見習い → 7=メアリー侍 → 8=豆侍 → 9=ねこさん → 10=ココちゃん（最上位レア）

export interface CharacterStatus {
  stage: CharacterStage;
  name: string;           // キャラクターの呼称
  experience: number;     // 現在の経験値
  nextLevelExp: number;   // 次レベルまでの経験値
  passExpectation: number; // 合格期待値 0-100
}

// ===== アプリ全体の状態 =====
export interface UserProgress {
  questionRecords: Record<string, QuestionRecord>;
  sessions: StudySession[];
  character: CharacterStatus;
  totalStudyDays: number;
  bookmarkedIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ===== クイズセッション中の状態 =====
export interface QuizState {
  currentQuestion: Question;
  selectedIndex: number | null;
  isAnswered: boolean;
  isCorrect: boolean | null;
  sessionQuestions: Question[];
  currentIndex: number;
}

// ===== 模擬試験 =====
export interface MockExamSession {
  questions: Question[];
  answers: (number | null)[];  // インデックスと対応、未回答はnull
  startedAt: string;
  isFinished: boolean;
  /** 旧データ互換。制限時間は廃止したので新しいセッションには入らない */
  timeLimitSeconds?: number;
}

export interface MockExamResult {
  totalScore: number;          // 総得点
  totalPossible: number;       // 満点（=問題数）
  isPassed: boolean;
  categoryScores: Record<QuestionCategory, { score: number; possible: number }>;
  wrongQuestionIds: string[];
  durationSeconds: number;
  date: string;
}
