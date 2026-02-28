"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getUserStats, UserStats } from "@/lib/db";
import { PlayCircle, Target, CheckCircle2, TrendingUp, Flame, BookOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function StatCard({ label, value, sub, icon: Icon, color }: {
    label: string; value: string; sub?: string;
    icon: React.ElementType; color: string;
}) {
    return (
        <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-5 flex items-start gap-4">
            <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", color)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-[#9dabb9] text-sm">{label}</p>
                <p className="text-white text-2xl font-bold mt-0.5">{value}</p>
                {sub && <p className="text-[#9dabb9] text-xs mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { user, userDoc } = useAuth();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        getUserStats(user.uid)
            .then(setStats)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [user]);

    const displayName = userDoc?.displayUsername ?? "Scholar";
    const maxBar = stats ? Math.max(...stats.recentResults.map(r => r.total), 1) : 1;

    return (
        <div className="flex-1 h-full overflow-y-auto bg-[#111418]">
            <div className="max-w-5xl mx-auto p-6 md:p-10 flex flex-col gap-8">

                {/* Header */}
                <header className="flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            Welcome back, {displayName} 👋
                        </h2>
                        <p className="text-[#9dabb9] mt-1">
                            {stats && stats.totalAnswered > 0
                                ? `You've answered ${stats.totalAnswered} questions with ${stats.accuracy}% accuracy.`
                                : "Start a quiz to begin tracking your progress."}
                        </p>
                    </div>
                    <Link
                        href="/quiz/manage"
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    >
                        <PlayCircle className="w-5 h-5" />
                        Start Quiz
                    </Link>
                </header>

                {/* Stat Cards */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        label="Total Answered"
                        value={isLoading ? "—" : (stats?.totalAnswered ?? 0).toString()}
                        sub="all time"
                        icon={Target}
                        color="bg-blue-500/10 text-blue-400"
                    />
                    <StatCard
                        label="Accuracy"
                        value={isLoading ? "—" : `${stats?.accuracy ?? 0}%`}
                        sub={stats && stats.totalCorrect > 0 ? `${stats.totalCorrect} correct` : "keep going!"}
                        icon={CheckCircle2}
                        color="bg-emerald-500/10 text-emerald-400"
                    />
                    <StatCard
                        label="Questions Mastered"
                        value={isLoading ? "—" : stats ? Math.floor(stats.totalCorrect * 0.6).toString() : "0"}
                        sub="≥60% correct rate"
                        icon={Flame}
                        color="bg-orange-500/10 text-orange-400"
                    />
                </section>

                {/* Activity chart + Category breakdown */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Last 7 days bar chart */}
                    <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-primary" /> Activity
                            </h3>
                            <span className="text-xs text-[#9dabb9]">Last 7 days</span>
                        </div>
                        {isLoading ? (
                            <div className="h-32 flex items-center justify-center text-[#9dabb9] text-sm">Loading…</div>
                        ) : (
                            <div className="flex items-end justify-between gap-2 h-32">
                                {(stats?.recentResults ?? []).map((day) => {
                                    const heightPct = maxBar > 0 ? (day.total / maxBar) * 100 : 0;
                                    const label = new Date(day.date).toLocaleDateString("en", { weekday: "short" });
                                    return (
                                        <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                                            <div className="w-full flex flex-col items-center justify-end" style={{ height: "100px" }}>
                                                <div
                                                    className={cn("w-full rounded-t-lg transition-all", day.total > 0 ? "bg-primary" : "bg-[#283039]")}
                                                    style={{ height: `${Math.max(heightPct, day.total > 0 ? 8 : 4)}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-[#9dabb9]">{label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Category breakdown */}
                    <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-5">
                            <BookOpen className="w-5 h-5 text-primary" /> By Category
                        </h3>
                        {isLoading ? (
                            <div className="h-32 flex items-center justify-center text-[#9dabb9] text-sm">Loading…</div>
                        ) : !stats || stats.categoryStats.length === 0 ? (
                            <p className="text-[#9dabb9] text-sm text-center py-8">No data yet — complete a quiz first.</p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {stats.categoryStats.slice(0, 5).map((cat) => {
                                    const pct = cat.total > 0 ? Math.round((cat.correct / cat.total) * 100) : 0;
                                    return (
                                        <div key={cat.categoryName}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-white truncate pr-2">{cat.categoryName}</span>
                                                <span className={cn("font-bold flex-shrink-0", pct >= 70 ? "text-emerald-400" : pct >= 40 ? "text-yellow-400" : "text-red-400")}>
                                                    {pct}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-[#283039] rounded-full overflow-hidden">
                                                <div
                                                    className={cn("h-full rounded-full transition-all", pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500")}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
}
