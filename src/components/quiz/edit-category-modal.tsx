"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Save, ChevronRight, FolderMinus } from "lucide-react";
import { Category } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface EditCategoryModalProps {
    category: Category;
    categories: Category[];
    onSave: (updated: Category) => void;
    onClose: () => void;
}

export function EditCategoryModal({ category, categories, onSave, onClose }: EditCategoryModalProps) {
    const [name, setName] = useState(category.name);
    const [parentId, setParentId] = useState<string | null>(category.parentId ?? null);
    const [isSaving, setIsSaving] = useState(false);

    // Calculate disabled categories (the category itself and all its descendants)
    const invalidParentIds = useMemo(() => {
        const getDescendants = (pid: string): string[] => {
            const children = categories.filter(c => c.parentId === pid).map(c => c.id!);
            return children.reduce((acc, childId) => [...acc, childId, ...getDescendants(childId)], [] as string[]);
        };
        return new Set([category.id!, ...getDescendants(category.id!)]);
    }, [category.id, categories]);

    // Category picker state
    const [catBreadcrumb, setCatBreadcrumb] = useState<Category[]>([]);
    const currentPickerParentId = catBreadcrumb.length > 0 ? catBreadcrumb[catBreadcrumb.length - 1].id ?? null : null;
    const visibleCats = categories.filter(c => (c.parentId ?? null) === currentPickerParentId);
    
    // The currently selected parent object for display
    const selectedParentCat = parentId ? categories.find(c => c.id === parentId) : null;

    // Prevent body scroll
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        const updated: Category = {
            ...category,
            name: name.trim(),
            parentId: parentId || undefined,
        };
        // Remove parentId key cleanly if null
        if (!parentId) delete updated.parentId;
        
        await onSave(updated);
        setIsSaving(false);
    };

    const isValid = name.trim().length >= 2;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative bg-[#1c2127] border border-[#283039] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#283039]">
                    <h2 className="text-lg font-bold text-white">Edit Folder</h2>
                    <button onClick={onClose} className="p-1.5 text-[#9dabb9] hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Folder Name */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Folder Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-[#111418] border border-[#283039] rounded-xl p-3 text-sm text-white placeholder:text-[#9dabb9]/50 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                            placeholder="e.g. History"
                        />
                    </div>

                    {/* Parent Category Picker */}
                    <div>
                        <label className="block text-xs font-semibold text-[#9dabb9] uppercase tracking-wider mb-2">Move to Parent Folder</label>

                        {/* Current selection display */}
                        <div className="mb-3 flex items-center justify-between bg-[#111418] border border-[#283039] rounded-xl p-3">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-[#9dabb9]">Current Location:</span>
                                <span className={cn(
                                    "font-medium",
                                    selectedParentCat ? "text-primary" : "text-emerald-500"
                                )}>
                                    {selectedParentCat ? selectedParentCat.name : "Root (Top Level)"}
                                </span>
                            </div>
                            {parentId && (
                                <button
                                    onClick={() => setParentId(null)}
                                    className="p-1.5 text-[#9dabb9] hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                    title="Move to root"
                                >
                                    <FolderMinus className="w-3.5 h-3.5" />
                                    Move to Root
                                </button>
                            )}
                        </div>

                        {/* Breadcrumb for browsing */}
                        <div className="mb-2">
                            <div className="flex items-center gap-1 text-xs flex-wrap bg-[#111418] p-2 rounded-lg border border-[#283039]">
                                <button
                                    onClick={() => setCatBreadcrumb([])}
                                    className="text-[#9dabb9] hover:text-white font-medium transition-colors"
                                >
                                    Top Level
                                </button>
                                {catBreadcrumb.map((c, i) => (
                                    <span key={c.id} className="flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3 text-[#9dabb9]" />
                                        <button
                                            onClick={() => setCatBreadcrumb(prev => prev.slice(0, i + 1))}
                                            className={cn(
                                                "transition-colors",
                                                i === catBreadcrumb.length - 1 ? "text-white font-medium" : "text-[#9dabb9] hover:text-white"
                                            )}
                                        >
                                            {c.name}
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Category list browser */}
                        <div className="bg-[#111418] border border-[#283039] rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                            {visibleCats.length === 0 ? (
                                <p className="text-xs text-[#9dabb9]/50 text-center py-4">No subfolders here</p>
                            ) : (
                                visibleCats.map(cat => {
                                    const hasChildren = categories.some(c => c.parentId === cat.id);
                                    const isSelected = parentId === cat.id;
                                    const isDisabled = invalidParentIds.has(cat.id!);
                                    
                                    return (
                                        <div
                                            key={cat.id}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-2.5 border-b border-[#283039] last:border-0 transition-colors",
                                                isSelected && !isDisabled ? "bg-primary/10" : "hover:bg-white/5",
                                                isDisabled && "opacity-50"
                                            )}
                                        >
                                            <button
                                                onClick={() => !isDisabled && setParentId(cat.id!)}
                                                disabled={isDisabled}
                                                className={cn(
                                                    "flex-1 text-left text-sm transition-colors",
                                                    isSelected && !isDisabled ? "text-primary font-semibold" : "text-white",
                                                    isDisabled && "cursor-not-allowed"
                                                )}
                                            >
                                                {cat.name}
                                                {isDisabled && cat.id === category.id && " (Current)"}
                                            </button>
                                            {hasChildren && !isDisabled && (
                                                <button
                                                    onClick={() => setCatBreadcrumb(prev => [...prev, cat])}
                                                    className="ml-2 p-1 text-[#9dabb9] hover:text-white hover:bg-white/5 rounded transition-colors flex-shrink-0"
                                                    title="Browse subfolders"
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
