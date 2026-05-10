"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Question, UserProgress, QuestionCategory, StudySession } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { loadProgress, saveProgress, addSession, toggleBookmark } from "@/lib/storage";
import { updateRecord, getDueQuestionIds } from "@/lib/srs";
import { calcExperience, calcPassExpectation, updateCharacter } from "@/lib/score";
import QuizCard from "@/components/quiz/QuizCard";
import ResultScreen from "@/components/quiz/ResultScreen";
import SessionComplete from "@/components/quiz/SessionComplete";
import { ALL_QUESTIONS } from "@/data/questions";

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const sessionStartRef = useRef<number>(Date.now());
  const sessionCategoriesRef = useRef<Set<QuestionCategory>>(new Set());
  const sessionSavedRef = useRef(false);

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
      return;
    }

    const size = Math.min(SESSION_SIZE, questions.length);
    setQueue(questions.slice(0, size));
  }, [isWeakMode, isBookmarkMode, chapterParam]);

  const currentQuestion = queue[currentIndex];

  const handleAnswer = useCallback(
    (index: number) => {
      if (isAnswered || !currentQuestion || !progress) return;
      setSelectedIndex(index);
      setIsAnswered(true);

      const isCorrect = index === currentQuestion.correctIndex;
      if (isCorrect) setSessionCorrect((c) => c + 1);

      sessionCategoriesRef.current.add(currentQuestion.category);

      const existing = progress.questionRecords[currentQuestion.id] ?? null;
      const newRecord = updateRecord(existing, currentQuestion.id, isCorrect);
      const exp = calcExperience(isCorrect, currentQuestion.difficulty);
      const newRecords = { ...progress.questionRecords, [currentQuestion.id]: newRecord };
      const passExp = calcPassExpectation(newRecords, ALL_QUESTIONS.length);
      const newCharacter = updateCharacter(progress.character, exp, passExp);

      const newProgress: UserProgress = { ...progress, questionRecords: newRecords, character: newCharacter };
      setProgress(newProgress);
      saveProgress(newProgress);
    },
    [isAnswered, currentQuestion, progress]
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
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setIsAnswered(false);
    }
  }, [currentIndex, queue.length, finishSession]);

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
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">読み込み中...</p></div>;
  }

  const modeLabel = isBookmarkMode
    ? "見直しリスト ⭐"
    : chapterParam
    ? `${CATEGORY_CHAPTER[chapterParam]} ${chapterParam}`
    : isWeakMode ? "弱点集中モード" : "学習モード";

  const isBookmarked = progress.bookmarkedIds.includes(currentQuestion.id);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 text-lg shrink-0">←</button>
        <p className="text-xs font-medium text-primary-600 truncate flex-1">{modeLabel}</p>
        <button
          onClick={handleToggleBookmark}
          className={`shrink-0 text-xl transition-transform active:scale-90 ${isBookmarked ? "text-amber-400" : "text-gray-300 hover:text-amber-300"}`}
          aria-label={isBookmarked ? "見直しリストから外す" : "見直しリストに追加"}
        >
          {isBookmarked ? "★" : "☆"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-400 rounded-full transition-all duration-300"
            style={{ width: `${(currentIndex / queue.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">{currentIndex + 1} / {queue.length}</span>
      </div>

      <QuizCard question={currentQuestion} selectedIndex={selectedIndex} isAnswered={isAnswered} onAnswer={handleAnswer} />

      {isAnswered && (
        <ResultScreen
          question={currentQuestion}
          selectedIndex={selectedIndex!}
          onNext={handleNext}
          isLast={currentIndex + 1 >= queue.length}
          isBookmarked={isBookmarked}
          onToggleBookmark={handleToggleBookmark}
        />
      )}
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
