"use server";

import { getQuestionsInCategories, createMockTest, updateMockTest, deleteMockTest } from "@/lib/db";
import { MockTest } from "@/lib/schemas";

export async function createMockTestAction(
    title: string,
    durationMinutes: number,
    numQuestions: number,
    categoryIds: string[],
    targetUserIds: string[],
    adminUid: string,
    goalId?: string
): Promise<string> {
    if (!title || durationMinutes < 1 || numQuestions < 1 || categoryIds.length === 0) {
        throw new Error("Invalid mock test parameters provided.");
    }

    // 1. Fetch all questions from the selected categories
    const availableQuestions = await getQuestionsInCategories(categoryIds);

    // 2. Shuffle and pick random questions up to numQuestions
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, numQuestions).map(q => q.id!);

    if (selectedIds.length === 0) {
        throw new Error("Error: Selected categories contain exactly 0 questions.");
    }

    // 3. Create the MockTest definition document
    const test: MockTest = {
        title,
        durationMinutes,
        numQuestions: selectedIds.length,
        categoryIds,
        targetUserIds,
        questionIds: selectedIds,
        goalId: goalId ?? undefined,
        createdAt: Date.now(),
        createdBy: adminUid
    };

    const newTestId = await createMockTest(test);
    return newTestId;
}

export async function updateMockTestAction(
    testId: string,
    title: string,
    durationMinutes: number,
    numQuestions: number,
    categoryIds: string[],
    targetUserIds: string[],
    adminUid: string
): Promise<void> {
    if (!testId || !title || durationMinutes < 1 || numQuestions < 1 || categoryIds.length === 0) {
        throw new Error("Invalid mock test parameters provided.");
    }

    const availableQuestions = await getQuestionsInCategories(categoryIds);
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const selectedIds = shuffled.slice(0, numQuestions).map(q => q.id!);

    if (selectedIds.length === 0) {
        throw new Error("Error: Selected categories contain exactly 0 questions.");
    }

    const testUpdate: Partial<MockTest> = {
        title,
        durationMinutes,
        numQuestions: selectedIds.length,
        categoryIds,
        targetUserIds,
        questionIds: selectedIds,
        // We do not change createdAt, createdBy, or goalId on update
    };

    await updateMockTest(testId, testUpdate);
}

export async function deleteMockTestAction(testId: string, adminUid: string): Promise<void> {
    if (!testId || !adminUid) throw new Error("Missing parameters for deletion");
    // Admin checks can be done at the API boundary, but for now we trust `adminUid` presence
    await deleteMockTest(testId);
}

