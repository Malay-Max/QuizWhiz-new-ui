"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuizSession from "@/components/quiz/quiz-session";
import { getCategories, getQuestionsInCategories } from "@/lib/db";
import { Question, Category } from "@/lib/schemas";
import { Loader2 } from "lucide-react";

// Recursively collect all category IDs in a subtree
function getCategorySubtreeIds(categoryId: string, allCategories: Category[]): string[] {
    const ids = [categoryId];
    const children = allCategories.filter(c => c.parentId === categoryId);
    for (const child of children) {
        ids.push(...getCategorySubtreeIds(child.id!, allCategories));
    }
    return ids;
}

function QuizStartInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const categoryId = searchParams.get("categoryId");

    const [questions, setQuestions] = useState<Question[]>([]);
    const [categoryName, setCategoryName] = useState("Quiz");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!categoryId) {
            setError("No category specified.");
            setIsLoading(false);
            return;
        }
        const load = async () => {
            try {
                // First get all categories to resolve the subtree
                const allCategories = await getCategories();

                const cat = allCategories.find(c => c.id === categoryId);
                if (cat) setCategoryName(cat.name);

                // Find all nested category IDs
                const subtreeIds = getCategorySubtreeIds(categoryId, allCategories);

                // Only fetch questions in these specific categories, saving massive read quota
                const filtered = await getQuestionsInCategories(subtreeIds);

                if (filtered.length === 0) {
                    setError("No questions found in this category.");
                } else {
                    // Shuffle for variety
                    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
                    setQuestions(shuffled);
                }
            } catch (e) {
                console.error(e);
                setError("Failed to load questions. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [categoryId]);

    if (isLoading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-[#111418] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[#9dabb9] text-sm">Loading questions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-[#111418] gap-4 text-center p-6">
                <p className="text-white text-xl font-bold">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-6 py-2.5 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return <QuizSession questions={questions} categoryName={categoryName} />;
}

// Default export wraps in Suspense as required by Next.js for useSearchParams
export default function QuizStartPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col h-screen items-center justify-center bg-[#111418] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[#9dabb9] text-sm">Loading...</p>
            </div>
        }>
            <QuizStartInner />
        </Suspense>
    );
}
