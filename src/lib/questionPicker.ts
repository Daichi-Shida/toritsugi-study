/**
 * 出題する問題を選ぶロジック
 *
 * 章別学習・弱点集中は「間違えた問題を優先」しつつ、毎回同じ問題が同じ順で
 * 並ばないようにする。
 * 以前は due → weak → rest をこの順に並べて先頭10問を取るだけだったので、
 *   ・並び順が問題プールの並び（令和7年度東京→令和6年度東京…）のまま固定
 *   ・間違えた問題は interval=0 でずっと復習期限切れのまま先頭に残る
 * となり、章を開くたびにまったく同じ10問が同じ順で出ていた。
 *
 * ここでは
 *   1. 問題を4つの層（復習期限切れ / 苦手 / 未学習 / 定着）に分ける
 *   2. 層ごとに割当数を決め、層の中はシャッフルして引く
 *   3. 直近に出した問題は層の後ろに回す（プールが小さい時は出るが優先度は下げる）
 *   4. 似た問題は同じセッションに入れない
 *      （過去問は年度・ブロックをまたいで同じ論点がほぼ同じ文面で出る）
 * の順で選ぶ。学習記録（QuestionRecord）には一切手を入れないので、
 * 章別正答率やキャラクターの成長には影響しない。
 */

import type { Question, QuestionRecord } from "@/types";

/** 正答率がこれ未満なら「苦手」とみなす */
const WEAK_ACCURACY = 0.6;

/**
 * 文字3-gramのJaccard係数がこれを超えたら「似た問題」とみなす。
 * 実際の出題プールで全ペアを測った結果に合わせた値：
 *   無関係な組み合わせは中央値0.05・99%点0.16に対し、
 *   年度違いの同一論点（例：解熱鎮痛薬の同じ設問）は0.6〜0.77。
 *   0.40 で弾かれるのは全ペアの0.07〜0.52%だけなので、
 *   選べる問題が枯れる心配はない。
 */
const SIMILARITY_LIMIT = 0.4;

export type Tier = "due" | "weak" | "fresh" | "known";

/** 何を優先して出すか。weak=苦手優先（章別・弱点）、fresh=新しい問題優先（通常学習） */
export type Focus = "weak" | "fresh";

/** 層ごとの割当比率（セッションの問題数に対する割合） */
const QUOTA: Record<Focus, Record<Tier, number>> = {
  weak: { due: 0.4, weak: 0.3, fresh: 0.2, known: 0.1 },
  fresh: { due: 0.2, weak: 0.1, fresh: 0.6, known: 0.1 },
};

/** 割当を配る順番（先に配った層ほど良い問題が残っているうちに選べる） */
const QUOTA_ORDER: Record<Focus, Tier[]> = {
  weak: ["due", "weak", "fresh", "known"],
  fresh: ["fresh", "due", "weak", "known"],
};

/**
 * 割当が埋まらなかった分を補充する順番。
 * 復習期限切れ（due）はあえて最後に回す。復習対象が10問しかない状態で
 * ここを最優先にすると、毎回その10問ばかりが並んでしまうため。
 */
const SHORTFALL_ORDER: Record<Focus, Tier[]> = {
  weak: ["weak", "fresh", "known", "due"],
  fresh: ["fresh", "weak", "known", "due"],
};

/** Fisher–Yates シャッフル。sort(() => Math.random() - 0.5) は偏るので使わない */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function startOfTodayMs(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

/** 問題を4つの層に振り分ける */
export function classifyQuestion(
  question: Question,
  records: Record<string, QuestionRecord>,
  todayMs: number
): Tier {
  const record = records[question.id];
  if (!record || record.totalAttempts <= 0) return "fresh";
  if (new Date(record.nextReviewDate).getTime() <= todayMs) return "due";
  return record.correctAttempts / record.totalAttempts < WEAK_ACCURACY ? "weak" : "known";
}

// ===== 似た問題の検出 =====

/** 問題文だけでは「正しい組合せはどれか」で似てしまうので、選択肢や設問文も含める */
function contentOf(question: Question): string {
  const parts: string[] = [question.text];
  if ("statements" in question && Array.isArray(question.statements)) {
    parts.push(...question.statements.map((s) => s.text));
  }
  if ("passage" in question && question.passage) parts.push(question.passage);
  if ("options" in question && Array.isArray(question.options)) parts.push(...question.options);
  return parts.join("");
}

const gramCache = new Map<string, Set<string>>();

function gramsOf(question: Question): Set<string> {
  const cached = gramCache.get(question.id);
  if (cached) return cached;
  const text = contentOf(question).replace(/[\s、。，．・（）()「」『』]/g, "");
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= text.length; i++) grams.add(text.slice(i, i + 3));
  gramCache.set(question.id, grams);
  return grams;
}

