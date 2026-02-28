"use client";

import { useState, useEffect } from "react";
import { X, Plus, Trash2, CheckCircle2, Save, ChevronRight } from "lucide-react";
import { Question, Option, Category } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface EditQuestionModalProps {
    question: Question;
    categories: Category[];
    onSave: (updated: Question) => void;
    onClose: () => void;
}

export function EditQuestionModal({ question, categories, onSave, onClose }: EditQuestionModalProps) {
    const [text, setText] = useState(question.text);
    const [options, setOptions] = useState<Option[]>([...question.options]);
    const [correctAnswerId, setCorrectAnswerId] = useState(question.correctAnswerId);
    const [explanation, setExplanation] = useState(question.explanation);
    const [categoryId, setCategoryId] = useState(question.categoryId);
    const [type, setType] = useState(question.type ?? "multiple-choice");
    const [isSaving, setIsSaving] = useState(false);
    // Category picker state
    const [catBreadcrumb, setCatBreadcrumb] = useState<Category[]>([]);
    const currentPickerParentId = catBreadcrumb.length > 0 ? catBreadcrumb[catBreadcrumb.length - 1].id ?? null : null;
    const visibleCats = categories.filter(c => (c.parentId ?? null) === currentPickerParentId);
    const selectedCat = categories.find(c => c.id === categoryId);

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleOptionTextChange = (id: string, newText: string) => {
        setOptions(prev => prev.map(o => o.id === id ? { ...o, text: newText } : o));
    };

    const handleAddOption = () => {
        const newId = `option-${Date.now()}`;
        setOptions(prev => [...prev, { id: newId, text: "" }]);
    };

    const handleRemoveOption = (id: string) => {
        if (options.length <= 2) return; // min 2 options
        setOptions(prev => prev.filter(o => o.id !== id));
        if (correctAnswerId === id) {
            setCorrectAnswerId(options.find(o => o.id !== id)?.id ?? "");
        }
    };

    const handleSave = async () => {
        if (!text.trim() || options.some(o => !o.text.trim()) || !correctAnswerId || !explanation.trim()) return;
        setIsSaving(true);
        const updated: Question = {
            ...question,
            text: text.trim(),
            options,
            correctAnswerId,
            explanation: explanation.trim(),
            categoryId,
            type,
        };
        await onSave(updated);
        setIsSaving(false);
    };

    const isValid = text.trim().length >= 5 &&
        options.length >= 2 &&
        options.every(o => o.text.trim()) &&
        !!correctAnswerId &&
        explanation.trim().length > 0;


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative bg-[#1c2127] border border-[#283039] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#283039]">
                    <h2 className="text-lg font-bold text-white">Edit Question</h2>
                    <button onClick={onClose} className="p-1.5 text-[#9dabb9] hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {/* Question Type */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Type</label>
                        <div className="flex gap-2">
                            {(["multiple-choice", "true-false"] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                        type === t
                                            ? "bg-primary/10 border-primary text-primary"
                                            : "bg-[#111418] border-[#283039] text-[#9dabb9] hover:border-primary/50"
                                    )}
                                >
                                    {t === "multiple-choice" ? "Multiple Choice" : "True / False"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question Text */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Question Text</label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            rows={3}
                            className="w-full bg-[#111418] border border-[#283039] rounded-xl p-3 text-sm text-white placeholder:text-[#9dabb9]/50 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none transition-all"
                            placeholder="Enter question text..."
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">
                            Options <span className="text-[#9dabb9]/50 normal-case font-normal">(click radio to set correct answer)</span>
                        </label>
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <div key={opt.id} className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                    correctAnswerId === opt.id
                                        ? "border-emerald-500/50 bg-emerald-500/5"
                                        : "border-[#283039] bg-[#111418]"
                                )}>
                                    <button
                                        onClick={() => setCorrectAnswerId(opt.id)}
                                        className={cn(
                                            "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                            correctAnswerId === opt.id
                                                ? "border-emerald-500 bg-emerald-500"
                                                : "border-[#9dabb9] hover:border-primary"
                                        )}
                                    >
                                        {correctAnswerId === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </button>
                                    <span className="text-xs font-bold text-[#9dabb9] w-5 flex-shrink-0">
                                        {String.fromCharCode(65 + idx)}
                                    </span>
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={e => handleOptionTextChange(opt.id, e.target.value)}
                                        className="flex-1 bg-transparent text-sm text-white placeholder:text-[#9dabb9]/50 outline-none"
                                        placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                                    />
                                    {correctAnswerId === opt.id && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                    )}
                                    <button
                                        onClick={() => handleRemoveOption(opt.id)}
                                        disabled={options.length <= 2}
                                        className="p-1 text-[#9dabb9] hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {type === "multiple-choice" && options.length < 6 && (
                            <button
                                onClick={handleAddOption}
                                className="mt-2 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Add option
                            </button>
                        )}
                    </div>

                    {/* Explanation */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Explanation</label>
                        <textarea
                            value={explanation}
                            onChange={e => setExplanation(e.target.value)}
                            rows={3}
                            className="w-full bg-[#111418] border border-[#283039] rounded-xl p-3 text-sm text-white placeholder:text-[#9dabb9]/50 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none transition-all"
                            placeholder="Explain why the correct answer is correct..."
                        />
                    </div>

                    {/* Category – drill-down picker */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Category</label>

                        {/* Current selection display */}
                        <div className="mb-2 flex items-center gap-2 text-sm">
                            <span className="text-[#9dabb9]">Selected:</span>
                            <span className={cn(
                                "font-medium",
                                selectedCat ? "text-primary" : "text-[#9dabb9]/50 italic"
                            )}>
                                {selectedCat ? selectedCat.name : "None"}
                            </span>
                        </div>

                        {/* Breadcrumb */}
                        {catBreadcrumb.length > 0 && (
                            <div className="flex items-center gap-1 text-xs mb-2 flex-wrap">
                                <button
                                    onClick={() => setCatBreadcrumb([])}
                                    className="text-[#9dabb9] hover:text-white transition-colors"
                                >Home</button>
                                {catBreadcrumb.map((c, i) => (
                                    <span key={c.id} className="flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3 text-[#9dabb9]" />
                                        <button
                                            onClick={() => setCatBreadcrumb(prev => prev.slice(0, i + 1))}
                                            className={cn(
                                                "transition-colors",
                                                i === catBreadcrumb.length - 1 ? "text-white" : "text-[#9dabb9] hover:text-white"
                                            )}
                                        >{c.name}</button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Category list */}
                        <div className="bg-[#111418] border border-[#283039] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                            {visibleCats.length === 0 ? (
                                <p className="text-xs text-[#9dabb9]/50 text-center py-4">No subcategories</p>
                            ) : (
                                visibleCats.map(cat => {
                                    const hasChildren = categories.some(c => c.parentId === cat.id);
                                    const isSelected = categoryId === cat.id;
                                    return (
                                        <div
                                            key={cat.id}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-2.5 border-b border-[#283039] last:border-0 transition-colors",
                                                isSelected ? "bg-primary/10" : "hover:bg-white/5"
                                            )}
                                        >
                                            <button
                                                onClick={() => setCategoryId(cat.id!)}
                                                className={cn(
                                                    "flex-1 text-left text-sm transition-colors",
                                                    isSelected ? "text-primary font-semibold" : "text-white"
                                                )}
                                            >
                                                {cat.name}
                                            </button>
                                            {hasChildren && (
                                                <button
                                                    onClick={() => setCatBreadcrumb(prev => [...prev, cat])}
                                                    className="ml-2 p-1 text-[#9dabb9] hover:text-white hover:bg-white/5 rounded transition-colors flex-shrink-0"
                                                    title="Browse subcategories"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#283039] flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-[#9dabb9] hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid || isSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition-all"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
}
