"use client";

import { useState, useEffect } from "react";
import { getCategories, getAllUsers, getMockTest } from "@/lib/db";
import { Category } from "@/lib/schemas";
import { createMockTestAction, updateMockTestAction } from "@/app/actions/mock-test-actions";
import { useAuth, UserDoc } from "@/contexts/auth-context";
import { useGoal } from "@/contexts/goal-context";
import { Loader2, Plus, Users, Folder, Clock, CheckSquare, Square, Search, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ManageMockTestsContent() {
    const { user, isAdmin } = useAuth();
    const { activeGoalId } = useGoal();
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");
    const [isEditMode, setIsEditMode] = useState(false);

    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<UserDoc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [title, setTitle] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(15);
    const [numQuestions, setNumQuestions] = useState(20);
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [searchUser, setSearchUser] = useState("");
    const [searchFolder, setSearchFolder] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;
        setIsLoading(true);
        const fetchAll = async () => {
            try {
                const [cats, allUsers] = await Promise.all([
                    getCategories(activeGoalId ?? undefined), 
                    getAllUsers(activeGoalId ?? undefined)
                ]);
                setCategories(cats);
                setUsers(allUsers as any as UserDoc[]);

                if (editId) {
                    const test = await getMockTest(editId);
                    if (test) {
                        setIsEditMode(true);
                        setTitle(test.title);
                        setDurationMinutes(test.durationMinutes);
                        setNumQuestions(test.numQuestions);
                        setSelectedCategories(new Set(test.categoryIds));
                        setSelectedUsers(new Set(test.targetUserIds));
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAll();
    }, [isAdmin, activeGoalId, editId]);

    if (!isAdmin) {
        return (
            <div className="flex h-full items-center justify-center p-6 text-center">
                <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
                    <p className="text-[#9dabb9]">You must be an administrator to manage mock tests.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const toggleCategory = (id: string) => {
        const next = new Set(selectedCategories);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCategories(next);
    };

    const toggleUser = (uid: string) => {
        const next = new Set(selectedUsers);
        if (next.has(uid)) next.delete(uid);
        else next.add(uid);
        setSelectedUsers(next);
    };

    const handleCreateTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!title.trim()) return setError("Title is required.");
        if (selectedCategories.size === 0) return setError("Select at least one category.");
        if (selectedUsers.size === 0) return setError("Select at least one target user.");

        setIsSubmitting(true);
        try {
            if (isEditMode && editId) {
                await updateMockTestAction(
                    editId,
                    title.trim(),
                    durationMinutes,
                    numQuestions,
                    Array.from(selectedCategories),
                    Array.from(selectedUsers),
                    user!.uid
                );
            } else {
                await createMockTestAction(
                    title.trim(),
                    durationMinutes,
                    numQuestions,
                    Array.from(selectedCategories),
                    Array.from(selectedUsers),
                    user!.uid,
                    activeGoalId ?? undefined
                );
            }
            setSuccess(true);
            setTitle("");
            setSelectedCategories(new Set());
            setSelectedUsers(new Set());
            setTimeout(() => router.push("/mock-tests"), 2000);
        } catch (err: any) {
            console.error(err);
            setError(err.message || `Failed to ${isEditMode ? "update" : "create"} mock test.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.displayUsername?.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchUser.toLowerCase())
    );

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchFolder.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#111418] overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl w-full mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        {isEditMode ? <Edit2 className="w-8 h-8 text-primary" /> : <Plus className="w-8 h-8 text-primary" />}
                        {isEditMode ? "Update Mock Test" : "Create Mock Test"}
                    </h1>
                    <p className="text-[#9dabb9] mt-2">
                        Configure a timed examination. Questions will be randomly pulled from your selected categories.
                    </p>
                </div>

                <form onSubmit={handleCreateTest} className="space-y-6">
                    {/* Basic Info */}
                    <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6 shadow-xl space-y-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Test Configuration
                        </h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Test Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-[#111418] border border-[#283039] text-white rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                placeholder="e.g. Midterm Physics Simulation"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="300"
                                    value={durationMinutes}
                                    onChange={e => setDurationMinutes(parseInt(e.target.value) || 15)}
                                    className="w-full bg-[#111418] border border-[#283039] text-white rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Number of Questions</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={numQuestions}
                                    onChange={e => setNumQuestions(parseInt(e.target.value) || 20)}
                                    className="w-full bg-[#111418] border border-[#283039] text-white rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6 shadow-xl flex flex-col h-[400px]">
                            <h2 className="text-lg font-bold text-white flex items-center justify-between gap-2 mb-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-amber-500" />
                                    Source Folders
                                </div>
                                <span className="text-xs bg-[#283039] px-2 py-1 rounded text-[#9dabb9]">{selectedCategories.size} selected</span>
                            </h2>

                            <div className="relative mb-4 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9dabb9]" />
                                <input
                                    type="text"
                                    placeholder="Search folders..."
                                    value={searchFolder}
                                    onChange={e => setSearchFolder(e.target.value)}
                                    className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:border-amber-500 transition-colors"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedCategories.size === filteredCategories.length && filteredCategories.length > 0) setSelectedCategories(new Set());
                                    else setSelectedCategories(new Set(filteredCategories.map(c => c.id!)));
                                }}
                                className="text-xs font-medium text-amber-500 hover:text-amber-400 text-left mb-3 shrink-0 transition-colors"
                            >
                                {selectedCategories.size === filteredCategories.length && filteredCategories.length > 0 ? "Deselect All" : "Select All Visible"}
                            </button>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {filteredCategories.length === 0 ? (
                                    <p className="text-sm text-[#9dabb9] italic">No categories found.</p>
                                ) : filteredCategories.map(cat => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => toggleCategory(cat.id!)}
                                        className={cn(
                                            "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                                            selectedCategories.has(cat.id!)
                                                ? "bg-amber-500/10 border-amber-500/50 text-white"
                                                : "bg-[#111418] border-[#283039] text-[#9dabb9] hover:bg-[#283039]"
                                        )}
                                    >
                                        {selectedCategories.has(cat.id!) ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4" />}
                                        <span className="text-sm font-medium truncate">{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assign Users */}
                        <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6 shadow-xl flex flex-col h-[400px]">
                            <h2 className="text-lg font-bold text-white flex items-center justify-between gap-2 mb-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-emerald-500" />
                                    Assign Users
                                </div>
                                <span className="text-xs bg-[#283039] px-2 py-1 rounded text-[#9dabb9]">{selectedUsers.size} selected</span>
                            </h2>

                            <div className="relative mb-4 shrink-0">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9dabb9]" />
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchUser}
                                    onChange={e => setSearchUser(e.target.value)}
                                    className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    if (selectedUsers.size === filteredUsers.length) setSelectedUsers(new Set());
                                    else setSelectedUsers(new Set(filteredUsers.map(u => u.uid)));
                                }}
                                className="text-xs font-medium text-emerald-500 hover:text-emerald-400 text-left mb-3 shrink-0 transition-colors"
                            >
                                {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? "Deselect All" : "Select All Visible"}
                            </button>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {filteredUsers.length === 0 ? (
                                    <p className="text-sm text-[#9dabb9] italic">No users found.</p>
                                ) : filteredUsers.map(u => (
                                    <button
                                        type="button"
                                        key={u.uid}
                                        onClick={() => toggleUser(u.uid)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                            selectedUsers.has(u.uid)
                                                ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                                                : "bg-[#111418] border-[#283039] text-[#9dabb9] hover:bg-[#283039]"
                                        )}
                                    >
                                        <div className="flex flex-col min-w-0 pr-4">
                                            <span className="text-sm font-medium truncate">{u.displayUsername}</span>
                                            <span className="text-xs opacity-70 truncate">{u.email}</span>
                                        </div>
                                        {selectedUsers.has(u.uid) ? <CheckSquare className="w-4 h-4 shrink-0 text-emerald-500" /> : <Square className="w-4 h-4 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium text-center animate-pulse">
                            Mock Test {isEditMode ? "updated" : "created"} successfully! Redirecting...
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || success}
                            className="flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />)}
                            {isSubmitting ? (isEditMode ? "Updating..." : "Generating...") : (isEditMode ? "Update Mock Test" : "Generate Mock Test")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ManageMockTestsPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <ManageMockTestsContent />
        </Suspense>
    );
}
