"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Users,
    Search,
    ShieldCheck,
    Shield,
    Loader2,
    ChevronDown,
    ChevronUp,
    Mail,
    Clock,
    Zap,
    Target,
    Filter,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, PERMISSIONS, PERMISSION_LABELS, type PermissionKey, type UserDoc } from "@/contexts/auth-context";
import { useGoal } from "@/contexts/goal-context";
import { getAllUsers, updateUserPermissions, assignGoalToUser, removeGoalFromUser, deleteUserDoc } from "@/lib/db";
import { useRouter } from "next/navigation";

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionKey[];

// Permission chip colors for visual distinction
const PERMISSION_COLORS: Record<PermissionKey, { bg: string; text: string; activeBg: string; activeText: string }> = {
    generate_questions: { bg: "bg-violet-500/10", text: "text-violet-400", activeBg: "bg-violet-500", activeText: "text-white" },
    edit_questions: { bg: "bg-blue-500/10", text: "text-blue-400", activeBg: "bg-blue-500", activeText: "text-white" },
    manage_tests: { bg: "bg-emerald-500/10", text: "text-emerald-400", activeBg: "bg-emerald-500", activeText: "text-white" },
    manage_goals: { bg: "bg-amber-500/10", text: "text-amber-400", activeBg: "bg-amber-500", activeText: "text-white" },
    view_analytics: { bg: "bg-rose-500/10", text: "text-rose-400", activeBg: "bg-rose-500", activeText: "text-white" },
};

interface UserWithId extends UserDoc {
    id: string;
}

