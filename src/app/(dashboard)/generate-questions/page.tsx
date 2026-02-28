"use client";

import { useState } from "react";
import {
    FileText,
    FolderOpen as FolderIcon,
    SlidersHorizontal,
    Sparkles,
    Trash2,
    Info as InfoIcon,
    Save,
    Edit2,
    CheckCircle2,
    ChevronRight as ChevronRightIcon,
    PlusCircle as PlusCircleIcon,
    Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateQuestionsAction } from "@/app/actions/generate-questions";
import { Question } from "@/lib/schemas";
import { addQuestion } from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GenerateQuestionsPage() {
    const { isAdmin, isLoading } = useAuth();
    const router = useRouter();

    // All hooks must be at the top, before any early return
    const [notes, setNotes] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

    useEffect(() => {
        if (!isLoading && !isAdmin) {
            router.replace("/");
        }
    }, [isAdmin, isLoading, router]);

    const handleSaveAll = async () => {
        if (generatedQuestions.length === 0) return;
        setIsSaving(true);
        try {
            await Promise.all(generatedQuestions.map(q => addQuestion(q)));
            alert("Questions saved successfully!");
            setGeneratedQuestions([]);
            setNotes("");
        } catch (e) {
            console.error("Error saving questions:", e);
            alert("Failed to save questions.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async () => {
        if (!notes) return;
        setIsGenerating(true);
        try {
            const questions = await generateQuestionsAction(notes);
            setGeneratedQuestions(questions);
        } catch (e) {
            console.error(e);
            alert("Failed to generate questions. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Guard — redirect non-admins
    if (isLoading || !isAdmin) {
        return (
            <div className="flex h-full items-center justify-center bg-[#111418]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#9dabb9] text-sm">Checking permissions…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left Panel: Input & Config */}
            <aside className="flex-1 lg:max-w-[500px] xl:max-w-[600px] flex flex-col border-r border-[#283039] bg-[#111418] overflow-y-auto">
                <div className="p-6 md:p-8 flex flex-col gap-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Question Studio</h1>
                        <p className="text-[#9dabb9] text-base">Transform your notes into active recall quizzes instantly.</p>
                    </div>

                    {/* Source Material Input */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                <FileText className="text-primary w-5 h-5" />
                                Source Material
                            </label>
                            <span className="text-xs text-[#9dabb9]">Min 50 chars</span>
                        </div>
                        <div className="relative group">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-64 bg-[#1c2127] border border-[#283039] rounded-xl p-4 text-base text-white placeholder:text-[#9dabb9]/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none outline-none"
                                placeholder="Paste your lecture notes, articles, or summaries here..."
                            ></textarea>
                            <div className="absolute bottom-3 right-3 text-xs text-[#9dabb9] bg-[#1c2127]/80 px-2 py-1 rounded">
                                {notes.length}/5000
                            </div>
                        </div>
                    </div>

                    {/* Configuration Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Target Deck */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                <FolderIcon className="text-primary w-5 h-5" />
                                Target Deck
                            </label>
                            <div className="relative">
                                <select className="w-full appearance-none bg-[#1c2127] border border-[#283039] rounded-lg h-10 pl-3 pr-10 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer">
                                    <option>Biology 101 - Cell Structure</option>
                                    <option>European History</option>
                                    <option>+ Create New Deck</option>
                                </select>
                            </div>
                        </div>
                        {/* Difficulty */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                <SlidersHorizontal className="text-primary w-5 h-5" />
                                Difficulty
                            </label>
                            <div className="flex bg-[#1c2127] rounded-lg p-1 border border-[#283039] h-10">
                                {['Easy', 'Medium', 'Hard'].map((diff) => (
                                    <label key={diff} className="flex-1 cursor-pointer">
                                        <input type="radio" name="difficulty" className="peer sr-only" defaultChecked={diff === 'Medium'} />
                                        <span className="flex items-center justify-center h-full rounded text-xs font-medium text-[#9dabb9] peer-checked:bg-[#111418] peer-checked:text-white peer-checked:shadow-sm transition-all">
                                            {diff}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex gap-3">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || notes.length < 50}
                            className="flex-1 h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Sparkles className="w-5 h-5 fill-current" />
                            {isGenerating ? "Generating..." : "Generate Questions"}
                        </button>
                        <button
                            onClick={() => setNotes("")}
                            className="h-12 w-12 bg-[#1c2127] hover:bg-[#283039] border border-[#283039] text-[#9dabb9] hover:text-white rounded-xl flex items-center justify-center transition-all"
                            title="Clear Input"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary/80">
                        <InfoIcon className="w-4 h-4" />
                        <span>Pro Tip: Use structured notes with clear headings for better results.</span>
                    </div>
                </div>
            </aside>

            {/* Right Panel: Output & Preview */}
            <section className="flex-1 bg-[#0b0e11] overflow-y-auto relative flex flex-col">
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-[#0b0e11]/95 backdrop-blur-sm border-b border-[#283039] px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white">Generated Preview</h3>
                        <span className="bg-[#1c2127] text-[#9dabb9] text-xs px-2 py-0.5 rounded border border-[#283039]">{generatedQuestions.length} Questions</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveAll}
                            disabled={isSaving || generatedQuestions.length === 0}
                            className="flex items-center gap-2 bg-white text-[#111418] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save All"}
                        </button>
                    </div>
                </div>

                {/* Content Container */}
                <div className="p-6 md:p-8 max-w-4xl mx-auto w-full space-y-6">
                    {generatedQuestions.length === 0 && !isGenerating && (
                        <div className="text-center text-[#9dabb9] mt-20">
                            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Generated questions will appear here.</p>
                        </div>
                    )}

                    {generatedQuestions.map((q, idx) => (
                        <div key={idx} className="bg-[#1c2127] border border-[#283039] rounded-xl overflow-hidden group hover:border-[#283039]/80 transition-all">
                            <div className="p-5 border-b border-[#283039]/50 flex justify-between items-start gap-4">
                                <div>
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-400 mb-2">
                                        {q.type === 'multiple-choice' ? 'Multiple Choice' : 'True / False'}
                                    </span>
                                    <h4 className="text-lg font-medium text-white leading-relaxed">{q.text}</h4>
                                </div>
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-[#9dabb9] hover:text-white transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button className="p-1.5 hover:bg-red-500/10 rounded-lg text-[#9dabb9] hover:text-red-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 space-y-3">
                                {q.options.map((opt, i) => {
                                    const isCorrect = opt.id === q.correctAnswerId;
                                    return (
                                        <div key={opt.id} className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border",
                                            isCorrect
                                                ? "bg-green-500/10 border-green-500/30"
                                                : "border-transparent hover:bg-white/5"
                                        )}>
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center",
                                                isCorrect ? "border-green-500" : "border-[#9dabb9]"
                                            )}>
                                                {isCorrect && <div className="w-2.5 h-2.5 rounded-full bg-green-500" />}
                                            </div>
                                            <span className={cn(isCorrect ? "text-white font-medium" : "text-[#9dabb9]")}>{opt.text}</span>
                                            {isCorrect && <CheckCircle2 className="ml-auto w-5 h-5 text-green-500" />}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="bg-[#1c2127]/50 p-4 border-t border-[#283039]/50">
                                <details className="group/accordion">
                                    <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                                        <ChevronRightIcon className="w-4 h-4 transition-transform group-open/accordion:rotate-90" />
                                        Why is this correct?
                                    </summary>
                                    <div className="mt-3 pl-6 text-sm text-[#9dabb9] leading-relaxed">
                                        <p>{q.explanation}</p>
                                    </div>
                                </details>
                            </div>
                        </div>
                    ))}

                    {isGenerating && (
                        <div className="animate-pulse space-y-6">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-[#1c2127] border border-[#283039] rounded-xl h-64"></div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
