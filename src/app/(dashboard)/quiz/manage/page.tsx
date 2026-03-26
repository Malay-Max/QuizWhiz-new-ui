"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Folder,
    FolderOpen,
    FileText,
    ChevronRight,
    Home,
    Trash2,
    Edit2,
    Play,
    Search,
    BookOpen,
    Loader2,
} from "lucide-react";
import {
    getCategories,
    getQuestionsInCategories,
    deleteQuestion,
    updateQuestion,
    updateCategory,
    deleteCategory,
} from "@/lib/db";
import { Question, Category } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { EditQuestionModal } from "@/components/quiz/edit-question-modal";
import { EditCategoryModal } from "@/components/quiz/edit-category-modal";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/contexts/goal-context";
import Link from "next/link";

type BreadcrumbItem = { id: string | null; name: string };

export default function ManagePage() {
    const { isAdmin } = useAuth();
    const { activeGoalId } = useGoal();

    // Only categories are fetched on mount — never the full question set
    const [categories, setCategories] = useState<Category[]>([]);
    const [isCatsLoading, setIsCatsLoading] = useState(true);

    // Questions are loaded on-demand when entering a leaf category
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
    const [loadedForCat, setLoadedForCat] = useState<string | null>(undefined as unknown as null);

    const [currentCategoryId, setCurrentCategoryId] = useState<string | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: "Home" }]);
    const [searchTerm, setSearchTerm] = useState("");
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    // Fetch categories once on mount (scoped to active goal)
    useEffect(() => {
        setIsCatsLoading(true);
        getCategories(activeGoalId ?? undefined)
            .then(setCategories)
            .catch(console.error)
            .finally(() => setIsCatsLoading(false));
    }, [activeGoalId]);

    const currentSubcategories = useMemo(() =>
        categories.filter(c =>
            currentCategoryId === null ? !c.parentId : c.parentId === currentCategoryId
        ), [categories, currentCategoryId]);

    const isAtLeaf = currentCategoryId !== null && currentSubcategories.length === 0;

    // Fetch questions lazily when we reach a leaf category
    useEffect(() => {
        if (!isAtLeaf || currentCategoryId === loadedForCat) return;

        setIsQuestionsLoading(true);
        setQuestions([]);
        getQuestionsInCategories([currentCategoryId])
            .then(qs => {
                setQuestions(qs);
                setLoadedForCat(currentCategoryId);
            })
            .catch(console.error)
            .finally(() => setIsQuestionsLoading(false));
    }, [isAtLeaf, currentCategoryId, loadedForCat]);

    const filteredQuestions = useMemo(() =>
        questions.filter(q =>
            q.text.toLowerCase().includes(searchTerm.toLowerCase())
        ), [questions, searchTerm]);

    const navigateInto = (cat: Category) => {
        setCurrentCategoryId(cat.id!);
        setBreadcrumb(prev => [...prev, { id: cat.id!, name: cat.name }]);
        setSearchTerm("");
    };

    const navigateToBreadcrumb = (item: BreadcrumbItem, index: number) => {
        setCurrentCategoryId(item.id);
        setBreadcrumb(prev => prev.slice(0, index + 1));
        setSearchTerm("");
        // If going back to a non-leaf, clear questions
        const subsAtTarget = categories.filter(c =>
            item.id === null ? !c.parentId : c.parentId === item.id
        );
        if (item.id === null || subsAtTarget.length > 0) {
            setQuestions([]);
            setLoadedForCat(null);
        }
    };

    const handleDeleteQuestion = async (q: Question) => {
        if (!confirm(`Delete "${q.text.slice(0, 60)}..."?`)) return;
        await deleteQuestion(q.id!);
        setQuestions(prev => prev.filter(item => item.id !== q.id));
    };

    const handleSaveCategoryEdit = async (updated: Category) => {
        // Find existing to know if parent changed
        const existingCat = categories.find(c => c.id === updated.id);
        
        await updateCategory(updated.id!, { 
            name: updated.name, 
            parentId: updated.parentId || null 
        } as any);
        
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        setEditingCategory(null);
        
        // If parent changed and we are in the old parent's directory, we should probably 
        // remove it from currentSubcategories, but React's useMemo on currentSubcategories 
        // will handle that automatically because "categories" state is updated!
    };

    const handleDeleteCategory = async (cat: Category) => {
        const hasChildren = categories.some(c => c.parentId === cat.id);
        if (hasChildren) {
            alert("Cannot delete category because it contains subcategories. Please delete or move them first.");
            return;
        }
        
        const catQs = await getQuestionsInCategories([cat.id!]);
        if (catQs.length > 0) {
            alert(`Cannot delete category because it contains ${catQs.length} question(s). Please delete or move them first.`);
            return;
        }

        if (!confirm(`Are you sure you want to delete the category "${cat.name}"?`)) return;
        
        await deleteCategory(cat.id!);
        setCategories(prev => prev.filter(c => c.id !== cat.id));
        
        if (currentCategoryId === cat.id) {
            setBreadcrumb(prev => prev.slice(0, -1));
            setCurrentCategoryId(cat.parentId || null);
        }
    };

    const handleSaveEdit = async (updated: Question) => {
        await updateQuestion(updated.id!, {
            text: updated.text,
            options: updated.options,
            correctAnswerId: updated.correctAnswerId,
            explanation: updated.explanation,
            categoryId: updated.categoryId,
            type: updated.type,
        });
        setQuestions(prev => prev.map(item => item.id === updated.id ? updated : item));
        setEditingQuestion(null);
    };

    if (isCatsLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#111418]">
            {/* Header */}
            <header className="flex-shrink-0 px-8 py-6 border-b border-[#283039] bg-[#111418]">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Question Bank</h2>
                        <p className="text-[#9dabb9] mt-1">Browse and manage your learning materials.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {currentCategoryId !== null && (
                            <Link
                                href={`/quiz/start?categoryId=${currentCategoryId}`}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Play className="w-4 h-4" />
                                Start Quiz
                            </Link>
                        )}
                        <div className="text-sm text-[#9dabb9]">
                            <span className="font-bold text-white">{categories.length}</span> Categories
                            {isAtLeaf && !isQuestionsLoading && (
                                <> · <span className="font-bold text-white">{questions.length}</span> Questions</>
                            )}
                        </div>
                    </div>
                </div>

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 mt-4 text-sm">
                    {breadcrumb.map((item, index) => (
                        <div key={index} className="flex items-center gap-1">
                            {index > 0 && <ChevronRight className="w-4 h-4 text-[#9dabb9]" />}
                            <button
                                onClick={() => navigateToBreadcrumb(item, index)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                                    index === breadcrumb.length - 1
                                        ? "text-white font-semibold cursor-default"
                                        : "text-[#9dabb9] hover:text-white hover:bg-white/5"
                                )}
                            >
                                {index === 0 && <Home className="w-3.5 h-3.5" />}
                                {item.name}
                            </button>
                        </div>
                    ))}
                </nav>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">

                {/* Search bar — only at leaf */}
                {isAtLeaf && (
                    <div className="mb-6 relative max-w-md">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9dabb9]" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1c2127] border border-[#283039] text-white text-sm rounded-lg pl-10 p-2.5 placeholder-[#9dabb9]/50 focus:ring-1 focus:ring-primary outline-none"
                            placeholder="Search questions..."
                        />
                    </div>
                )}

                {/* Subcategory folders */}
                {currentSubcategories.length > 0 && (
                    <div className="mb-8">
                        {currentCategoryId !== null && (
                            <h3 className="text-xs uppercase font-bold text-[#9dabb9] tracking-widest mb-3">Subcategories</h3>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {currentSubcategories.map(cat => {
                                const hasChildren = categories.some(c => c.parentId === cat.id);
                                return (
                                    <div
                                        key={cat.id}
                                        className="group relative flex flex-col gap-3 p-4 bg-[#1c2127] hover:bg-[#283039] border border-[#283039] hover:border-primary/30 rounded-xl transition-all"
                                    >
                                        {/* Action buttons */}
                                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingCategory(cat); }}
                                                        className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                                                        title="Edit Category"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat); }}
                                                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                                                        title="Delete Category"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                            <Link
                                                href={`/quiz/start?categoryId=${cat.id}`}
                                                onClick={e => e.stopPropagation()}
                                                className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                                                title="Start Quiz"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>

                                        {/* Navigate into folder */}
                                        <button
                                            onClick={() => navigateInto(cat)}
                                            className="flex flex-col gap-3 text-left w-full"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                {hasChildren
                                                    ? <FolderOpen className="w-6 h-6 text-primary" />
                                                    : <Folder className="w-6 h-6 text-primary" />
                                                }
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold text-sm leading-tight group-hover:text-primary transition-colors pr-6">
                                                    {cat.name}
                                                </p>
                                                <p className="text-[#9dabb9] text-xs mt-0.5">
                                                    {hasChildren ? "Contains subcategories" : "Leaf category"}
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Leaf: question list */}
                {isAtLeaf && (
                    <div>
                        {isQuestionsLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : filteredQuestions.length > 0 ? (
                            <div className="space-y-3">
                                {filteredQuestions.map(q => (
                                    <div
                                        key={q.id}
                                        className="group flex items-start gap-4 p-4 bg-[#1c2127] border border-[#283039] rounded-xl hover:border-[#283039]/80 transition-all"
                                    >
                                        <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#283039] flex-shrink-0 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-[#9dabb9]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium text-sm leading-relaxed">{q.text}</p>
                                            <span className={cn(
                                                "inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
                                                q.type === "multiple-choice"
                                                    ? "bg-blue-500/10 text-blue-400"
                                                    : "bg-purple-500/10 text-purple-400"
                                            )}>
                                                {q.type}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                            {isAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => setEditingQuestion(q)}
                                                        className="p-1.5 text-[#9dabb9] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteQuestion(q)}
                                                        className="p-1.5 text-[#9dabb9] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-[#1c2127] rounded-full flex items-center justify-center mb-4">
                                    <BookOpen className="w-8 h-8 text-[#9dabb9]" />
                                </div>
                                <p className="text-white font-semibold">No questions here</p>
                                <p className="text-[#9dabb9] text-sm mt-1">
                                    {searchTerm ? "No questions match your search." : "This category has no questions yet."}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Root empty state */}
                {currentCategoryId === null && currentSubcategories.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-[#1c2127] rounded-full flex items-center justify-center mb-4">
                            <Folder className="w-8 h-8 text-[#9dabb9]" />
                        </div>
                        <p className="text-white font-semibold">No categories yet</p>
                        <p className="text-[#9dabb9] text-sm mt-1">Generate some questions first to populate your Question Bank.</p>
                    </div>
                )}
            </div>

            {/* Edit Question Modal — admin only */}
            {isAdmin && editingQuestion && (
                <EditQuestionModal
                    question={editingQuestion}
                    categories={categories}
                    onSave={handleSaveEdit}
                    onClose={() => setEditingQuestion(null)}
                />
            )}
            {/* Edit Category Modal — admin only */}
            {isAdmin && editingCategory && (
                <EditCategoryModal
                    category={editingCategory}
                    categories={categories}
                    onSave={handleSaveCategoryEdit}
                    onClose={() => setEditingCategory(null)}
                />
            )}
        </div>
    );
}