/** 2問の文面の近さ（0〜1）。1に近いほど同じことを聞いている */
export function similarity(a: Question, b: Question): number {
  const gramsA = gramsOf(a);
  const gramsB = gramsOf(b);
  if (gramsA.size === 0 || gramsB.size === 0) return 0;
  const [small, large] = gramsA.size <= gramsB.size ? [gramsA, gramsB] : [gramsB, gramsA];
  let intersection = 0;
  for (const gram of small) if (large.has(gram)) intersection++;
  return intersection / (gramsA.size + gramsB.size - intersection);
}

function isTooSimilar(question: Question, picked: Question[]): boolean {
  return picked.some((p) => similarity(p, question) > SIMILARITY_LIMIT);
}

/**
 * 候補からランダムに count 問選ぶ。すでに選んだ問題（avoid + 選択中）と
 * 似ている問題は後回しにし、数が足りない時だけ使う。
 */
export function pickDiverse(candidates: Question[], count: number, avoid: Question[] = []): Question[] {
  const picked: Question[] = [];
  const spare: Question[] = [];

  for (const question of shuffle(candidates)) {
    if (picked.length >= count) break;
    if (isTooSimilar(question, avoid) || isTooSimilar(question, picked)) {
      spare.push(question);
      continue;
    }
    picked.push(question);
  }
  for (const question of spare) {
    if (picked.length >= count) break;
    picked.push(question);
  }
  return picked;
}

// ===== 学習セッションの出題 =====

export interface StudyQueueOptions {
  /** 出題対象（章で絞ったあとの問題） */
  pool: Question[];
  records: Record<string, QuestionRecord>;
  /** 出したい問題数 */
  size: number;
  /** 直近に出した問題ID（新しい順）。ここに入っている問題は後回しにする */
  recentIds?: string[];
  focus?: Focus;
}

export function buildStudyQueue({
  pool,
  records,
  size,
  recentIds = [],
  focus = "weak",
}: StudyQueueOptions): Question[] {
  if (pool.length === 0) return [];

  const target = Math.min(size, pool.length);
  const todayMs = startOfTodayMs();
  const recent = new Set(recentIds);

  // 層に分け、層の中はシャッフル。直近に出した問題は層の後ろへ
  const tiers: Record<Tier, Question[]> = { due: [], weak: [], fresh: [], known: [] };
  for (const question of pool) {
    tiers[classifyQuestion(question, records, todayMs)].push(question);
  }
  for (const tier of Object.keys(tiers) as Tier[]) {
    const notRecent = shuffle(tiers[tier].filter((q) => !recent.has(q.id)));
    const seenRecently = shuffle(tiers[tier].filter((q) => recent.has(q.id)));
    tiers[tier] = [...notRecent, ...seenRecently];
  }

  const picked: Question[] = [];
  const spare: Question[] = [];

  const take = (tier: Tier, limit: number) => {
    let taken = 0;
    while (taken < limit && picked.length < target && tiers[tier].length > 0) {
      const question = tiers[tier].shift() as Question;
      if (isTooSimilar(question, picked)) {
        spare.push(question);
        continue;
      }
      picked.push(question);
      taken++;
    }
  };

  // 1周目：層ごとの割当分だけ引く
  for (const tier of QUOTA_ORDER[focus]) {
    take(tier, Math.round(target * QUOTA[focus][tier]));
  }
  // 2周目：割当が埋まらなかった分を補う
  for (const tier of SHORTFALL_ORDER[focus]) {
    take(tier, target);
  }
  // 3周目：似ているとして外した問題で埋める（プールが小さい時のみ効く）
  for (const question of spare) {
    if (picked.length >= target) break;
    picked.push(question);
  }

  // 層の順に並んだままだと「復習→未学習」の並びが見えてしまうので最後に混ぜる
  return shuffle(picked);
}
