"use client";

import { useState, useEffect } from "react";
import { fetchAllUsersAction, fetchUserStatsAction } from "@/app/actions/analytics-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BrainCircuit, Loader2, Target, Activity, Clock, LogOut, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

export default function AnalyticsPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);

    const [stats, setStats] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [mockTests, setMockTests] = useState<any[]>([]);

    useEffect(() => {
        async function loadUsers() {
            setLoadingUsers(true);
            const res = await fetchAllUsersAction();
            if (res.success) {
                setUsers(res.users);
            }
            setLoadingUsers(false);
        }
        loadUsers();
    }, []);

    useEffect(() => {
        if (!selectedUserId) return;

        async function loadStats() {
            setLoadingStats(true);
            const res = await fetchUserStatsAction(selectedUserId);
            if (res.success) {
                setStats(res.stats);

                // Format activity history for the chart
                const timeHistory = res.activityHistory || [];
                const formattedActivity = timeHistory.map((a: any) => ({
                    date: new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    minutes: Math.round(a.totalSeconds / 60)
                })).reverse(); // Oldest first

                setActivity(formattedActivity);
                setMockTests(res.completedMockTests || []);
            }
            setLoadingStats(false);
        }
        loadStats();
    }, [selectedUserId]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="flex-1 w-full flex flex-col min-h-0 overflow-hidden bg-[#0a0c10]">
            <header className="px-8 py-6 border-b border-[#283039] shrink-0 bg-[#111418]/80 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-primary text-sm font-medium">
                            <Activity className="w-4 h-4" />
                            <span>System Admin</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">User Analytics</h1>
                        <p className="text-[#9dabb9] text-sm mt-1">Deep dive into individual user performance and engagement.</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* User Selection */}
                    <div className="bg-[#1c2127] border border-[#283039] rounded-2xl p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-white mb-4">Select User to Analyze</h2>
                        {loadingUsers ? (
                            <div className="flex items-center gap-2 text-[#9dabb9]">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Loading users...</span>
                            </div>
                        ) : (
                            <select
                                className="w-full md:w-1/2 p-3 bg-[#111418] border border-[#283039] text-white rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <option value="">-- Choose a user --</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.displayUsername} ({u.email})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {!selectedUserId && !loadingUsers && (
                        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#283039] rounded-3xl bg-[#111418]/50">
                            <Target className="w-12 h-12 text-[#9dabb9]/50 mb-4" />
                            <h3 className="text-xl font-medium text-white">No User Selected</h3>
                            <p className="text-[#9dabb9]">Select a user from the dropdown above to view their analytics.</p>
                        </div>
                    )}

                    {selectedUserId && loadingStats && (
                        <div className="flex flex-col items-center justify-center p-12 text-[#9dabb9]">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                            <p>Loading analytics data...</p>
                        </div>
                    )}

                    {selectedUserId && !loadingStats && stats && (
                        <>
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-gradient-to-br from-[#1c2127] to-[#111418] border-[#283039]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-[#9dabb9] text-sm font-medium flex items-center gap-2">
                                            <BrainCircuit className="w-4 h-4" />
                                            Questions Answered
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-bold text-white">{stats.totalAnswered}</div>
                                        <p className="text-xs text-[#9dabb9] mt-1">{stats.totalCorrect} correct answers</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-[#1c2127] to-[#111418] border-[#283039]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-[#9dabb9] text-sm font-medium flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Overall Accuracy
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-bold text-primary">{stats.accuracy}%</div>
                                        <p className="text-xs text-[#9dabb9] mt-1">Across all categories</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-[#1c2127] to-[#111418] border-[#283039]">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-[#9dabb9] text-sm font-medium flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            Time Spent (Last 7 Days)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-4xl font-bold text-white">
                                            {formatTime(activity.reduce((acc, curr) => acc + (curr.minutes * 60), 0))}
                                        </div>
                                        <p className="text-xs text-[#9dabb9] mt-1">Total active learning time</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Time Spent Chart */}
                                <Card className="bg-[#1c2127] border-[#283039]">
                                    <CardHeader>
                                        <CardTitle className="text-white">Engagement Over Time</CardTitle>
                                        <CardDescription className="text-[#9dabb9]">Minutes spent studying per day (last 7 days)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={activity} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#283039" vertical={false} />
                                                <XAxis dataKey="date" stroke="#9dabb9" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#9dabb9" fontSize={12} tickLine={false} axisLine={false} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#111418', border: '1px solid #283039', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Line type="monotone" dataKey="minutes" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Accuracy by Category */}
                                <Card className="bg-[#1c2127] border-[#283039]">
                                    <CardHeader>
                                        <CardTitle className="text-white">Category Performance</CardTitle>
                                        <CardDescription className="text-[#9dabb9]">Top 5 categories by volume</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.categoryStats.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 40 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#283039" horizontal={false} />
                                                <XAxis type="number" stroke="#9dabb9" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis dataKey="categoryName" type="category" stroke="#9dabb9" fontSize={12} tickLine={false} axisLine={false} width={80} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#111418', border: '1px solid #283039', borderRadius: '8px' }}
                                                />
                                                <Bar dataKey="total" fill="#283039" radius={[0, 4, 4, 0]} barSize={20} />
                                                <Bar dataKey="correct" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                        <div className="flex justify-center gap-4 mt-2">
                                            <div className="flex items-center gap-2 text-xs text-[#9dabb9]">
                                                <div className="w-3 h-3 bg-[#283039] rounded-sm"></div> Total Attempted
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-[#9dabb9]">
                                                <div className="w-3 h-3 bg-green-500 rounded-sm"></div> Correct
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Mock Test History */}
                            <Card className="bg-[#1c2127] border-[#283039]">
                                <CardHeader>
                                    <CardTitle className="text-white">Mock Test History</CardTitle>
                                    <CardDescription className="text-[#9dabb9]">Recent simulated exams taken by this user</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {mockTests.length === 0 ? (
                                        <div className="text-center py-8 text-[#9dabb9] bg-[#111418]/50 rounded-xl border border-dashed border-[#283039]">
                                            No mock tests completed yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {mockTests.map((mt, i) => {
                                                const percentage = Math.round((mt.result.score / mt.result.totalQuestions) * 100);
                                                const isPass = percentage >= 60;
                                                return (
                                                    <div key={i} className="flex items-center justify-between p-4 bg-[#111418] border border-[#283039] rounded-xl">
                                                        <div>
                                                            <div className="font-medium text-white">{mt.test.title}</div>
                                                            <div className="text-xs text-[#9dabb9] mt-1">
                                                                {new Date(mt.result.completedAt).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className={cn("text-lg font-bold", isPass ? "text-green-500" : "text-amber-500")}>
                                                                    {percentage}%
                                                                </div>
                                                                <div className="text-xs text-[#9dabb9]">
                                                                    {mt.result.score} / {mt.result.totalQuestions}
                                                                </div>
                                                            </div>
                                                            {isPass ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-amber-500" />}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
