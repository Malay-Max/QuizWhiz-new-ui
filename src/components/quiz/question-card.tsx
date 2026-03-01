"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { Question, Option } from "@/lib/schemas";
import { CheckCircle2, XCircle, Sparkles, Loader2 } from "lucide-react";
import { explainQuestionAction } from "@/app/actions/explain-question";

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
    const [isExplaining, setIsExplaining] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);

    // Reset explanation visibility when question changes
    useEffect(() => {
        setIsExplaining(false);
        setAiExplanation(null);
    }, [question.id]);

    const handleAskAI = async () => {
        if (isExplaining || aiExplanation) return;
        setIsExplaining(true);
        try {
            const explanation = await explainQuestionAction(question);
            setAiExplanation(explanation);
        } catch (error) {
            console.error(error);
            setAiExplanation("Something went wrong while asking the AI. Please try again later.");
        } finally {
            setIsExplaining(false);
        }
    };

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

            {/* Explanations Area */}
            {showFeedback && (
                <div className="bg-slate-50 dark:bg-[#252b32] border-t border-slate-200 dark:border-slate-800 p-6">
                    <div className="mb-4">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Explanation</h4>
                        <div className="text-sm text-slate-600 dark:text-slate-400 prose dark:prose-invert max-w-none">
                            <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                {question.explanation}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {!aiExplanation && (
                        <button
                            onClick={handleAskAI}
                            disabled={isExplaining}
                            className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20 text-primary font-semibold text-sm rounded-lg transition-all border border-primary/20 hover:border-primary/40 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isExplaining ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            {isExplaining ? "Generating..." : "Ask AI for deeper explanation"}
                        </button>
                    )}

                    {aiExplanation && (
                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4">
                            <h4 className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-wider mb-3">
                                <Sparkles className="w-4 h-4" />
                                AI Tutor
                            </h4>
                            <div className="text-sm text-slate-600 dark:text-slate-300 prose dark:prose-invert max-w-none">
                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                                    {aiExplanation}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
