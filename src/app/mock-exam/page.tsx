"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MockExamSession, Question } from "@/types";
import {
  buildMockExamQuestions,
  buildQuickMockExamQuestions,
  startMockExam,
  recordAnswer,
  scoreMockExam,
  calcRemainingSeconds,
  formatTime,
  loadMockExamSession,
  clearMockExamSession,
  saveMockExamSession,
} from "@/lib/mockExam";
import { loadProgress, saveProgress } from "@/lib/storage";
import { updateRecord } from "@/lib/srs";
import allQuestions from "@/data/questions/all.json";
import seigoQuestions from "@/data/questions/seigo_sample.json";
import qualityQuestions from "@/data/questions/quality_questions.json";
import plumeriaQuestions from "@/data/questions/plumeria_questions.json";
import QuestionNavigator from "@/components/mock/QuestionNavigator";
import type { SimpleSelectQuestion, SeigoCombinationQuestion, CorrectCombinationQuestion } from "@/types";

const ALL_QUESTIONS = [...allQuestions, ...seigoQuestions, ...qualityQuestions, ...plumeriaQuestions] as Question[];

type Phase = "intro" | "exam" | "confirm-submit";

export default function MockExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [session, setSession] = useState<MockExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(7200);
  const [showNavigator, setShowNavigator] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 中断セッションがある場合はintroで「再開する」ボタンを表示するのみ（自動切り替えしない）

  // タイマー
  useEffect(() => {
    if (phase !== "exam" || !session) return;
    timerRef.current = setInterval(() => {
      const remaining = calcRemainingSeconds(session);
      setRemainingSeconds(remaining);
      if (remaining <= 0) {
        handleSubmit(session);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session?.startedAt]);

  const handleStart = useCallback((quick = false) => {
    const questions = quick
      ? buildQuickMockExamQuestions(ALL_QUESTIONS)
      : buildMockExamQuestions(ALL_QUESTIONS);
    const newSession = startMockExam(questions, quick);
    setSession(newSession);
    setRemainingSeconds(newSession.timeLimitSeconds);
    setCurrentIndex(0);
    setPhase("exam");
  }, []);

  const handleAnswer = useCallback((answerIndex: number) => {
    if (!session) return;
    const updated = recordAnswer(session, currentIndex, answerIndex);
    setSession(updated);
  }, [session, currentIndex]);

  const handleSubmit = useCallback((s?: MockExamSession) => {
    const target = s ?? session;
    if (!target) return;
    if (timerRef.current) clearInterval(timerRef.current);

    // SRS記録に反映
    const progress = loadProgress();
    let newRecords = { ...progress.questionRecords };
    target.questions.forEach((q, i) => {
      const isCorrect = target.answers[i] === q.correctIndex;
      const existing = newRecords[q.id] ?? null;
      newRecords[q.id] = updateRecord(existing, q.id, isCorrect);
    });
    saveProgress({ ...progress, questionRecords: newRecords });

    // セッションを終了済みにして保存
    const finished = { ...target, isFinished: true };
    saveMockExamSession(finished);

    // 結果をクエリパラメータ経由で渡す（実際はlocalStorageから読む）
    router.push("/mock-exam/result");
  }, [session, router]);

  // ===== 開始前画面 =====
  if (phase === "intro") {
    const resumable = typeof window !== "undefined" && loadMockExamSession() !== null;
    return (
      <div className="flex flex-col gap-5 p-4 pb-8">
        <header className="pt-4">
          <h1 className="text-xl font-bold text-primary-700">📝 模擬試験</h1>
          <p className="text-sm text-gray-500 mt-1">本番と同じ形式で実力を確認しよう</p>
        </header>

        {/* クイック模擬試験 */}
        <div className="card border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚡</span>
            <h2 className="font-bold text-orange-800">クイック模擬試験</h2>
          </div>
          <ul className="text-sm text-orange-700 space-y-1 mb-3">
            <li className="flex gap-2"><span>📄</span><span>30問（各章1/4）</span></li>
            <li className="flex gap-2"><span>⏱️</span><span>制限時間：30分</span></li>
            <li className="flex gap-2"><span>✅</span><span>合格基準：同じ（総合70%・各章35%）</span></li>
          </ul>
          <div className="text-xs text-orange-600 mb-3">
            <div className="flex justify-between"><span>第1章・第2章・第4章・第5章</span><span className="font-bold">各5問</span></div>
            <div className="flex justify-between"><span>第3章</span><span className="font-bold">10問</span></div>
          </div>
          <button onClick={() => handleStart(true)} className="w-full rounded-2xl bg-orange-500 text-white font-bold py-3 hover:bg-orange-600 active:scale-95 transition-all">
            クイック試験を開始する ⚡
          </button>
        </div>

        {/* 本番模擬試験 */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📝</span>
            <h2 className="font-bold text-gray-800">本番模擬試験</h2>
          </div>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex gap-2"><span>📄</span><span>問題数：{ALL_QUESTIONS.length >= 120 ? "120" : ALL_QUESTIONS.length}問（5章構成）</span></li>
            <li className="flex gap-2"><span>⏱️</span><span>制限時間：120分</span></li>
            <li className="flex gap-2"><span>✅</span><span>合格基準：総合70%以上 かつ 各章35%以上</span></li>
            <li className="flex gap-2"><span>🔕</span><span>試験中は正解・不正解は表示されません</span></li>
            <li className="flex gap-2"><span>💾</span><span>途中でアプリを閉じても再開できます</span></li>
          </ul>
          <div className="text-xs text-primary-700 space-y-1 bg-primary-50 rounded-2xl p-3">
            <div className="flex justify-between"><span>第1章・第2章・第4章・第5章</span><span className="font-bold">各20問</span></div>
            <div className="flex justify-between"><span>第3章</span><span className="font-bold">40問</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={() => handleStart(false)} className="btn-primary w-full text-lg py-4">
            本番試験を開始する →
          </button>
          {resumable && (
            <button
              onClick={() => {
                const saved = loadMockExamSession();
                if (saved) { setSession(saved); setRemainingSeconds(calcRemainingSeconds(saved)); setPhase("exam"); }
              }}
              className="btn-secondary w-full"
            >
              前回の試験を再開する
            </button>
          )}
          <button onClick={() => router.push("/")} className="btn-secondary w-full">
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ===== 提出確認 =====
  if (phase === "confirm-submit") {
    const unanswered = session?.answers.filter((a) => a === null).length ?? 0;
    return (
      <div className="flex flex-col gap-5 p-4 items-center justify-center min-h-screen">
        <div className="card w-full text-center">
          <p className="text-2xl mb-3">📋</p>
          <h2 className="text-lg font-bold mb-2">提出しますか？</h2>
          {unanswered > 0 && (
            <p className="text-amber-600 text-sm mb-3">⚠️ 未回答が{unanswered}問あります</p>
          )}
          <p className="text-gray-500 text-sm mb-4">提出後は変更できません</p>
          <div className="flex gap-3">
            <button onClick={() => setPhase("exam")} className="btn-secondary flex-1">戻る</button>
            <button onClick={() => handleSubmit()} className="btn-primary flex-1">提出する</button>
          </div>
        </div>
      </div>
    );
  }

  // ===== 試験中 =====
  if (!session) return null;
  const q = session.questions[currentIndex];
  const selectedAnswer = session.answers[currentIndex];
  const answeredCount = session.answers.filter((a) => a !== null).length;
  const isTimeWarning = remainingSeconds < 600; // 残り10分

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isTimeWarning ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
        <button
          onClick={() => {
            if (confirm("試験を中断してメニューに戻りますか？\n（進捗は保存されています）")) {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("intro");
            }
          }}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
        >
          ✕ 中断
        </button>
        <p className={`text-lg font-bold font-mono tabular-nums ${isTimeWarning ? "text-red-600" : "text-gray-800"}`}>
          {isTimeWarning && "⏰ "}残り {formatTime(remainingSeconds)}
        </p>
        <div className="text-right text-xs text-gray-500">
          <p>回答済 {answeredCount}/{session.questions.length}</p>
        </div>
      </div>

      {/* 問題エリア（スクロール可） */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-primary-100 text-primary-700 rounded-full px-3 py-1 font-medium">
            {q.category.slice(0, 4)}...
          </span>
          <span className="text-sm text-gray-500">問題 {currentIndex + 1} / {session.questions.length}</span>
        </div>

        <p className="text-base font-medium leading-relaxed text-gray-800 mb-4">{q.text}</p>

        {/* 文章リスト（正誤・組み合わせ型） */}
        {(q.type === "seigo_combination" || q.type === "correct_combination") && (
          <div className="flex flex-col gap-2 bg-gray-50 rounded-2xl p-3 mb-3">
            {(q as SeigoCombinationQuestion | CorrectCombinationQuestion).statements.map((s) => (
              <div key={s.label} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                <span className="font-bold text-primary-500 shrink-0">{s.label}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* 選択肢 */}
        {(!q.type || q.type === "simple_select") && (() => {
          const sq = q as SimpleSelectQuestion;
          return (
            <div className="flex flex-col gap-2">
              {sq.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`w-full text-left rounded-2xl border-2 px-4 py-3 font-medium transition-all duration-100 text-sm ${
                    selectedAnswer === i
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-gray-400 mr-2">{["A", "B", "C", "D"][i]}.</span>
                  {option}
                </button>
              ))}
            </div>
          );
        })()}

        {q.type === "seigo_combination" && (() => {
          const sq = q as SeigoCombinationQuestion;
          const labels = sq.statements.map((s) => s.label);
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center pl-10 gap-0">
                {labels.map((label) => (
                  <span key={label} className="w-10 text-center text-xs font-bold text-primary-500">{label}</span>
                ))}
              </div>
              {sq.seigo_options.map((combo, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`flex items-center w-full rounded-2xl border-2 px-4 py-3 font-medium transition-all duration-100 text-sm ${
                    selectedAnswer === i
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-gray-400 w-8 shrink-0">{i + 1}.</span>
                  <div className="flex">
                    {combo.map((isSeigo, j) => (
                      <span key={j} className="w-10 text-center">{isSeigo ? "正" : "誤"}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          );
        })()}

        {q.type === "correct_combination" && (() => {
          const sq = q as CorrectCombinationQuestion;
          return (
            <div className="flex flex-col gap-2">
              {sq.combo_options.map((pair, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`flex items-center w-full rounded-2xl border-2 px-4 py-3 font-medium transition-all duration-100 text-sm ${
                    selectedAnswer === i
                      ? "border-primary-500 bg-primary-50 text-primary-800"
                      : "border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-gray-400 mr-3">{i + 1}.</span>
                  <span>{pair.join("・")}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 下部ナビゲーション */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary px-4 py-2 text-sm disabled:opacity-30"
        >← 前へ</button>

        <button
          onClick={() => setShowNavigator(true)}
          className="flex-1 text-sm text-center text-primary-600 font-medium py-2"
        >
          問題一覧
        </button>

        {currentIndex < session.questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(session.questions.length - 1, i + 1))}
            className="btn-secondary px-4 py-2 text-sm"
          >次へ →</button>
        ) : (
          <button
            onClick={() => setPhase("confirm-submit")}
            className="btn-primary px-4 py-2 text-sm"
          >提出する</button>
        )}
      </div>

      {/* 問題一覧モーダル */}
      {showNavigator && (
        <QuestionNavigator
          total={session.questions.length}
          answers={session.answers}
          currentIndex={currentIndex}
          onSelect={(i) => { setCurrentIndex(i); setShowNavigator(false); }}
          onClose={() => setShowNavigator(false)}
          onSubmit={() => { setShowNavigator(false); setPhase("confirm-submit"); }}
        />
      )}
    </div>
  );
}
