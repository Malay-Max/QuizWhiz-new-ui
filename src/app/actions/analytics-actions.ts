"use server";

import { logUserActivity, getUserStats, getAllUsers, getAvailableMockTests, getMockTestResult, getUserActivityHistory } from "@/lib/db";

// Helper to convert Firestore Timestamp-like objects to plain numbers
function serializeTimestamp(val: any): number {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    if (typeof val?.toMillis === 'function') return val.toMillis();
    if (typeof val?.seconds === 'number') return val.seconds * 1000;
    return 0;
}

export async function logActivityAction(userId: string, activeSeconds: number) {
    if (!userId || activeSeconds <= 0) return { success: false };
    try {
        await logUserActivity(userId, activeSeconds);
        return { success: true };
    } catch (error) {
        console.error("Failed to log activity:", error);
        return { success: false, error: "Failed to log activity" };
    }
}

export async function fetchAllUsersAction() {
    try {
        const rawUsers = await getAllUsers();
        // Serialize any Firestore Timestamp fields before sending to Client Components
        const users = rawUsers.map((u: any) => ({
            ...u,
            createdAt: serializeTimestamp(u.createdAt),
        }));
        return { success: true, users };
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return { success: false, error: "Failed to fetch users", users: [] };
    }
}

export async function fetchUserStatsAction(userId: string) {
    try {
        const stats = await getUserStats(userId);
        const activityHistory = await getUserActivityHistory(userId, 7);

        // Fetch mock tests — wrapped in try/catch in case index is missing
        let completedMockTests: any[] = [];
        try {
            const mockTests = await getAvailableMockTests(userId);
            for (const test of mockTests) {
                const result = await getMockTestResult(test.id!, userId);
                if (result) {
                    completedMockTests.push({
                        test: {
                            ...test,
                            createdAt: serializeTimestamp(test.createdAt),
                        },
                        result: {
                            ...result,
                            completedAt: serializeTimestamp(result.completedAt),
                        }
                    });
                }
            }
        } catch (mockTestError) {
            console.warn("Could not fetch mock tests (index may be missing):", mockTestError);
        }

        return {
            success: true,
            stats,
            activityHistory,
            completedMockTests
        };
    } catch (error) {
        console.error("Failed to fetch user stats:", error);
        return { success: false, error: "Failed to fetch user stats" };
    }
}
