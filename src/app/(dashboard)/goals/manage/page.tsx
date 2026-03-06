"use client";

import { useState, useEffect } from "react";
import { useAuth, UserDoc } from "@/contexts/auth-context";
import {
    createGoal, getGoals, getAllUsers, assignGoalToUser, removeGoalFromUser,
    getCategories, assignCategoryToGoal, removeCategoryFromGoal,
} from "@/lib/db";
import { Goal, Category } from "@/lib/schemas";
import { Loader2, Plus, Target, Users, Folder, CheckSquare, Square, Search, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type AssignmentTab = "users" | "folders";

export default function ManageGoalsPage() {
    const { user, isAdmin } = useAuth();

    const [goals, setGoals] = useState<Goal[]>([]);
    const [users, setUsers] = useState<(UserDoc & { assignedGoalIds?: string[] })[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // New goal form
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    // Expanded goal
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<AssignmentTab>("folders");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!isAdmin) return;
        loadData();
    }, [isAdmin]);

    const loadData = async () => {
        try {
            const [fetchedGoals, fetchedUsers, fetchedCats] = await Promise.all([
                getGoals(),
                getAllUsers(),
                getCategories(), // Get ALL categories (no goalId filter)
            ]);
            setGoals(fetchedGoals);
            setUsers(fetchedUsers as any[]);
            setAllCategories(fetchedCats);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || !user) return;

        setIsCreating(true);
        try {
            await createGoal({
                name: newName.trim(),
                description: newDescription.trim(),
                createdBy: user.uid,
                createdAt: Date.now(),
            });
            setNewName("");
            setNewDescription("");
            await loadData();
        } catch (err) {
            console.error(err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleUser = async (userId: string, goalId: string, isAssigned: boolean) => {
        try {
            if (isAssigned) {
                await removeGoalFromUser(userId, goalId);
            } else {
                await assignGoalToUser(userId, goalId);
            }
            setUsers(prev =>
                prev.map(u => {
                    if (u.uid !== userId) return u;
                    const ids = u.assignedGoalIds ?? [];
                    return {
                        ...u,
                        assignedGoalIds: isAssigned
                            ? ids.filter(id => id !== goalId)
                            : [...ids, goalId],
                    };
                })
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleCategory = async (categoryId: string, goalId: string, isAssigned: boolean) => {
        try {
            // Only write to the root category — 1 Firestore write, not 88+
            if (isAssigned) {
                await removeCategoryFromGoal(categoryId, goalId);
            } else {
                await assignCategoryToGoal(categoryId, goalId);
            }
            // Optimistically update local state for just this category
            setAllCategories(prev =>
                prev.map(c => {
                    if (c.id !== categoryId) return c;
                    const ids = c.goalIds ?? [];
                    return {
                        ...c,
                        goalIds: isAssigned
                            ? ids.filter(id => id !== goalId)
                            : [...ids, goalId],
                    };
                })
            );
        } catch (err) {
            console.error(err);
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex h-full items-center justify-center p-6 text-center">
                <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <h2 className="text-xl font-bold text-red-500 mb-2">Access Denied</h2>
                    <p className="text-[#9dabb9]">You must be an administrator to manage goals.</p>
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

    const filteredUsers = users.filter(u =>
        u.displayUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Only show root (top-level) categories — those with no parentId
    const rootCategories = allCategories.filter(c => !c.parentId);

    const filteredCategories = rootCategories.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#111418] overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl w-full mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Target className="w-8 h-8 text-primary" />
                        Manage Goals
                    </h1>
                    <p className="text-[#9dabb9] mt-2">
                        Create goals and assign folders &amp; users to them. Each goal has its own isolated set of questions, categories, and tests.
                    </p>
                </div>

                {/* Create New Goal */}
                <form onSubmit={handleCreateGoal} className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6 shadow-xl space-y-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Create New Goal
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Goal Name</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="w-full bg-[#111418] border border-[#283039] text-white rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                placeholder="e.g. Physics 101"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description (optional)</label>
                            <input
                                type="text"
                                value={newDescription}
                                onChange={e => setNewDescription(e.target.value)}
                                className="w-full bg-[#111418] border border-[#283039] text-white rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                                placeholder="e.g. First year physics course"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isCreating || !newName.trim()}
                            className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create Goal
                        </button>
                    </div>
                </form>

                {/* Goals List */}
                {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Target className="w-16 h-16 text-[#283039] mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Goals Yet</h3>
                        <p className="text-[#9dabb9] max-w-sm">Create your first goal above to start organizing your content.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {goals.map(goal => {
                            const isExpanded = expandedGoalId === goal.id;
                            const assignedUserCount = users.filter(u => u.assignedGoalIds?.includes(goal.id!)).length;
                            const assignedFolderCount = allCategories.filter(c => c.goalIds?.includes(goal.id!)).length;

                            return (
                                <div key={goal.id} className="bg-[#1c2127] border border-[#283039] rounded-2xl overflow-hidden shadow-xl">
                                    <button
                                        onClick={() => {
                                            setExpandedGoalId(isExpanded ? null : goal.id!);
                                            setSearchTerm("");
                                        }}
                                        className="w-full flex items-center justify-between p-5 text-left hover:bg-[#283039]/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                                                <Target className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-bold">{goal.name}</h3>
                                                {goal.description && <p className="text-xs text-[#9dabb9] mt-0.5">{goal.description}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full">{assignedFolderCount} folders</span>
                                            <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full">{assignedUserCount} users</span>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9dabb9] ml-1" /> : <ChevronDown className="w-4 h-4 text-[#9dabb9] ml-1" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-[#283039]">
                                            {/* Tabs */}
                                            <div className="flex border-b border-[#283039]">
                                                <button
                                                    onClick={() => { setActiveTab("folders"); setSearchTerm(""); }}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                                                        activeTab === "folders"
                                                            ? "text-primary border-b-2 border-primary bg-primary/5"
                                                            : "text-[#9dabb9] hover:text-white"
                                                    )}
                                                >
                                                    <Folder className="w-4 h-4" />
                                                    Folders ({assignedFolderCount})
                                                </button>
                                                <button
                                                    onClick={() => { setActiveTab("users"); setSearchTerm(""); }}
                                                    className={cn(
                                                        "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                                                        activeTab === "users"
                                                            ? "text-primary border-b-2 border-primary bg-primary/5"
                                                            : "text-[#9dabb9] hover:text-white"
                                                    )}
                                                >
                                                    <Users className="w-4 h-4" />
                                                    Users ({assignedUserCount})
                                                </button>
                                            </div>

                                            <div className="p-5 space-y-4">
                                                {/* Search */}
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9dabb9]" />
                                                    <input
                                                        type="text"
                                                        placeholder={activeTab === "folders" ? "Search folders..." : "Search users..."}
                                                        value={searchTerm}
                                                        onChange={e => setSearchTerm(e.target.value)}
                                                        className="w-full bg-[#111418] border border-[#283039] text-white text-sm rounded-lg pl-9 pr-4 py-2 outline-none focus:border-primary transition-colors"
                                                    />
                                                </div>

                                                {/* Folders Tab */}
                                                {activeTab === "folders" && (
                                                    <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                                                        {filteredCategories.length === 0 ? (
                                                            <p className="text-center text-[#9dabb9] text-sm py-4">No folders found.</p>
                                                        ) : (
                                                            filteredCategories.map(cat => {
                                                                const isAssigned = cat.goalIds?.includes(goal.id!) ?? false;
                                                                return (
                                                                    <button
                                                                        key={cat.id}
                                                                        onClick={() => handleToggleCategory(cat.id!, goal.id!, isAssigned)}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                                                            isAssigned
                                                                                ? "bg-emerald-500/10 border-emerald-500/50 text-white"
                                                                                : "bg-[#111418] border-[#283039] text-[#9dabb9] hover:bg-[#283039]"
                                                                        )}
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0 pr-4">
                                                                            <Folder className={cn("w-4 h-4 shrink-0", isAssigned ? "text-emerald-400" : "text-[#9dabb9]")} />
                                                                            <span className="text-sm font-medium truncate">{cat.name}</span>
                                                                        </div>
                                                                        {isAssigned ? <CheckSquare className="w-4 h-4 shrink-0 text-emerald-400" /> : <Square className="w-4 h-4 shrink-0" />}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}

                                                {/* Users Tab */}
                                                {activeTab === "users" && (
                                                    <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                                                        {filteredUsers.length === 0 ? (
                                                            <p className="text-center text-[#9dabb9] text-sm py-4">No users found.</p>
                                                        ) : (
                                                            filteredUsers.map(u => {
                                                                const isAssigned = u.assignedGoalIds?.includes(goal.id!) ?? false;
                                                                return (
                                                                    <button
                                                                        key={u.uid}
                                                                        onClick={() => handleToggleUser(u.uid, goal.id!, isAssigned)}
                                                                        className={cn(
                                                                            "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                                                                            isAssigned
                                                                                ? "bg-primary/10 border-primary/50 text-white"
                                                                                : "bg-[#111418] border-[#283039] text-[#9dabb9] hover:bg-[#283039]"
                                                                        )}
                                                                    >
                                                                        <div className="flex flex-col min-w-0 pr-4">
                                                                            <span className="text-sm font-medium truncate">{u.displayUsername}</span>
                                                                            <span className="text-xs opacity-70 truncate">{u.email}</span>
                                                                        </div>
                                                                        {isAssigned ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" /> : <Square className="w-4 h-4 shrink-0" />}
                                                                    </button>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
