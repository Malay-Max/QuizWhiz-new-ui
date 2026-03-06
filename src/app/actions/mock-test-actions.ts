"use server";

import { getQuestionsInCategories, createMockTest } from "@/lib/db";
import { MockTest } from "@/lib/schemas";

export async function createMockTestAction(
    title: string,
    durationMinutes: number,
    numQuestions: number,
    categoryIds: string[],
    targetUserIds: string[],
    adminUid: string
): Promise<string> {
    if (!title || durationMinutes < 1 || numQuestions < 1 || categoryIds.length === 0) {
        throw new Error("Invalid mock test parameters provided.");
    }

    // 1. Fetch all questions from the selected categories
    const availableQuestions = await getQuestionsInCategories(categoryIds);

    // 2. Shuffle and pick random questions up to numQuestions
    // We only need the IDs, not the full question body
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, numQuestions).map(q => q.id!);

    if (selectedIds.length === 0) {
        throw new Error("Error: Selected categories contain exactly 0 questions.");
    }

    // 3. Create the MockTest definition document
    const test: MockTest = {
        title,
        durationMinutes,
        // Update to actual count in case they asked for 50 but only 30 existed
        numQuestions: selectedIds.length,
        categoryIds,
        targetUserIds,
        questionIds: selectedIds,
        createdAt: Date.now(),
        createdBy: adminUid
    };

    const newTestId = await createMockTest(test);
    return newTestId;
}
