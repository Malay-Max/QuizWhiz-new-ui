"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { Question, Option } from "@/lib/schemas";
import { CheckCircle2, XCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface QuestionCardProps {
    question: Question;
    onAnswer: (optionId: string) => void;
    showFeedback: boolean;
    selectedOptionId: string | null;
    onExplain?: () => void;
}

export function QuestionCard({
    question,
    onAnswer,
    showFeedback,
    selectedOptionId,
    onExplain
}: QuestionCardProps) {
    const [showExplanation, setShowExplanation] = useState(false);

    // Reset explanation visibility when question changes
    useEffect(() => {
        setShowExplanation(false);
    }, [question.id]);

    const handleOptionClick = (optionId: string) => {
        if (showFeedback) return;
        onAnswer(optionId);
    };

    const getOptionStyle = (option: Option) => {
        const isCorrect = option.id === question.correctAnswerId;
        const isSelected = option.id === selectedOptionId;

        if (!showFeedback) {
            return isSelected
                ? "border-primary bg-primary/10 text-primary"
                : "border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-[#1e2329]";
        }

        if (isCorrect) {
            return "border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
        }
        if (isSelected && !isCorrect) {
            return "border-red-500 bg-red-500/10 text-red-500";
        }
        return "border-slate-200 dark:border-slate-700 opacity-50";
    };

    const getLetterBadgeStyle = (option: Option) => {
        const isCorrect = option.id === question.correctAnswerId;
        const isSelected = option.id === selectedOptionId;
        if (showFeedback && isCorrect) return "bg-emerald-500 text-white border-emerald-500";
        if (showFeedback && isSelected && !isCorrect) return "bg-red-500 text-white border-red-500";
        return "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700";
    };

    return (
        <div className="bg-white dark:bg-[#1e2329] rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden w-full max-w-4xl mx-auto">
            <div className="p-6 md:p-8">
                <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {question.source || question.categoryId || "General"}
                    </span>
                </div>

                <div className="mb-6 text-slate-900 dark:text-white prose dark:prose-invert max-w-none">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                        {question.text}
                    </ReactMarkdown>
                </div>

                <div className="flex flex-col gap-3">
                    {question.options.map((option, idx) => (
                        <button
                            key={option.id}
                            onClick={() => handleOptionClick(option.id)}
                            disabled={showFeedback}
                            className={cn(
                                "relative group w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md",
                                getOptionStyle(option)
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "flex items-center justify-center size-8 rounded-lg font-bold text-sm border transition-colors flex-shrink-0",
                                    getLetterBadgeStyle(option)
                                )}>
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="font-medium">{option.text}</span>
                            </div>

                            {showFeedback && option.id === question.correctAnswerId && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                            )}
                            {showFeedback && option.id === selectedOptionId && option.id !== question.correctAnswerId && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                                    <XCircle className="w-5 h-5" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* AI Explain Bar */}
            {showFeedback && (
                <div className="bg-slate-50 dark:bg-[#252b32] border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="w-full flex items-center justify-between p-4 text-left group hover:bg-slate-100 dark:hover:bg-[#2c333a] transition-colors"
                    >
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                            <Sparkles className="w-5 h-5" />
                            <span>AI Explanation</span>
                        </div>
                        {showExplanation ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>

                    {showExplanation && (
                        <div className="p-4 pt-0 text-sm text-slate-600 dark:text-slate-300 animate-in slide-in-from-top-2">
                            <p>{question.explanation}</p>
                            {onExplain && (
                                <button onClick={onExplain} className="mt-2 text-xs text-primary underline">
                                    Ask for more details...
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