export default function ManageUsersPage() {
    const { isAdmin, isLoading: authLoading } = useAuth();
    const { goals, activeGoalId } = useGoal();
    const router = useRouter();

    const [users, setUsers] = useState<UserWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [expandedUser, setExpandedUser] = useState<string | null>(null);
    const [savingUser, setSavingUser] = useState<string | null>(null);
    const [deletingUser, setDeletingUser] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<"name" | "role">("role");
    const [filterByActiveGoal, setFilterByActiveGoal] = useState(false);

    useEffect(() => {
        if (!authLoading && !isAdmin) {
            router.replace("/");
        }
    }, [isAdmin, authLoading, router]);

    // Load all users
    useEffect(() => {
        if (!isAdmin) return;
        setIsLoading(true);
        getAllUsers()
            .then((data) => {
                setUsers(data.map((u: any) => ({ ...u, id: u.id })) as UserWithId[]);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [isAdmin]);

    // Filter and sort users
    const filteredUsers = useMemo(() => {
        let result = users;

        // Active goal filter
        if (filterByActiveGoal && activeGoalId) {
            result = result.filter(u => u.role === "admin" || (u.assignedGoalIds && u.assignedGoalIds.includes(activeGoalId)));
        }

        // Search filter
        if (search.trim()) {
            const term = search.toLowerCase();
            result = result.filter(
                (u) =>
                    u.displayUsername?.toLowerCase().includes(term) ||
                    u.username?.toLowerCase().includes(term) ||
                    u.email?.toLowerCase().includes(term)
            );
        }

        // Sort
        result = [...result].sort((a, b) => {
            if (sortBy === "role") {
                // Admins first, then elevated, then regular users
                const roleOrder = (u: UserWithId) => {
                    if (u.role === "admin") return 0;
                    if (u.permissions && u.permissions.length > 0) return 1;
                    return 2;
                };
                const diff = roleOrder(a) - roleOrder(b);
                if (diff !== 0) return diff;
            }
            return (a.displayUsername || "").localeCompare(b.displayUsername || "");
        });

        return result;
    }, [users, search, sortBy]);

    // Toggle a permission for a user
    const togglePermission = async (userId: string, perm: PermissionKey) => {
        const user = users.find((u) => u.id === userId);
        if (!user || user.role === "admin") return; // Can't modify admin permissions

        const currentPerms = user.permissions || [];
        const newPerms = currentPerms.includes(perm)
            ? currentPerms.filter((p) => p !== perm)
            : [...currentPerms, perm];

        // Optimistic update
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, permissions: newPerms } : u))
        );

        setSavingUser(userId);
        try {
            await updateUserPermissions(userId, newPerms);
        } catch (error) {
            console.error("Failed to update permissions:", error);
            // Revert optimistic update
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, permissions: currentPerms } : u))
            );
        } finally {
            setSavingUser(null);
        }
    };

    // Toggle a goal assignment for a user
    const toggleGoal = async (userId: string, goalId: string) => {
        const user = users.find((u) => u.id === userId);
        if (!user || user.role === "admin") return;

        const currentGoals = user.assignedGoalIds || [];
        const isAssigned = currentGoals.includes(goalId);
        const newGoals = isAssigned
            ? currentGoals.filter((id) => id !== goalId)
            : [...currentGoals, goalId];

        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, assignedGoalIds: newGoals } : u))
        );

        setSavingUser(userId);
        try {
            if (isAssigned) {
                await removeGoalFromUser(userId, goalId);
            } else {
                await assignGoalToUser(userId, goalId);
            }
        } catch (error) {
            console.error("Failed to update goals:", error);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, assignedGoalIds: currentGoals } : u))
            );
        } finally {
            setSavingUser(null);
        }
    };

    // Grant all permissions to a user
    const grantAll = async (userId: string) => {
        const user = users.find((u) => u.id === userId);
        if (!user || user.role === "admin") return;

        const newPerms = [...ALL_PERMISSIONS];
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, permissions: newPerms } : u))
        );

        setSavingUser(userId);
        try {
            await updateUserPermissions(userId, newPerms);
        } catch (error) {
            console.error("Failed to update permissions:", error);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, permissions: user.permissions || [] } : u))
            );
        } finally {
            setSavingUser(null);
        }
    };

    // Revoke all permissions from a user
    const revokeAll = async (userId: string) => {
        const user = users.find((u) => u.id === userId);
        if (!user || user.role === "admin") return;

        const oldPerms = user.permissions || [];
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, permissions: [] } : u))
        );

        setSavingUser(userId);
        try {
            await updateUserPermissions(userId, []);
        } catch (error) {
            console.error("Failed to update permissions:", error);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, permissions: oldPerms } : u))
            );
        } finally {
            setSavingUser(null);
        }
    };

    // Delete a user
    const handleDeleteUser = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? Their profile data will be permanently deleted and they will lose access. This action cannot be undone.")) return;
        
        setDeletingUser(userId);
        try {
            await deleteUserDoc(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            if (expandedUser === userId) setExpandedUser(null);
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("Failed to delete user. Check console for details.");
        } finally {
            setDeletingUser(null);
        }
    };

    // Guard
    if (authLoading || !isAdmin) {
        return (
            <div className="flex h-full items-center justify-center bg-[#111418]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#9dabb9] text-sm">Checking permissions…</p>
                </div>
            </div>
        );
    }

    const adminCount = users.filter((u) => u.role === "admin").length;
    const elevatedCount = users.filter(
        (u) => u.role !== "admin" && u.permissions && u.permissions.length > 0
    ).length;

    return (
        <div className="flex-1 overflow-y-auto bg-[#0b0e11]">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0b0e11]/95 backdrop-blur-sm border-b border-[#283039]">
                <div className="max-w-5xl mx-auto px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                User Management
                            </h1>
                            <p className="text-[#9dabb9] text-sm mt-1">
                                Manage user roles and permissions
                            </p>
                        </div>

                        {/* Stats chips */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-[#1c2127] border border-[#283039] rounded-lg px-3 py-1.5 text-xs">
                                <Users className="w-3.5 h-3.5 text-[#9dabb9]" />
                                <span className="text-white font-medium">{users.length}</span>
                                <span className="text-[#9dabb9]">total</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 text-xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-amber-400 font-medium">{adminCount}</span>
                                <span className="text-amber-400/70">admins</span>
                            </div>
                            {elevatedCount > 0 && (
                                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 text-xs">
                                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="text-blue-400 font-medium">{elevatedCount}</span>
                                    <span className="text-blue-400/70">elevated</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search and Sort */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
                        <button
                            onClick={() => setFilterByActiveGoal(!filterByActiveGoal)}
                            disabled={!activeGoalId}
                            className={cn(
                                "flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 transition-colors whitespace-nowrap border",
                                filterByActiveGoal
                                    ? "bg-primary/20 border-primary text-primary font-medium"
                                    : "bg-[#1c2127] border-[#283039] text-[#9dabb9] hover:text-white hover:border-primary/50 disabled:opacity-50 disabled:pointer-events-none"
                            )}
                            title={activeGoalId ? "Filter users by current target goal" : "No active goal selected"}
                        >
                            <Filter className="w-4 h-4" />
                            {filterByActiveGoal ? "Goal Filter Active" : "Filter by Goal"}
                        </button>
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9dabb9]" />
                            <input
                                type="text"
                                placeholder="Search by username or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-[#1c2127] border border-[#283039] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-primary/50 placeholder:text-[#9dabb9]/50 transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => setSortBy(sortBy === "role" ? "name" : "role")}
                            className="flex items-center gap-2 bg-[#1c2127] border border-[#283039] text-[#9dabb9] text-sm rounded-xl px-4 py-2.5 hover:text-white hover:border-primary/50 transition-colors whitespace-nowrap"
                        >
                            Sort: {sortBy === "role" ? "By Role" : "By Name"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-6 py-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#9dabb9]" />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-20 text-[#9dabb9]">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>{search ? "No users match your search." : "No users found."}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredUsers.map((user) => {
                            const isUserAdmin = user.role === "admin";
                            const isExpanded = expandedUser === user.id;
                            const userPerms = user.permissions || [];
                            const hasElevatedPerms = !isUserAdmin && userPerms.length > 0;
                            const isSaving = savingUser === user.id;

                            return (
                                <div
                                    key={user.id}
                                    className={cn(
                                        "bg-[#1c2127] border rounded-xl overflow-hidden transition-all",
                                        isUserAdmin
                                            ? "border-amber-500/20"
                                            : hasElevatedPerms
                                                ? "border-blue-500/20"
                                                : "border-[#283039]",
                                        isExpanded && "ring-1 ring-primary/30"
                                    )}
                                >
                                    {/* User Row */}
                                    <button
                                        onClick={() =>
                                            setExpandedUser(isExpanded ? null : user.id)
                                        }
                                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#283039]/20 transition-colors"
                                    >
                                        {/* Avatar */}
                                        <div
                                            className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                                                isUserAdmin
                                                    ? "bg-gradient-to-tr from-amber-500 to-orange-500"
                                                    : hasElevatedPerms
                                                        ? "bg-gradient-to-tr from-blue-500 to-cyan-500"
                                                        : "bg-gradient-to-tr from-primary to-purple-500"
                                            )}
                                        >
                                            {user.displayUsername?.[0]?.toUpperCase() ?? "?"}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-medium text-sm truncate">
                                                    {user.displayUsername || user.username}
                                                </span>
                                                {isUserAdmin && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full">
                                                        <ShieldCheck className="w-3 h-3" />
                                                        Admin
                                                    </span>
                                                )}
                                                {hasElevatedPerms && (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                                                        <Zap className="w-3 h-3" />
                                                        Elevated
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="text-xs text-[#9dabb9] flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {user.email}
                                                </span>
                                                {!isUserAdmin && userPerms.length > 0 && (
                                                    <span className="text-xs text-blue-400/70">
                                                        {userPerms.length} perm{userPerms.length !== 1 ? "s" : ""}
                                                    </span>
                                                )}
                                                {!isUserAdmin && user.assignedGoalIds && user.assignedGoalIds.length > 0 && (
                                                    <span className="text-xs text-amber-400/70 flex items-center gap-1">
                                                        <Target className="w-3 h-3" />
                                                        {user.assignedGoalIds.length} goal{user.assignedGoalIds.length !== 1 ? "s" : ""}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Saving indicator / Expand icon */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isSaving && (
                                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            )}
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-[#9dabb9]" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-[#9dabb9]" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded Panel */}
                                    {isExpanded && (
                                        <div className="border-t border-[#283039]/50 px-5 py-4 bg-[#111418]/50">
                                            {isUserAdmin ? (
                                                <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                                                    <div>
                                                        <p className="text-sm text-amber-200 font-medium">
                                                            Full Admin Access
                                                        </p>
                                                        <p className="text-xs text-amber-200/60 mt-0.5">
                                                            Admins have all permissions by default.
                                                            Manage admin roles directly in Firestore.
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-white">
                                                            Permissions
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => grantAll(user.id)}
                                                                className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                                                            >
                                                                Grant All
                                                            </button>
                                                            <span className="text-[#283039]">|</span>
                                                            <button
                                                                onClick={() => revokeAll(user.id)}
                                                                className="text-xs text-red-400 hover:text-red-400/80 font-medium transition-colors"
                                                            >
                                                                Revoke All
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {ALL_PERMISSIONS.map((perm) => {
                                                            const isActive = userPerms.includes(perm);
                                                            const colors = PERMISSION_COLORS[perm];
                                                            return (
                                                                <button
                                                                    key={perm}
                                                                    onClick={() =>
                                                                        togglePermission(user.id, perm)
                                                                    }
                                                                    disabled={isSaving}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
                                                                        isActive
                                                                            ? `${colors.activeBg} ${colors.activeText} shadow-sm`
                                                                            : `${colors.bg} ${colors.text} hover:opacity-80`
                                                                    )}
                                                                >
                                                                    <div
                                                                        className={cn(
                                                                            "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                                                                            isActive
                                                                                ? "border-white/30 bg-white/20"
                                                                                : "border-current/30"
                                                                        )}
                                                                    >
                                                                        {isActive && (
                                                                            <svg
                                                                                className="w-2.5 h-2.5"
                                                                                fill="none"
                                                                                viewBox="0 0 24 24"
                                                                                stroke="currentColor"
                                                                                strokeWidth={3}
                                                                            >
                                                                                <path
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                    d="M5 13l4 4L19 7"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                    {PERMISSION_LABELS[perm]}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-4">
                                                        <p className="text-sm font-medium text-white flex items-center gap-2">
                                                            <Target className="w-4 h-4 text-[#9dabb9]" />
                                                            Assigned Goals
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        {goals && goals.length > 0 ? goals.map((goal) => {
                                                            const isAssigned = user.assignedGoalIds?.includes(goal.id!);
                                                            return (
                                                                <button
                                                                    key={goal.id}
                                                                    onClick={() => toggleGoal(user.id, goal.id!)}
                                                                    disabled={isSaving}
                                                                    className={cn(
                                                                        "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50",
                                                                        isAssigned
                                                                            ? "bg-amber-500 text-white shadow-sm"
                                                                            : "bg-amber-500/10 text-amber-400 hover:opacity-80"
                                                                    )}
                                                                >
                                                                    <div
                                                                        className={cn(
                                                                            "w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors",
                                                                            isAssigned
                                                                                ? "border-white/30 bg-white/20"
                                                                                : "border-amber-400/30"
                                                                        )}
                                                                    >
                                                                        {isAssigned && (
                                                                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                    {goal.name}
                                                                </button>
                                                            );
                                                        }) : (
                                                            <p className="text-xs text-[#9dabb9]/60 italic">No goals created yet.</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between mt-4 md:mt-6 pt-4 border-t border-[#283039]/50">
                                                        {(userPerms.length > 0 || (user.assignedGoalIds && user.assignedGoalIds.length > 0)) ? (
                                                            <p className="text-xs text-[#9dabb9]/60 flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                Changes are saved automatically
                                                            </p>
                                                        ) : <div />}
                                                        
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            disabled={deletingUser === user.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50"
                                                        >
                                                            {deletingUser === user.id ? (
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            )}
                                                            Delete User
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
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
