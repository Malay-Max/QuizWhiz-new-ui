"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useGoal } from "@/contexts/goal-context";
import { getAvailableMockTests, getMockTestResult, getAllMockTests } from "@/lib/db";
import { MockTest, MockTestResult } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Clock, CheckCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestWithResult extends MockTest {
    result?: MockTestResult | null;
}

export default function MockTestsPage() {
    const { user, isAdmin } = useAuth();
    const { activeGoalId } = useGoal();
    const router = useRouter();
    const [tests, setTests] = useState<TestWithResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        (async () => {
            try {
                // Admins see all tests, users see only assigned tests
                const rawTests = isAdmin
                    ? await getAllMockTests(activeGoalId ?? undefined)
                    : await getAvailableMockTests(user.uid, activeGoalId ?? undefined);

                // For each test, check if the user has already submitted
                const withResults: TestWithResult[] = await Promise.all(
                    rawTests.map(async (test) => {
                        const result = await getMockTestResult(test.id!, user.uid);
                        return { ...test, result };
                    })
                );
                setTests(withResults);
            } catch (err) {
                console.error("Error loading mock tests:", err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [user, isAdmin, activeGoalId]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#111418] overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl w-full mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary" />
                            Mock Tests
                        </h1>
                        <p className="text-[#9dabb9] mt-2">
                            Timed examinations to test your knowledge under pressure.
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => router.push("/mock-tests/manage")}
                            className="hidden md:flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors text-sm"
                        >
                            + Create Test
                        </button>
                    )}
                </div>

                {tests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <FileText className="w-16 h-16 text-[#283039] mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Tests Available</h3>
                        <p className="text-[#9dabb9] max-w-sm">
                            {isAdmin
                                ? "You haven't created any mock tests yet. Click 'Create Test' to get started."
                                : "No mock tests have been assigned to you yet. Check back later!"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tests.map((test) => {
                            const isCompleted = !!test.result;
                            return (
                                <div
                                    key={test.id}
                                    className={cn(
                                        "bg-[#1c2127] border rounded-2xl p-6 flex flex-col gap-4 transition-all hover:shadow-lg",
                                        isCompleted
                                            ? "border-emerald-500/30"
                                            : "border-[#283039] hover:border-primary/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-lg truncate">{test.title}</h3>
                                            <p className="text-xs text-[#9dabb9] mt-1">
                                                Created {new Date(test.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {isCompleted && (
                                            <div className="shrink-0 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold px-2.5 py-1 rounded-full">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Done
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-[#9dabb9]">
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            {test.durationMinutes} min
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <FileText className="w-4 h-4" />
                                            {test.numQuestions} questions
                                        </span>
                                        {isAdmin && (
                                            <span className="flex items-center gap-1.5">
                                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                                <span className="text-xs text-amber-400">{test.targetUserIds.length} users</span>
                                            </span>
                                        )}
                                    </div>

                                    {isCompleted ? (
                                        <button
                                            onClick={() => router.push(`/mock-tests/${test.id}?view=results`)}
                                            className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-500/20 transition-colors"
                                        >
                                            View Results — {test.result!.score}/{test.result!.totalQuestions}
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => router.push(`/mock-tests/${test.id}`)}
                                            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                                        >
                                            Take Test
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
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
