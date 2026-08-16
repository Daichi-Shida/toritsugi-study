"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Question, UserProgress, QuestionCategory, StudySession } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { loadProgress, saveProgress, addSession, toggleBookmark } from "@/lib/storage";
import { updateRecord, getDueQuestionIds } from "@/lib/srs";
import { calcExperience, calcPassExpectation, updateCharacter, PASS_EXPECTATION_TARGET } from "@/lib/score";
import QuizCard from "@/components/quiz/QuizCard";
import ResultSheet from "@/components/quiz/ResultSheet";
import SessionComplete from "@/components/quiz/SessionComplete";
import Confetti from "@/components/effects/Confetti";
import ExpFloater from "@/components/effects/ExpFloater";
import LevelUpModal from "@/components/effects/LevelUpModal";
import { ALL_QUESTIONS } from "@/data/questions";
import { shuffleQuestion } from "@/lib/shuffle";
import type { CharacterStage } from "@/types";

const SESSION_SIZE = 10;

type QuizMode = "normal" | "weak" | "chapter" | "bookmark";

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const isWeakMode = modeParam === "weak";
  const isBookmarkMode = modeParam === "bookmark";
  const chapterParam = searchParams.get("chapter") as QuestionCategory | null;

  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // 各問題に対する回答（未回答は null）。前へ/次へで参照して復元できるよう保持。
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionCategoriesRef = useRef<Set<QuestionCategory>>(new Set());
  const sessionSavedRef = useRef(false);

  const selectedIndex = answers[currentIndex] ?? null;
  const isAnswered = selectedIndex !== null;

  // 演出用
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [floatExp, setFloatExp] = useState<number | null>(null);
  const [floatKey, setFloatKey] = useState(0);
  const [levelUp, setLevelUp] = useState<{ from: CharacterStage; to: CharacterStage; toName: string } | null>(null);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
    sessionStartRef.current = Date.now();

    let questions: Question[];

    if (isBookmarkMode) {
      const bookmarkSet = new Set(p.bookmarkedIds);
      questions = ALL_QUESTIONS.filter((q) => bookmarkSet.has(q.id));
    } else {
      const pool = chapterParam
        ? ALL_QUESTIONS.filter((q) => q.category === chapterParam)
        : ALL_QUESTIONS;

      if (isWeakMode || chapterParam) {
        const dueIds = getDueQuestionIds(p.questionRecords);
        const dueSet = new Set(dueIds);

        const due = pool.filter((q) => dueSet.has(q.id));
        const weak = pool.filter((q) => {
          if (dueSet.has(q.id)) return false;
          const r = p.questionRecords[q.id];
          return r ? r.correctAttempts / r.totalAttempts < 0.6 : true;
        });
        const rest = pool.filter((q) => {
          if (dueSet.has(q.id)) return false;
          const r = p.questionRecords[q.id];
          return r ? r.correctAttempts / r.totalAttempts >= 0.6 : false;
        });
        questions = [...due, ...weak, ...rest];
      } else {
        const answered = new Set(Object.keys(p.questionRecords));
        const unanswered = pool.filter((q) => !answered.has(q.id));
        const answeredList = pool.filter((q) => answered.has(q.id));
        questions = [...unanswered, ...answeredList];
      }
    }

    if (questions.length === 0) {
      setQueue([]);
      setAnswers([]);
      setShowResultSheet(false);
      return;
    }

    const size = Math.min(SESSION_SIZE, questions.length);
    setQueue(questions.slice(0, size).map(shuffleQuestion));
    setAnswers(new Array(size).fill(null));
    setShowResultSheet(false);
    setCurrentIndex(0);
    setSessionCorrect(0);
  }, [isWeakMode, isBookmarkMode, chapterParam]);

  const currentQuestion = queue[currentIndex];

  const handleAnswer = useCallback(
    (index: number) => {
      if (isAnswered || !currentQuestion || !progress) return;
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = index;
        return next;
      });
      setShowResultSheet(true);

      const isCorrect = index === currentQuestion.correctIndex;
      if (isCorrect) setSessionCorrect((c) => c + 1);

      sessionCategoriesRef.current.add(currentQuestion.category);

      const existing = progress.questionRecords[currentQuestion.id] ?? null;
      const newRecord = updateRecord(existing, currentQuestion.id, isCorrect);
      const exp = calcExperience(isCorrect, currentQuestion.difficulty);
      const newRecords = { ...progress.questionRecords, [currentQuestion.id]: newRecord };
      const passExp = calcPassExpectation(newRecords, PASS_EXPECTATION_TARGET);
      const newCharacter = updateCharacter(progress.character, exp, passExp);

      const newProgress: UserProgress = { ...progress, questionRecords: newRecords, character: newCharacter };
      setProgress(newProgress);
      saveProgress(newProgress);

      // ── 演出 ──
      if (isCorrect) {
        setShowConfetti(true);
        setConfettiKey((k) => k + 1);
        setTimeout(() => setShowConfetti(false), 2200);
      }
      if (exp > 0) {
        setFloatExp(exp);
        setFloatKey((k) => k + 1);
        setTimeout(() => setFloatExp(null), 1600);
      }
      // レベルアップ検知
      if (newCharacter.stage > progress.character.stage) {
        setLevelUp({
          from: progress.character.stage,
          to: newCharacter.stage,
          toName: newCharacter.name,
        });
      }
    },
    [isAnswered, currentQuestion, progress, currentIndex]
  );

  const finishSession = useCallback(() => {
    if (sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    const current = loadProgress();
    const session: StudySession = {
      date: new Date().toISOString(),
      questionsAnswered: queue.length,
      correctCount: sessionCorrect,
      durationSeconds: Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000)),
      categoriesStudied: Array.from(sessionCategoriesRef.current),
    };
    saveProgress(addSession(current, session));
  }, [queue.length, sessionCorrect]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= queue.length) {
      finishSession();
      setIsComplete(true);
    } else {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setShowResultSheet(answers[nextIdx] !== null);
    }
  }, [currentIndex, queue.length, finishSession, answers]);

  const handlePrev = useCallback(() => {
    if (currentIndex === 0) return;
    const prevIdx = currentIndex - 1;
    setCurrentIndex(prevIdx);
    setShowResultSheet(answers[prevIdx] !== null);
  }, [currentIndex, answers]);

  const handleToggleBookmark = useCallback(() => {
    if (!progress || !currentQuestion) return;
    const updated = toggleBookmark(progress, currentQuestion.id);
    setProgress(updated);
    saveProgress(updated);
  }, [progress, currentQuestion]);

  if (isComplete && progress) {
    return (
      <SessionComplete
        correct={sessionCorrect}
        total={queue.length}
        character={progress.character}
        backHref={chapterParam ? "/chapters" : "/"}
        backLabel={chapterParam ? "章一覧に戻る" : "ホームに戻る"}
      />
    );
  }

  // ブックマーク0問の特殊ケース
  if (isBookmarkMode && progress && queue.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6 items-center text-center">
        <p className="text-5xl mt-8">⭐</p>
        <h2 className="text-lg font-bold text-gray-800">見直しリストは空です</h2>
        <p className="text-sm text-gray-500">問題を解いている時に⭐ボタンで気になる問題を保存できます</p>
        <button onClick={() => router.push("/")} className="btn-secondary mt-4">ホームに戻る</button>
      </div>
    );
  }

  if (!currentQuestion || !progress) {
    return <div className="flex items-center justify-center h-64"><p className="text-mocha-400 text-sm tracking-wide">読み込み中...</p></div>;
  }

  const modeLabel = isBookmarkMode
    ? "見直しリスト ⭐"
    : chapterParam
    ? `${CATEGORY_CHAPTER[chapterParam]} ${chapterParam}`
    : isWeakMode ? "弱点集中モード" : "学習モード";

  const isBookmarked = progress.bookmarkedIds.includes(currentQuestion.id);

  return (
    <div
      className="flex flex-col gap-3 px-4 pt-2 h-[100dvh]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/70 flex items-center justify-center text-mocha-500 hover:text-mocha-800 transition-colors shrink-0" aria-label="戻る">
          ←
        </button>
        <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase truncate flex-1">{modeLabel}</p>
        <button
          onClick={handleToggleBookmark}
          className={`shrink-0 w-9 h-9 rounded-full backdrop-blur-md border transition-all active:scale-90 flex items-center justify-center ${isBookmarked ? "bg-gradient-to-br from-primary-200 to-primary-300 border-primary-400 text-primary-900" : "bg-white/60 border-white/70 text-mocha-300 hover:text-primary-500"}`}
          aria-label={isBookmarked ? "見直しリストから外す" : "見直しリストに追加"}
        >
          {isBookmarked ? "★" : "☆"}
        </button>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="前の問題に戻る"
          className="shrink-0 text-[11px] font-bold tracking-[0.15em] uppercase text-mocha-500 hover:text-mocha-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-2 py-1"
        >
          ← 前へ
        </button>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-cream-100/80 border border-cream-200">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-300 via-primary-400 to-primary-600 rounded-full progress-shine"
            initial={false}
            animate={{ width: `${(currentIndex / queue.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
        <span className="text-xs text-mocha-500 whitespace-nowrap font-bold tracking-wide">{currentIndex + 1} / {queue.length}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin -mx-1 px-1">
        <QuizCard question={currentQuestion} selectedIndex={selectedIndex} isAnswered={isAnswered} onAnswer={handleAnswer} />
      </div>

      {/* 解説を閉じている時のみ表示する『解説を見る』フローティングボタン */}
      {isAnswered && !showResultSheet && (
        <motion.button
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          onClick={() => setShowResultSheet(true)}
          className="fixed bottom-5 right-5 z-30 rounded-full px-5 py-3 text-sm font-bold text-white shadow-glow flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, #e87063 0%, #d04a3d 100%)" }}
        >
          解説を見る ↑
        </motion.button>
      )}

      <ResultSheet
        show={isAnswered && showResultSheet}
        question={currentQuestion}
        selectedIndex={selectedIndex ?? 0}
        onNext={handleNext}
        onClose={() => setShowResultSheet(false)}
        isLast={currentIndex + 1 >= queue.length}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
        characterStage={progress.character.stage}
      />

      {/* ── 演出オーバーレイ ── */}
      <Confetti show={showConfetti} count={32} tone={progress.character.stage >= 6 ? "rainbow" : "gold"} />
      <ExpFloater exp={floatExp} triggerKey={floatKey} />
      <LevelUpModal
        show={!!levelUp}
        fromStage={levelUp?.from ?? 1}
        toStage={levelUp?.to ?? 1}
        toName={levelUp?.toName ?? ""}
        onClose={() => setLevelUp(null)}
      />
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-gray-500">読み込み中...</div>}>
      <QuizContent />
    </Suspense>
  );
}
