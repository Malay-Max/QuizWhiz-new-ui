"use client";

import { useEffect, useState, useMemo } from "react";
import QuizSession from "@/components/quiz/quiz-session";
import { Question, Category } from "@/lib/schemas";
import { Layers, BookOpen, Folder, Play, CheckSquare, Square } from "lucide-react";
import Link from "next/link";
import { getDueQuestions, getCategories } from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/contexts/goal-context";
import { cn } from "@/lib/utils";

export default function ReviewPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { activeGoalId } = useGoal();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());
    const [isSessionStarted, setIsSessionStarted] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) { setIsLoading(false); return; }

        setIsLoading(true);
        Promise.all([
            getDueQuestions(user.uid, activeGoalId ?? undefined),
            getCategories(activeGoalId ?? undefined)
        ])
            .then(([dueQs, cats]) => {
                setQuestions(dueQs);
                setCategories(cats);

                // By default, select all categories that have due questions
                const uniqueCatIds = new Set(dueQs.map(q => q.categoryId));
                setSelectedCategoryIds(uniqueCatIds);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [user, authLoading, activeGoalId]);

    // Group due questions by category
    const groupedDue = useMemo(() => {
        const groups: Record<string, { category: Category | undefined, count: number }> = {};
        for (const q of questions) {
            if (!groups[q.categoryId]) {
                groups[q.categoryId] = {
                    category: categories.find(c => c.id === q.categoryId),
                    count: 0
                };
            }
            groups[q.categoryId].count++;
        }
        return Object.entries(groups)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => (a.category?.name || "").localeCompare(b.category?.name || ""));
    }, [questions, categories]);

    const activeQuestions = useMemo(() => {
        return questions.filter(q => selectedCategoryIds.has(q.categoryId));
    }, [questions, selectedCategoryIds]);

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedCategoryIds.size === groupedDue.length) {
            setSelectedCategoryIds(new Set()); // Deselect all
        } else {
            setSelectedCategoryIds(new Set(groupedDue.map(g => g.id))); // Select all
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex flex-col h-full items-center justify-center gap-4 text-center p-6 bg-[#111418]">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                    <Layers className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold text-white">All Caught Up!</h2>
                <p className="text-[#9dabb9] max-w-md">
                    You have no cards due for review right now.
                    The SRS system schedules cards here after you answer them in the Question Bank.
                </p>
                <Link
                    href="/quiz/manage"
                    className="mt-4 flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors"
                >
                    <BookOpen className="w-5 h-5" />
                    Go to Question Bank
                </Link>
            </div>
        );
    }

    if (isSessionStarted && activeQuestions.length > 0) {
        return <QuizSession questions={activeQuestions} categoryName="Review Session" />;
    }

    return (
        <div className="flex flex-col h-full bg-[#111418] overflow-y-auto p-8">
            <div className="max-w-3xl w-full mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Layers className="w-8 h-8 text-primary" />
                            Daily Review
                        </h1>
                        <p className="text-[#9dabb9] mt-2">
                            You have <strong className="text-white">{questions.length}</strong> cards due today across <strong className="text-white">{groupedDue.length}</strong> categories.
                        </p>
                    </div>
                </div>

                <div className="bg-[#1c2127] border border-[#283039] rounded-2xl overflow-hidden shadow-xl">
                    <div className="flex items-center justify-between p-4 border-b border-[#283039] bg-[#222831]">
                        <button
                            onClick={toggleAll}
                            className="flex items-center gap-2 text-sm font-medium text-[#9dabb9] hover:text-white transition-colors"
                        >
                            {selectedCategoryIds.size === groupedDue.length ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                            ) : (
                                <Square className="w-5 h-5" />
                            )}
                            Select All
                        </button>
                        <div className="text-sm font-semibold text-white">
                            {activeQuestions.length} selected
                        </div>
                    </div>

                    <div className="divide-y divide-[#283039]">
                        {groupedDue.map((group) => {
                            const isSelected = selectedCategoryIds.has(group.id);
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => toggleCategory(group.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-[#2a323d] transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex-shrink-0 text-[#9dabb9]">
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5 text-primary" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Folder className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">
                                                    {group.category?.name || "Unknown Category"}
                                                </div>
                                                <div className="text-[#9dabb9] text-xs mt-0.5">
                                                    Contains {group.count} due cards
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-3 py-1 rounded-full bg-[#111418] border border-[#283039] text-xs font-bold text-white shadow-inner">
                                        {group.count}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={() => setIsSessionStarted(true)}
                        disabled={activeQuestions.length === 0}
                        className="flex items-center gap-2 px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none"
                    >
                        <Play className="w-5 h-5" fill="currentColor" />
                        Start Review ({activeQuestions.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
