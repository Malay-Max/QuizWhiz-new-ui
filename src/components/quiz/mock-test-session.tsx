"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Question, MockTest, MockTestResult } from "@/lib/schemas";
import { saveMockTestResult, getQuestion } from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
    ChevronLeft,
    ChevronRight,
    Clock,
    Send,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Sparkles,
    ArrowLeft,
} from "lucide-react";
import { explainQuestionAction } from "@/app/actions/explain-question";

interface MockTestSessionProps {
    test: MockTest;
    questions: Question[];
    existingResult?: MockTestResult | null;
}

export default function MockTestSession({ test, questions, existingResult }: MockTestSessionProps) {
    const { user } = useAuth();
    const router = useRouter();

    // --- Test State ---
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(test.durationMinutes * 60); // seconds
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<MockTestResult | null>(existingResult ?? null);
    const [showConfirm, setShowConfirm] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // AI explanation state for results view
    const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
    const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

    const isTestMode = !result;
    const currentQuestion = questions[currentIdx];

    // --- Timer ---
    useEffect(() => {
        if (!isTestMode) return;

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isTestMode]);

    // Auto-submit when timer hits 0
    const handleSubmit = useCallback(async () => {
        if (!user || isSubmitting || result) return;
        setIsSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);

        // Calculate score
        let score = 0;
        for (const q of questions) {
            if (answers[q.id!] === q.correctAnswerId) score++;
        }

        const mockResult: MockTestResult = {
            testId: test.id!,
            userId: user.uid,
            score,
            totalQuestions: questions.length,
            answers,
            completedAt: Date.now(),
        };

        try {
            await saveMockTestResult(mockResult);
            setResult(mockResult);
            setCurrentIdx(0); // Go to start for reviewing
        } catch (err) {
            console.error("Failed to save result:", err);
        } finally {
            setIsSubmitting(false);
        }
    }, [user, answers, questions, test, isSubmitting, result]);

    // Auto-submit on timer end
    useEffect(() => {
        if (timeLeft === 0 && isTestMode && !isSubmitting) {
            handleSubmit();
        }
    }, [timeLeft, isTestMode, isSubmitting, handleSubmit]);

    const formatTime = (s: number) => {
        const min = Math.floor(s / 60);
        const sec = s % 60;
        return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    };

    const selectOption = (questionId: string, optionId: string) => {
        if (!isTestMode) return;
        setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    };

    const answeredCount = Object.keys(answers).length;
    const progress = (answeredCount / questions.length) * 100;

    // AI explanation handler
    const handleAskAI = async (question: Question) => {
        if (loadingAi[question.id!] || aiExplanations[question.id!]) return;
        setLoadingAi(prev => ({ ...prev, [question.id!]: true }));
        try {
            const explanation = await explainQuestionAction(question);
            setAiExplanations(prev => ({ ...prev, [question.id!]: explanation }));
        } catch (err) {
            console.error("AI explanation failed:", err);
        } finally {
            setLoadingAi(prev => ({ ...prev, [question.id!]: false }));
        }
    };

    // --- Results Summary Header ---
    if (result && currentIdx === -1) {
        // This branch isn't used; we show results inline
    }

    return (
        <div className="flex flex-col h-full bg-[#111418] overflow-hidden">
            {/* Top Bar */}
            <div className="bg-[#1c2127] border-b border-[#283039] px-4 md:px-8 py-3 flex items-center justify-between shrink-0">
                <div className="flex flex-col min-w-0">
                    <h2 className="text-white font-bold text-lg truncate">{test.title}</h2>
                    <p className="text-xs text-[#9dabb9]">
                        {isTestMode ? `${answeredCount}/${questions.length} answered` : `Score: ${result!.score}/${result!.totalQuestions}`}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isTestMode ? (
                        <>
                            <div
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg",
                                    timeLeft <= 60
                                        ? "bg-red-500/20 text-red-400 animate-pulse"
                                        : timeLeft <= 300
                                            ? "bg-amber-500/15 text-amber-400"
                                            : "bg-[#283039] text-white"
                                )}
                            >
                                <Clock className="w-5 h-5" />
                                {formatTime(timeLeft)}
                            </div>
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Submit
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 font-bold text-lg">
                                <CheckCircle2 className="w-5 h-5" />
                                {result!.score}/{result!.totalQuestions}
                            </div>
                            <button
                                onClick={() => router.push("/mock-tests")}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#283039] text-white hover:bg-[#3a4550] transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Exit
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            {isTestMode && (
                <div className="w-full h-1 bg-[#283039] shrink-0">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Question Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
                <div className="max-w-3xl mx-auto space-y-6">
                    {/* Question Number Bubbles */}
                    <div className="flex flex-wrap gap-2 justify-center pb-4 border-b border-[#283039]">
                        {questions.map((q, idx) => {
                            const isAnswered = !!answers[q.id!] || !!result?.answers[q.id!];
                            const isCurrent = idx === currentIdx;

                            // In results mode, color by correctness
                            let bubbleClass = "";
                            if (result) {
                                const userAnswer = result.answers[q.id!];
                                const isCorrect = userAnswer === q.correctAnswerId;
                                if (!userAnswer) bubbleClass = "bg-[#283039] text-[#9dabb9]";
                                else if (isCorrect) bubbleClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
                                else bubbleClass = "bg-red-500/20 text-red-400 border-red-500/40";
                            } else {
                                bubbleClass = isAnswered
                                    ? "bg-primary/20 text-primary border-primary/40"
                                    : "bg-[#283039] text-[#9dabb9]";
                            }

                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIdx(idx)}
                                    className={cn(
                                        "w-9 h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all",
                                        bubbleClass,
                                        isCurrent && "ring-2 ring-white/50 scale-110"
                                    )}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>

                    {/* Question Card */}
                    {currentQuestion && (
                        <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
                            <div className="flex items-center justify-between text-sm text-[#9dabb9]">
                                <span className="font-semibold">Question {currentIdx + 1} of {questions.length}</span>
                                {isTestMode && answers[currentQuestion.id!] && (
                                    <span className="text-primary text-xs font-medium">✓ Answered</span>
                                )}
                            </div>

                            {currentQuestion.source && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {currentQuestion.source}
                                </span>
                            )}

                            <p className="text-white text-lg font-medium leading-relaxed">
                                {currentQuestion.text}
                            </p>

                            <div className="space-y-3">
                                {currentQuestion.options.map((opt, optIdx) => {
                                    const letter = String.fromCharCode(65 + optIdx);
                                    const isSelected = isTestMode
                                        ? answers[currentQuestion.id!] === opt.id
                                        : result?.answers[currentQuestion.id!] === opt.id;
                                    const isCorrect = opt.id === currentQuestion.correctAnswerId;

                                    // In test mode: just highlight selected in purple
                                    // In results mode: green for correct, red for wrong selected
                                    let optionStyle = "";
                                    if (result) {
                                        if (isCorrect) {
                                            optionStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-400";
                                        } else if (isSelected && !isCorrect) {
                                            optionStyle = "bg-red-500/10 border-red-500/50 text-red-400";
                                        } else {
                                            optionStyle = "bg-[#111418] border-[#283039] text-[#9dabb9]";
                                        }
                                    } else {
                                        optionStyle = isSelected
                                            ? "bg-primary/10 border-primary/50 text-primary"
                                            : "bg-[#111418] border-[#283039] text-[#9dabb9] hover:bg-[#283039] hover:text-white";
                                    }

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => selectOption(currentQuestion.id!, opt.id)}
                                            disabled={!isTestMode}
                                            className={cn(
                                                "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                                                optionStyle
                                            )}
                                        >
                                            <span className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                                                result
                                                    ? isCorrect ? "bg-emerald-500/20 text-emerald-400" : isSelected ? "bg-red-500/20 text-red-400" : "bg-[#283039] text-[#9dabb9]"
                                                    : isSelected ? "bg-primary/20 text-primary" : "bg-[#283039] text-[#9dabb9]"
                                            )}>
                                                {result ? (
                                                    isCorrect ? <CheckCircle2 className="w-4 h-4" /> : isSelected ? <XCircle className="w-4 h-4" /> : letter
                                                ) : letter}
                                            </span>
                                            <span className="text-sm font-medium">{opt.text}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Explanation (results mode only) */}
                            {result && (
                                <div className="space-y-4 pt-4 border-t border-[#283039]">
                                    {currentQuestion.explanation && (
                                        <div className="bg-[#111418] border border-[#283039] rounded-xl p-4">
                                            <p className="text-xs font-semibold text-amber-400 mb-2">📖 Explanation</p>
                                            <p className="text-sm text-[#c9d1d9] leading-relaxed">{currentQuestion.explanation}</p>
                                        </div>
                                    )}

                                    {/* AI Explanation */}
                                    {aiExplanations[currentQuestion.id!] ? (
                                        <div className="bg-[#111418] border border-primary/20 rounded-xl p-4">
                                            <p className="text-xs font-semibold text-primary mb-2">🤖 AI Deep Dive</p>
                                            <p className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">{aiExplanations[currentQuestion.id!]}</p>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleAskAI(currentQuestion)}
                                            disabled={loadingAi[currentQuestion.id!]}
                                            className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                                        >
                                            {loadingAi[currentQuestion.id!] ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="w-4 h-4" />
                                            )}
                                            {loadingAi[currentQuestion.id!] ? "Generating..." : "Ask AI for deeper explanation"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="bg-[#1c2127] border-t border-[#283039] px-4 md:px-8 py-3 flex items-center justify-between shrink-0">
                <button
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#283039] text-white hover:bg-[#3a4550] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                </button>

                <span className="text-sm font-medium text-[#9dabb9]">
                    {currentIdx + 1} / {questions.length}
                </span>

                <button
                    onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                    disabled={currentIdx === questions.length - 1}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#283039] text-white hover:bg-[#3a4550] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Next
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Submit Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                            <h3 className="text-xl font-bold text-white">Submit Test?</h3>
                        </div>
                        <p className="text-[#9dabb9] text-sm leading-relaxed">
                            You have answered <strong className="text-white">{answeredCount}</strong> out of <strong className="text-white">{questions.length}</strong> questions.
                            {answeredCount < questions.length && (
                                <span className="block mt-2 text-amber-400">
                                    ⚠️ {questions.length - answeredCount} question(s) are unanswered and will be marked incorrect.
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#283039] text-white hover:bg-[#3a4550] transition-colors"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    handleSubmit();
                                }}
                                disabled={isSubmitting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? "Submitting..." : "Confirm Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
