"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getMockTest, getMockTestResult, getQuestion } from "@/lib/db";
import { MockTest, MockTestResult, Question } from "@/lib/schemas";
import MockTestSession from "@/components/quiz/mock-test-session";
import { Loader2, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export default function MockTestPage({ params }: { params: Promise<{ testId: string }> }) {
    const resolvedParams = use(params);
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [test, setTest] = useState<MockTest | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [existingResult, setExistingResult] = useState<MockTestResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        (async () => {
            try {
                const fetchedTest = await getMockTest(resolvedParams.testId);
                if (!fetchedTest) {
                    setError("Test not found.");
                    return;
                }
                setTest(fetchedTest);

                // Check if user already submitted
                const result = await getMockTestResult(fetchedTest.id!, user.uid);
                setExistingResult(result);

                // Fetch all questions for this test
                const fetchedQuestions = await Promise.all(
                    fetchedTest.questionIds.map(async (qId) => {
                        const q = await getQuestion(qId);
                        return q;
                    })
                );

                // Filter out any null questions (deleted since test creation)
                setQuestions(fetchedQuestions.filter(Boolean) as Question[]);
            } catch (err) {
                console.error(err);
                setError("Failed to load test data.");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [user, resolvedParams.testId]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#111418]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-[#9dabb9] text-sm">Loading test...</p>
                </div>
            </div>
        );
    }

    if (error || !test) {
        return (
            <div className="flex h-full items-center justify-center bg-[#111418] p-6">
                <div className="flex flex-col items-center gap-3 text-center bg-[#1c2127] border border-[#283039] rounded-2xl p-8">
                    <AlertTriangle className="w-10 h-10 text-red-500" />
                    <h2 className="text-xl font-bold text-white">{error || "Unknown error"}</h2>
                    <button
                        onClick={() => router.push("/mock-tests")}
                        className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                    >
                        Back to Mock Tests
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-[#111418] p-6">
                <div className="text-center bg-[#1c2127] border border-[#283039] rounded-2xl p-8">
                    <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold text-white">No Questions Available</h2>
                    <p className="text-[#9dabb9] text-sm mt-2">
                        The questions for this test may have been deleted.
                    </p>
                </div>
            </div>
        );
    }

    // Determine if we should go directly to results view
    const viewMode = searchParams.get("view");

    return (
        <MockTestSession
            test={test}
            questions={questions}
            existingResult={viewMode === "results" ? existingResult : existingResult}
        />
    );
}
