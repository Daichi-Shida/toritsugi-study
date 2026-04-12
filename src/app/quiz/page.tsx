"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Question, UserProgress, QuestionCategory } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import { loadProgress, saveProgress } from "@/lib/storage";
import { updateRecord, getDueQuestionIds } from "@/lib/srs";
import { calcExperience, calcPassExpectation, updateCharacter } from "@/lib/score";
import QuizCard from "@/components/quiz/QuizCard";
import ResultScreen from "@/components/quiz/ResultScreen";
import SessionComplete from "@/components/quiz/SessionComplete";

import allQuestions from "@/data/questions/all.json";
import seigoQuestions from "@/data/questions/seigo_sample.json";
import qualityQuestions from "@/data/questions/quality_questions.json";
import plumeriaQuestions from "@/data/questions/plumeria_questions.json";

const ALL_QUESTIONS = [...allQuestions, ...seigoQuestions, ...qualityQuestions, ...plumeriaQuestions] as Question[];
const SESSION_SIZE = 10;

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWeakMode = searchParams.get("mode") === "weak";
  const chapterParam = searchParams.get("chapter") as QuestionCategory | null;

  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [queue, setQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);

    // 問題プール：章指定があればフィルタ
    const pool = chapterParam
      ? ALL_QUESTIONS.filter((q) => q.category === chapterParam)
      : ALL_QUESTIONS;

    let questions: Question[];

    if (isWeakMode || chapterParam) {
      // 弱点モード or 章別モード：間違いやすい問題を優先
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
      // 通常モード：未解答優先
      const answered = new Set(Object.keys(p.questionRecords));
      const unanswered = pool.filter((q) => !answered.has(q.id));
      const answeredList = pool.filter((q) => answered.has(q.id));
      questions = [...unanswered, ...answeredList];
    }

    // 問題が足りない場合は繰り返す
    const size = Math.min(SESSION_SIZE, Math.max(questions.length, 1));
    const padded: Question[] = [];
    for (let i = 0; i < size; i++) padded.push(questions[i % questions.length]);
    setQueue(padded);
  }, [isWeakMode, chapterParam]);

  const currentQuestion = queue[currentIndex];

  const handleAnswer = useCallback(
    (index: number) => {
      if (isAnswered || !currentQuestion || !progress) return;
      setSelectedIndex(index);
      setIsAnswered(true);

      const isCorrect = index === currentQuestion.correctIndex;
      if (isCorrect) setSessionCorrect((c) => c + 1);

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

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= queue.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setIsAnswered(false);
    }
  }, [currentIndex, queue.length]);

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

  if (!currentQuestion) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">読み込み中...</p></div>;
  }

  // モードラベル
  const modeLabel = chapterParam
    ? `${CATEGORY_CHAPTER[chapterParam]} ${chapterParam}`
    : isWeakMode ? "弱点集中モード" : "学習モード";

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 text-lg shrink-0">←</button>
        <p className="text-xs font-medium text-primary-600 truncate">{modeLabel}</p>
      </div>

      {/* 進捗バー */}
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
        <ResultScreen question={currentQuestion} selectedIndex={selectedIndex!} onNext={handleNext} isLast={currentIndex + 1 >= queue.length} />
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
