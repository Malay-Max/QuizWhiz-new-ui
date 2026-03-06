"use client";

import { useState, useEffect, useMemo } from "react";
import {
    FileText,
    FolderOpen as FolderIcon,
    Sparkles,
    Trash2,
    Info as InfoIcon,
    Save,
    Edit2,
    CheckCircle2,
    ChevronRight as ChevronRightIcon,
    PlusCircle as PlusCircleIcon,
    Check,
    Search,
    Home,
    Loader2,
    FolderPlus,
    Upload,
    BookOpen,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateQuestionsAction } from "@/app/actions/generate-questions";
import { extractPYQsFromTextAction, extractPYQsFromPdfAction } from "@/app/actions/extract-pyqs";
import { parsePYQText } from "@/lib/pyq-parser";
import { Question, Category } from "@/lib/schemas";
import ReactMarkdown from "react-markdown";
import { addQuestion, getCategories, addCategory } from "@/lib/db";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/contexts/goal-context";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function GenerateQuestionsPage() {
    const { isAdmin, isLoading } = useAuth();
    const { activeGoalId } = useGoal();
    const router = useRouter();

    const [notes, setNotes] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [mode, setMode] = useState<"notes" | "pyqs">("notes");
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localParseFailed, setLocalParseFailed] = useState(false);
    const [autoExtract, setAutoExtract] = useState(true);

    // Folder browser state
    const [categories, setCategories] = useState<Category[]>([]);
    const [catsLoading, setCatsLoading] = useState(true);
    const [currentParentId, setCurrentParentId] = useState<string | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Home" }]);
    const [folderSearch, setFolderSearch] = useState("");
    const [newFolderName, setNewFolderName] = useState("");
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAdmin) {
            router.replace("/");
        }
    }, [isAdmin, isLoading, router]);

    // Load categories for the active goal
    useEffect(() => {
        setCatsLoading(true);
        getCategories(activeGoalId ?? undefined)
            .then(setCategories)
            .catch(console.error)
            .finally(() => setCatsLoading(false));
    }, [activeGoalId]);

    const handleSaveAll = async () => {
        if (generatedQuestions.length === 0 || !selectedCategoryId) return;
        setIsSaving(true);
        try {
            await Promise.all(
                generatedQuestions.map(q =>
                    addQuestion({ ...q, categoryId: selectedCategoryId })
                )
            );
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
        if (mode === "notes") {
            if (!notes || notes.length < 50) return;
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
        } else {
            // PYQ mode — use PDF or text
            setIsGenerating(true);
            try {
                let questions: Question[];
                if (pdfFile) {
                    const formData = new FormData();
                    formData.append("pdf", pdfFile);
                    questions = await extractPYQsFromPdfAction(formData);
                } else if (notes.length >= 50) {
                    if (autoExtract) {
                        // Try local regex parsing first (instant, no AI cost)
                        const localParsed = parsePYQText(notes);
                        if (localParsed && localParsed.length > 0) {
                            questions = localParsed;
                            setLocalParseFailed(false);
                        } else {
                            // Don't auto-fallback — let user explicitly click Extract with AI
                            setLocalParseFailed(true);
                            setIsGenerating(false);
                            return;
                        }
                    } else {
                        // Auto-extract off — go directly to AI
                        questions = await extractPYQsFromTextAction(notes);
                    }
                } else {
                    alert("Please upload a PDF or paste PYQ text (min 50 chars).");
                    setIsGenerating(false);
                    return;
                }
                setGeneratedQuestions(questions);
                setLocalParseFailed(false);
            } catch (e) {
                console.error(e);
                alert("Failed to extract questions. Please try again.");
            } finally {
                setIsGenerating(false);
            }
        }
    };

    // Delete a generated question from the preview
    const handleDeleteGenerated = (idx: number) => {
        setGeneratedQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    // Edit a generated question's text inline
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editText, setEditText] = useState("");

    const startEditing = (idx: number) => {
        setEditingIdx(idx);
        setEditText(generatedQuestions[idx].text);
    };

    const saveEdit = () => {
        if (editingIdx === null) return;
        setGeneratedQuestions(prev =>
            prev.map((q, i) => i === editingIdx ? { ...q, text: editText } : q)
        );
        setEditingIdx(null);
        setEditText("");
    };

    const cancelEdit = () => {
        setEditingIdx(null);
        setEditText("");
    };

    // Folders at the current navigation level
    const currentChildren = useMemo(() =>
        categories.filter(c =>
            currentParentId === null ? !c.parentId : c.parentId === currentParentId
        ), [categories, currentParentId]);

    // Global search results (all categories matching the query, regardless of level)
    const searchResults = useMemo(() => {
        if (!folderSearch.trim()) return null;
        const term = folderSearch.toLowerCase();
        return categories.filter(c => c.name.toLowerCase().includes(term));
    }, [categories, folderSearch]);

    const navigateToFolder = (cat: Category) => {
        setCurrentParentId(cat.id!);
        setBreadcrumb(prev => [...prev, { id: cat.id!, name: cat.name }]);
        setFolderSearch("");
    };

    const navigateToBreadcrumb = (index: number) => {
        const item = breadcrumb[index];
        setCurrentParentId(item.id);
        setBreadcrumb(prev => prev.slice(0, index + 1));
        setFolderSearch("");
    };

    const selectFolder = (catId: string) => {
        setSelectedCategoryId(prev => prev === catId ? null : catId);
    };

    const selectedCategoryName = useMemo(() => {
        if (!selectedCategoryId) return null;
        return categories.find(c => c.id === selectedCategoryId)?.name ?? null;
    }, [selectedCategoryId, categories]);

    const handleCreateFolder = async () => {
        const name = newFolderName.trim();
        if (!name) return;
        setIsCreatingFolder(true);
        try {
            const newId = await addCategory({
                name,
                parentId: currentParentId ?? undefined,
                goalIds: activeGoalId ? [activeGoalId] : undefined,
            });
            // Add to local state
            setCategories(prev => [...prev, {
                id: newId,
                name,
                parentId: currentParentId ?? undefined,
                goalIds: activeGoalId ? [activeGoalId] : undefined,
            }]);
            setNewFolderName("");
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreatingFolder(false);
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

    const foldersToShow = searchResults ?? currentChildren;

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left Panel: Input & Config */}
            <aside className="flex-1 lg:max-w-[500px] xl:max-w-[600px] flex flex-col border-r border-[#283039] bg-[#111418] overflow-y-auto">
                <div className="p-6 md:p-8 flex flex-col gap-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Question Studio</h1>
                        <p className="text-[#9dabb9] text-base">Transform your notes into active recall quizzes instantly.</p>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex bg-[#1c2127] rounded-xl p-1 border border-[#283039]">
                        <button
                            onClick={() => { setMode("notes"); setPdfFile(null); }}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                mode === "notes" ? "bg-[#111418] text-white shadow-sm" : "text-[#9dabb9] hover:text-white"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            From Notes
                        </button>
                        <button
                            onClick={() => setMode("pyqs")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                mode === "pyqs" ? "bg-[#111418] text-white shadow-sm" : "text-[#9dabb9] hover:text-white"
                            )}
                        >
                            <BookOpen className="w-4 h-4" />
                            From PYQs
                        </button>
                    </div>

                    {/* Source Material Input */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                {mode === "notes" ? <FileText className="text-primary w-5 h-5" /> : <BookOpen className="text-primary w-5 h-5" />}
                                {mode === "notes" ? "Source Material" : "PYQ Content"}
                            </label>
                            <span className="text-xs text-[#9dabb9]">Min 50 chars</span>
                        </div>

                        {/* PDF Upload (PYQ mode only) */}
                        {mode === "pyqs" && (
                            <div className="space-y-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) setPdfFile(f);
                                    }}
                                />
                                {pdfFile ? (
                                    <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl p-3">
                                        <FileText className="w-5 h-5 text-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white font-medium truncate">{pdfFile.name}</p>
                                            <p className="text-xs text-[#9dabb9]">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button
                                            onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                                            className="p-1 hover:bg-white/10 rounded text-[#9dabb9] hover:text-white transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-[#283039] hover:border-primary/50 rounded-xl p-4 flex flex-col items-center gap-2 text-[#9dabb9] hover:text-white transition-all group"
                                    >
                                        <Upload className="w-6 h-6 group-hover:text-primary transition-colors" />
                                        <span className="text-sm font-medium">Upload PDF</span>
                                        <span className="text-xs text-[#9dabb9]">Click to browse or drop a PDF file</span>
                                    </button>
                                )}
                                {pdfFile && (
                                    <p className="text-xs text-[#9dabb9] text-center">PDF will be parsed for questions. You can also paste text below.</p>
                                )}
                            </div>
                        )}

                        <div className="relative group">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full h-48 bg-[#1c2127] border border-[#283039] rounded-xl p-4 text-base text-white placeholder:text-[#9dabb9]/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none outline-none"
                                placeholder={mode === "notes"
                                    ? "Paste your lecture notes, articles, or summaries here..."
                                    : "Paste your PYQ text here (questions, options, answer keys)..."
                                }
                            ></textarea>
                            <div className="absolute bottom-3 right-3 text-xs text-[#9dabb9] bg-[#1c2127]/80 px-2 py-1 rounded">
                                {notes.length} chars
                            </div>
                        </div>
                    </div>

                    {/* Folder Browser */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                            <FolderIcon className="text-primary w-5 h-5" />
                            Target Folder
                            {selectedCategoryName && (
                                <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                    {selectedCategoryName}
                                </span>
                            )}
                        </label>

                        <div className="bg-[#1c2127] border border-[#283039] rounded-xl overflow-hidden">
                            {/* Search */}
                            <div className="relative border-b border-[#283039]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9dabb9]" />
                                <input
                                    type="text"
                                    placeholder="Search all folders..."
                                    value={folderSearch}
                                    onChange={e => setFolderSearch(e.target.value)}
                                    className="w-full bg-transparent text-white text-sm pl-9 pr-4 py-2.5 outline-none placeholder:text-[#9dabb9]/50"
                                />
                            </div>

                            {/* Breadcrumb (hidden during search) */}
                            {!searchResults && (
                                <div className="flex items-center gap-1 px-3 py-2 border-b border-[#283039] text-xs text-[#9dabb9] overflow-x-auto">
                                    {breadcrumb.map((b, i) => (
                                        <span key={i} className="flex items-center gap-1 shrink-0">
                                            {i > 0 && <ChevronRightIcon className="w-3 h-3" />}
                                            <button
                                                onClick={() => navigateToBreadcrumb(i)}
                                                className={cn(
                                                    "hover:text-white transition-colors",
                                                    i === breadcrumb.length - 1 ? "text-white font-medium" : ""
                                                )}
                                            >
                                                {i === 0 ? <Home className="w-3 h-3" /> : b.name}
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Folder list */}
                            <div className="max-h-48 overflow-y-auto">
                                {catsLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-[#9dabb9]" />
                                    </div>
                                ) : foldersToShow.length === 0 ? (
                                    <div className="text-center py-6 text-sm text-[#9dabb9]">
                                        {folderSearch ? "No folders match your search." : "No folders here yet."}
                                    </div>
                                ) : (
                                    foldersToShow.map(cat => {
                                        const isSelected = selectedCategoryId === cat.id;
                                        return (
                                            <div
                                                key={cat.id}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 border-b border-[#283039]/50 last:border-b-0 transition-all",
                                                    isSelected
                                                        ? "bg-primary/10"
                                                        : "hover:bg-[#283039]/30"
                                                )}
                                            >
                                                <button
                                                    onClick={() => selectFolder(cat.id!)}
                                                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                        isSelected ? "bg-primary border-primary" : "border-[#9dabb9]/50"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <FolderIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-primary" : "text-[#9dabb9]")} />
                                                    <span className={cn("text-sm truncate", isSelected ? "text-white font-medium" : "text-[#9dabb9]")}>{cat.name}</span>
                                                </button>
                                                <button
                                                    onClick={() => navigateToFolder(cat)}
                                                    className="p-1.5 hover:bg-[#283039] rounded-lg text-[#9dabb9] hover:text-white transition-colors shrink-0"
                                                    title={`Open ${cat.name}`}
                                                >
                                                    <ChevronRightIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Create New Folder (hidden during search) */}
                            {!searchResults && (
                                <div className="border-t border-[#283039] px-3 py-2 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="New folder name..."
                                        value={newFolderName}
                                        onChange={e => setNewFolderName(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
                                        className="flex-1 bg-[#111418] border border-[#283039] text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-primary transition-colors placeholder:text-[#9dabb9]/50"
                                    />
                                    <button
                                        onClick={handleCreateFolder}
                                        disabled={!newFolderName.trim() || isCreatingFolder}
                                        className="flex items-center gap-1 bg-[#283039] hover:bg-[#283039]/80 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                                    >
                                        {isCreatingFolder ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderPlus className="w-3 h-3" />}
                                        Create
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Auto-extract checkbox (PYQ mode only) */}
                    {mode === "pyqs" && (
                        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                            <input
                                type="checkbox"
                                checked={autoExtract}
                                onChange={e => { setAutoExtract(e.target.checked); setLocalParseFailed(false); }}
                                className="w-4 h-4 rounded border-[#283039] bg-[#1c2127] text-primary focus:ring-primary/50 accent-primary cursor-pointer"
                            />
                            <span className="text-sm text-[#9dabb9] group-hover:text-white transition-colors">Auto-extract (instant, no AI)</span>
                        </label>
                    )}

                    {/* Local parse failed notice */}
                    {mode === "pyqs" && localParseFailed && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                            <InfoIcon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm text-amber-200 font-medium">Could not auto-parse the text format</p>
                                <p className="text-xs text-amber-200/70 mt-1">Click &quot;Extract with AI&quot; below to use AI-powered extraction instead.</p>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 flex gap-3">
                        {mode === "pyqs" && localParseFailed ? (
                            <button
                                onClick={async () => {
                                    setIsGenerating(true);
                                    try {
                                        const questions = await extractPYQsFromTextAction(notes);
                                        setGeneratedQuestions(questions);
                                        setLocalParseFailed(false);
                                    } catch (e) {
                                        console.error(e);
                                        alert("AI extraction failed. Please try again.");
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                                disabled={isGenerating}
                                className="flex-1 h-12 bg-amber-500 hover:bg-amber-500/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Sparkles className="w-5 h-5 fill-current" />
                                {isGenerating ? "Extracting with AI..." : "Extract with AI"}
                            </button>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || (mode === "notes" && notes.length < 50) || (mode === "pyqs" && !pdfFile && notes.length < 50)}
                                className="flex-1 h-12 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {mode === "notes" ? <Sparkles className="w-5 h-5 fill-current" /> : <BookOpen className="w-5 h-5" />}
                                {isGenerating ? (mode === "notes" ? "Generating..." : "Extracting...") : (mode === "notes" ? "Generate Questions" : "Extract PYQs")}
                            </button>
                        )}
                        <button
                            onClick={() => { setNotes(""); setLocalParseFailed(false); }}
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
                            disabled={isSaving || generatedQuestions.length === 0 || !selectedCategoryId}
                            className="flex items-center gap-2 bg-white text-[#111418] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!selectedCategoryId ? "Select a target folder first" : ""}
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
                                <div className="flex-1 min-w-0">
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-400 mb-2">
                                        {q.type === 'multiple-choice' ? 'Multiple Choice' : 'True / False'}
                                    </span>
                                    {editingIdx === idx ? (
                                        <div className="space-y-2">
                                            <textarea
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-lg p-3 outline-none focus:border-primary resize-none min-h-[60px]"
                                                rows={3}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={saveEdit} className="text-xs bg-primary text-white px-3 py-1 rounded-lg font-medium">Save</button>
                                                <button onClick={cancelEdit} className="text-xs bg-[#283039] text-[#9dabb9] px-3 py-1 rounded-lg">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-lg font-medium text-white leading-relaxed prose prose-invert max-w-none prose-p:my-1 prose-table:my-4 prose-th:px-4 prose-th:py-2 prose-td:px-4 prose-td:py-2">
                                            <ReactMarkdown>
                                                {q.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditing(idx)}
                                        className="p-1.5 hover:bg-white/5 rounded-lg text-[#9dabb9] hover:text-white transition-colors"
                                        title="Edit question"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGenerated(idx)}
                                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-[#9dabb9] hover:text-red-400 transition-colors"
                                        title="Remove question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 space-y-3">
                                {q.options.map((opt, optIdx) => {
                                    const isCorrect = opt.id === q.correctAnswerId;
                                    return (
                                        <div key={`${idx}-opt-${optIdx}`} className={cn(
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
