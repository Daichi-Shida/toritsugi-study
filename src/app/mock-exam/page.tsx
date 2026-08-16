"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { MockExamSession, StudySession, QuestionCategory } from "@/types";
import { CATEGORY_CHAPTER } from "@/types";
import {
  buildMockExamQuestions,
  buildQuickMockExamQuestions,
  startMockExam,
  recordAnswer,
  calcElapsedSeconds,
  formatTime,
  loadMockExamSession,
  saveMockExamSession,
} from "@/lib/mockExam";
import { loadProgress, saveProgress, addSession } from "@/lib/storage";
import { updateRecord } from "@/lib/srs";
import { ALL_QUESTIONS } from "@/data/questions";
import QuestionNavigator from "@/components/mock/QuestionNavigator";
import type { SimpleSelectQuestion, SeigoCombinationQuestion, CorrectCombinationQuestion, WordCombinationQuestion } from "@/types";

type Phase = "intro" | "exam" | "confirm-submit";

export default function MockExamPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [session, setSession] = useState<MockExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [resumable, setResumable] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 中断セッションがある場合はintroで「再開する」ボタンを表示するのみ（自動切り替えしない）
  // localStorage はサーバ側に無いので、描画中ではなくマウント後に判定する
  // （描画中に読むとサーバとクライアントで結果が食い違い、ハイドレーションが壊れる）
  useEffect(() => {
    if (phase === "intro") setResumable(loadMockExamSession() !== null);
  }, [phase]);

  // 経過時間の計測（制限時間はないので、時間切れによる自動提出はしない）
  useEffect(() => {
    if (phase !== "exam" || !session) return;
    setElapsedSeconds(calcElapsedSeconds(session));
    timerRef.current = setInterval(() => {
      setElapsedSeconds(calcElapsedSeconds(session));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session?.startedAt]);

  const handleStart = useCallback((quick = false) => {
    const questions = quick
      ? buildQuickMockExamQuestions(ALL_QUESTIONS)
      : buildMockExamQuestions(ALL_QUESTIONS);
    const newSession = startMockExam(questions);
    setSession(newSession);
    setElapsedSeconds(0);
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
    const newRecords = { ...progress.questionRecords };
    let correctCount = 0;
    const categoriesSet = new Set<QuestionCategory>();
    target.questions.forEach((q, i) => {
      const isCorrect = target.answers[i] === q.correctIndex;
      if (isCorrect) correctCount++;
      categoriesSet.add(q.category);
      const existing = newRecords[q.id] ?? null;
      newRecords[q.id] = updateRecord(existing, q.id, isCorrect);
    });

    const elapsedSec = Math.max(
      1,
      Math.floor((Date.now() - new Date(target.startedAt).getTime()) / 1000)
    );
    const studySession: StudySession = {
      date: new Date().toISOString(),
      questionsAnswered: target.questions.length,
      correctCount,
      durationSeconds: elapsedSec,
      categoriesStudied: Array.from(categoriesSet),
    };
    saveProgress(addSession({ ...progress, questionRecords: newRecords }, studySession));

    // セッションを終了済みにして保存
    const finished = { ...target, isFinished: true };
    saveMockExamSession(finished);

    router.push("/mock-exam/result");
  }, [session, router]);

  // ===== 開始前画面 =====
  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-5 p-5 pb-10">
        <header className="pt-5">
          <p className="text-[10px] font-bold tracking-[0.3em] text-primary-600 uppercase">Mock Exam</p>
          <h1 className="headline text-2xl font-bold text-mocha-800">模擬試験</h1>
          <p className="text-xs text-mocha-500 mt-1.5 tracking-wide">本番と同じ形式で実力を確認しよう</p>
        </header>

        {/* クイック模擬試験 */}
        <div className="card relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-amber-200 to-rose-300 opacity-30 blur-2xl" />
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-300 to-rose-400 flex items-center justify-center text-white shadow-glow-soft">⚡</div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-rose-600 uppercase">Quick</p>
              <h2 className="headline font-bold text-mocha-800">クイック模擬試験</h2>
            </div>
          </div>
          <ul className="text-xs text-mocha-600 space-y-1.5 mb-3 leading-relaxed">
            <li className="flex gap-2"><span className="text-mocha-400">·</span>30問（各章1/4）</li>
            <li className="flex gap-2"><span className="text-mocha-400">·</span>時間制限なし（経過時間だけ表示）</li>
            <li className="flex gap-2"><span className="text-mocha-400">·</span>合格基準：総合70%・各章35%</li>
          </ul>
          <div className="text-[11px] text-mocha-600 mb-3 rounded-2xl bg-cream-50/80 border border-cream-200 p-3 space-y-1">
            <div className="flex justify-between"><span>第1章・第2章・第4章・第5章</span><span className="font-bold tabular-nums">各5問</span></div>
            <div className="flex justify-between"><span>第3章</span><span className="font-bold tabular-nums">10問</span></div>
          </div>
          <button
            onClick={() => handleStart(true)}
            className="btn w-full text-white relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #f59e7c 0%, #e87063 50%, #d04a3d 100%)", boxShadow: "0 8px 20px -4px rgba(208, 74, 61, 0.45)" }}
          >
            クイック試験を始める
          </button>
        </div>

        {/* 本番模擬試験 */}
        <div className="card flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-rose-gold opacity-25 blur-3xl" />
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-gradient-rose-gold flex items-center justify-center text-white shadow-glow-soft">📝</div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-primary-600 uppercase">Full Exam</p>
              <h2 className="headline font-bold text-mocha-800">本番模擬試験</h2>
            </div>
          </div>
          <ul className="text-xs text-mocha-600 space-y-1.5 leading-relaxed">
            <li className="flex gap-2"><span className="text-mocha-400">·</span>問題数：120問（5章構成）</li>
            <li className="flex gap-2"><span className="text-mocha-400">·</span>時間制限なし（経過時間だけ表示）</li>
            <li className="flex gap-2"><span className="text-mocha-400">·</span>合格基準：総合70%以上 かつ 各章35%以上</li>
            <li className="flex gap-2"><span className="text-mocha-400">·</span>試験中は正解・不正解は表示されません</li>
            <li className="flex gap-2"><span className="text-mocha-400">·</span>途中でアプリを閉じても再開できます</li>
          </ul>
          <div className="text-[11px] text-mocha-600 rounded-2xl bg-cream-50/80 border border-cream-200 p-3 space-y-1">
            <div className="flex justify-between"><span>第1章・第2章・第4章・第5章</span><span className="font-bold tabular-nums">各20問</span></div>
            <div className="flex justify-between"><span>第3章</span><span className="font-bold tabular-nums">40問</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button onClick={() => handleStart(false)} className="btn-primary w-full text-base py-4">
            本番試験を始める
          </button>
          {resumable && (
            <button
              onClick={() => {
                const saved = loadMockExamSession();
                if (saved) { setSession(saved); setElapsedSeconds(calcElapsedSeconds(saved)); setPhase("exam"); }
              }}
              className="btn-secondary w-full"
            >
              前回の試験を再開する
            </button>
          )}
          <button onClick={() => router.push("/")} className="btn-ghost w-full">
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
      <div className="flex flex-col gap-5 p-5 items-center justify-center min-h-screen">
        <div className="card w-full text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-rose-gold opacity-25 blur-2xl" />
          <p className="text-3xl mb-3">📋</p>
          <h2 className="headline text-lg font-bold mb-2 text-mocha-800">提出しますか？</h2>
          {unanswered > 0 && (
            <p className="text-amber-700 text-sm mb-3 font-medium">⚠ 未回答が{unanswered}問あります</p>
          )}
          <p className="text-mocha-500 text-xs mb-5 tracking-wide">提出後は変更できません</p>
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

  return (
    <div className="flex flex-col h-screen">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3 backdrop-blur-xl border-b bg-white/65 border-cream-200">
        <button
          onClick={() => {
            if (confirm("試験を中断してメニューに戻りますか？\n（進捗は保存されています）")) {
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase("intro");
            }
          }}
          className="text-[11px] text-mocha-400 hover:text-mocha-700 font-medium tracking-wider uppercase"
        >
          ✕ 中断
        </button>
        <div className="text-center">
          <p className="text-[10px] text-mocha-400 tracking-wider uppercase">Time</p>
          <p className="text-base font-bold font-mono tabular-nums tracking-wider text-mocha-800">
            {formatTime(elapsedSeconds)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-mocha-400 tracking-wider uppercase">Answered</p>
          <p className="text-xs font-bold text-mocha-700 tabular-nums">{answeredCount} / {session.questions.length}</p>
        </div>
      </div>

      {/* 問題エリア（スクロール可） */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-24">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="badge badge-gold">{CATEGORY_CHAPTER[q.category]}</span>
          <span className="text-[10px] text-mocha-500 truncate tracking-wide">{q.category}</span>
          <span className="text-[11px] text-mocha-500 ml-auto tabular-nums tracking-wide">問題 {currentIndex + 1} / {session.questions.length}</span>
        </div>

        <p className="text-[15px] font-medium leading-relaxed text-mocha-800 mb-4">{q.text}</p>

        {/* 文章リスト（正誤・組み合わせ型） */}
        {(q.type === "seigo_combination" || q.type === "correct_combination") && (
          <div className="flex flex-col gap-2 rounded-2xl p-3.5 mb-3 border border-cream-200 bg-cream-50/70">
            {(q as SeigoCombinationQuestion | CorrectCombinationQuestion).statements.map((s) => (
              <div key={s.label} className="flex gap-2.5 text-sm text-mocha-700 leading-relaxed">
                <span className="font-bold text-primary-600 shrink-0">{s.label}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* 穴埋め型の本文 */}
        {q.type === "word_combination" && (q as WordCombinationQuestion).passage && (
          <div className="rounded-2xl p-3.5 mb-3 border border-cream-200 bg-cream-50/70 text-sm text-mocha-700 leading-relaxed">
            {(q as WordCombinationQuestion).passage}
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
                  className={`w-full text-left rounded-2xl px-4 py-3 font-medium transition-all duration-150 text-sm backdrop-blur-md ${
                    selectedAnswer === i
                      ? "border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-900 shadow-glow-soft"
                      : "border-2 border-cream-200 bg-white/65 text-mocha-700 hover:border-primary-300 hover:bg-cream-50/85"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-primary-500 mr-2">{i + 1}.</span>
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
                  className={`flex items-center w-full rounded-2xl px-4 py-3 font-medium transition-all duration-150 text-sm backdrop-blur-md ${
                    selectedAnswer === i
                      ? "border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-900 shadow-glow-soft"
                      : "border-2 border-cream-200 bg-white/65 text-mocha-700 hover:border-primary-300 hover:bg-cream-50/85"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-primary-500 w-8 shrink-0">{i + 1}.</span>
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

        {q.type === "word_combination" && (() => {
          const wq = q as WordCombinationQuestion;
          return (
            <div className="flex flex-col gap-2">
              <div className="flex items-center pl-8 gap-2">
                {wq.word_headers.map((h) => (
                  <span key={h} className="flex-1 text-center text-[10px] font-bold text-primary-500">{h}</span>
                ))}
              </div>
              {wq.word_options.map((words, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`flex items-center gap-2 w-full rounded-2xl px-4 py-3 font-medium transition-all duration-150 text-sm backdrop-blur-md ${
                    selectedAnswer === i
                      ? "border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-900 shadow-glow-soft"
                      : "border-2 border-cream-200 bg-white/65 text-mocha-700 hover:border-primary-300 hover:bg-cream-50/85"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-primary-500 w-6 shrink-0">{i + 1}.</span>
                  {words.map((w, j) => (
                    <span key={j} className="flex-1 text-center text-[13px] leading-snug break-words">{w}</span>
                  ))}
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
                  className={`flex items-center w-full rounded-2xl px-4 py-3 font-medium transition-all duration-150 text-sm backdrop-blur-md ${
                    selectedAnswer === i
                      ? "border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100 text-primary-900 shadow-glow-soft"
                      : "border-2 border-cream-200 bg-white/65 text-mocha-700 hover:border-primary-300 hover:bg-cream-50/85"
                  }`}
                  style={{ minHeight: "52px" }}
                >
                  <span className="font-bold text-primary-500 mr-3">{i + 1}.</span>
                  <span>{pair.join("・")}</span>
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      {/* 下部ナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white/75 backdrop-blur-xl border-t border-cream-200 px-4 py-3 flex items-center gap-2 shadow-soft">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="btn-secondary px-4 py-2 text-sm disabled:opacity-30 !rounded-full"
          style={{ minHeight: "auto" }}
        >← 前へ</button>

        <button
          onClick={() => setShowNavigator(true)}
          className="flex-1 text-xs text-center text-primary-600 font-bold py-2 tracking-[0.15em] uppercase hover:text-primary-800 transition-colors"
        >
          問題一覧
        </button>

        {currentIndex < session.questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(session.questions.length - 1, i + 1))}
            className="btn-secondary px-4 py-2 text-sm !rounded-full"
            style={{ minHeight: "auto" }}
          >次へ →</button>
        ) : (
          <button
            onClick={() => setPhase("confirm-submit")}
            className="btn-primary px-4 py-2 text-sm !rounded-full"
            style={{ minHeight: "auto" }}
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
