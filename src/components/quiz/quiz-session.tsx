"use client";

import { useState, useEffect, useCallback } from "react";
import { Question } from "@/lib/schemas";
import { QuestionCard } from "./question-card";
import { Timer } from "./timer";
import { Pause, X, Play } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveQuizResult, upsertUserProgress, getCategories, type SRSRating } from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";

interface QuizSessionProps {
    questions: Question[];
    categoryName?: string;
}

export default function QuizSession({ questions, categoryName = "General Quiz" }: QuizSessionProps) {
    const { user } = useAuth();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [showFeedback, setShowFeedback] = useState(false);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
    const [catNameCache, setCatNameCache] = useState<Record<string, string>>({});

    const currentQuestion = questions[currentIndex];
    const totalQuestions = questions.length;
    const progressPercentage = (currentIndex / totalQuestions) * 100;

    const getCatName = useCallback(async (categoryId: string): Promise<string> => {
        if (catNameCache[categoryId]) return catNameCache[categoryId];
        if (categoryName && categoryId === currentQuestion?.categoryId) return categoryName;
        try {
            const cats = await getCategories();
            const found = cats.find(c => c.id === categoryId || c.name === categoryId);
            const name = found?.name ?? categoryId;
            setCatNameCache(prev => ({ ...prev, [categoryId]: name }));
            return name;
        } catch { return categoryId; }
    }, [catNameCache, categoryName, currentQuestion?.categoryId]);

    // Auto-advance via useEffect chain
    useEffect(() => {
        if (autoAdvanceCountdown === null) return;
        if (autoAdvanceCountdown <= 0) {
            setAutoAdvanceCountdown(null);
            if (currentIndex < totalQuestions - 1) {
                setCurrentIndex(prev => prev + 1);
                setShowFeedback(false);
                setIsPaused(false);
            } else {
                setIsCompleted(true);
            }
            return;
        }
        const id = setTimeout(() => {
            setAutoAdvanceCountdown(prev => prev === null ? null : prev - 1);
        }, 1000);
        return () => clearTimeout(id);
    }, [autoAdvanceCountdown, currentIndex, totalQuestions]);

    const cancelAutoAdvance = () => setAutoAdvanceCountdown(null);

    const goNext = useCallback(() => {
        cancelAutoAdvance();
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex(prev => prev + 1);
            setShowFeedback(false);
            setIsPaused(false);
        } else {
            setIsCompleted(true);
        }
    }, [currentIndex, totalQuestions]);

    const recordResult = useCallback(async (q: Question, isCorrect: boolean) => {
        if (!user) return;
        const catName = await getCatName(q.categoryId);
        await saveQuizResult(user.uid, q.id!, q.categoryId, isCorrect, catName).catch(console.error);
    }, [user, getCatName]);

    const handleAnswer = (optionId: string) => {
        cancelAutoAdvance();
        const isCorrect = optionId === currentQuestion.correctAnswerId;
        setAnswers(prev => ({ ...prev, [currentQuestion.id!]: optionId }));
        setShowFeedback(true);
        setIsPaused(true);
        if (isCorrect) setScore(prev => prev + 1);
        recordResult(currentQuestion, isCorrect);
    };

    const handleTimeUp = useCallback(() => {
        if (showFeedback) return;
        setShowFeedback(true);
        setIsPaused(true);
        recordResult(currentQuestion, false);
        setAutoAdvanceCountdown(5);
    }, [showFeedback, currentQuestion, recordResult]);

    const handleConfidence = (rating: SRSRating) => {
        // Write SRS progress asynchronously — don't block navigation
        if (user && currentQuestion?.id) {
            upsertUserProgress(user.uid, currentQuestion.id, currentQuestion.categoryId, rating)
                .catch(console.error);
        }
        goNext();
    };

    if (isCompleted) {
        const percentage = Math.round((score / totalQuestions) * 100);
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-[#111418]">
                <div className="bg-[#1c2127] p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-[#283039]">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🏆</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
                    <p className="text-[#9dabb9] mb-2">You scored <strong className="text-white">{score}</strong> out of <strong className="text-white">{totalQuestions}</strong></p>
                    <p className={cn("text-2xl font-bold mb-8", percentage >= 80 ? "text-emerald-400" : percentage >= 50 ? "text-yellow-400" : "text-red-400")}>{percentage}%</p>
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/quiz/manage" className="px-6 py-3 rounded-xl bg-[#283039] text-white font-medium hover:bg-[#323b46] transition-colors">
                            Back to Bank
                        </Link>
                        <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const wasTimedOut = showFeedback && !answers[currentQuestion.id!];

    // Labels with intervals shown for transparency
    const ratingConfig: Array<{ rating: SRSRating; label: string; sub: string; style: string }> = [
        { rating: 'again', label: 'Again', sub: '10m', style: 'hover:bg-rose-900/30 hover:border-rose-700 text-rose-400' },
        { rating: 'hard', label: 'Hard', sub: '1d', style: 'hover:bg-orange-900/30 hover:border-orange-700 text-orange-400' },
        { rating: 'good', label: 'Good', sub: '3d', style: 'hover:bg-blue-900/30 hover:border-blue-700 text-blue-400' },
        { rating: 'easy', label: 'Easy', sub: '7d+', style: 'hover:bg-emerald-900/30 hover:border-emerald-700 text-emerald-400' },
    ];

    return (
        <div className="flex flex-col h-screen bg-[#111418] overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-[#111418] z-10">
                <div className="flex items-center gap-4">
                    <Link href="/quiz/manage" className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-400">
                        <X className="w-6 h-6" />
                    </Link>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold tracking-wide text-white uppercase opacity-80">{categoryName}</h2>
                        <span className="text-xs text-slate-400">Card {currentIndex + 1} of {totalQuestions}</span>
                    </div>
                </div>
                <div className="flex-1 max-w-md mx-8 hidden md:block">
                    <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                        <span>Progress</span><span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Timer key={currentIndex} duration={30} isRunning={!isPaused && !showFeedback} onTimeUp={handleTimeUp} />
                    <button onClick={() => setIsPaused(p => !p)} className="flex items-center justify-center size-10 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">
                        {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto relative">
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
                </div>
                <div className="w-full max-w-4xl z-10 flex flex-col gap-6">
                    {wasTimedOut && (
                        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm font-medium animate-in fade-in">
                            ⏱ Time&apos;s up! The correct answer has been revealed.
                        </div>
                    )}
                    <QuestionCard question={currentQuestion} onAnswer={handleAnswer} showFeedback={showFeedback} selectedOptionId={answers[currentQuestion.id!] ?? null} />
                    {showFeedback && (
                        <div className="bg-[#1e2329] rounded-xl border border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-4xl mx-auto">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-400">Rate your confidence:</span>
                                    {wasTimedOut && autoAdvanceCountdown !== null && autoAdvanceCountdown > 0 && (
                                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">Next in {autoAdvanceCountdown}s…</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
                                    {ratingConfig.map(({ rating, label, sub, style }) => (
                                        <button
                                            key={rating}
                                            onClick={() => handleConfidence(rating)}
                                            className={cn(
                                                "flex flex-col items-center p-2 rounded-lg bg-slate-800 border border-slate-700 transition-all text-xs font-bold",
                                                style
                                            )}
                                        >
                                            <span>{label}</span>
                                            <span className="text-[10px] opacity-60 font-normal mt-0.5">{sub}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
