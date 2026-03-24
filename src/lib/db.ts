import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    limit,
    arrayUnion,
    arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import { Question, Category, UserProgress, MockTest, MockTestResult, Goal, UserActivity } from "./schemas";

// Collections
const questionsRef = collection(db, "allQuestions");
const categoriesRef = collection(db, "categories");
const progressRef = collection(db, "userProgress");
const quizResultsRef = collection(db, "quizResults");
const goalsRef = collection(db, "goals");
const userActivityRef = collection(db, "userActivity");

// --- Goals ---

export async function createGoal(goal: Goal) {
    const { id, ...data } = goal;
    const docRef = await addDoc(goalsRef, data);
    return docRef.id;
}

export async function getGoals() {
    const snapshot = await getDocs(goalsRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal));
}

export async function getGoal(id: string) {
    const snapshot = await getDoc(doc(db, "goals", id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as Goal;
    return null;
}

export async function assignGoalToUser(userId: string, goalId: string) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { assignedGoalIds: arrayUnion(goalId) });
}

export async function removeGoalFromUser(userId: string, goalId: string) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { assignedGoalIds: arrayRemove(goalId) });
}

// --- Questions ---

export async function addQuestion(question: Question) {
    const { id, ...data } = question;
    const docRef = await addDoc(questionsRef, data);
    cachedAllQuestions = null;
    return docRef.id;
}

export async function getQuestionsByCategory(categoryId: string) {
    const q = query(questionsRef, where("categoryId", "==", categoryId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
}

export async function getQuestion(id: string) {
    const docRef = doc(db, "allQuestions", id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as Question;
    return null;
}

export async function updateQuestion(id: string, data: Partial<Question>) {
    await updateDoc(doc(db, "allQuestions", id), data);
    cachedAllQuestions = null;
}

export async function deleteQuestion(id: string) {
    await deleteDoc(doc(db, "allQuestions", id));
    cachedAllQuestions = null;
}

// --- Categories ---

export async function addCategory(category: Category) {
    const { id, ...data } = category;
    // Firestore rejects undefined values — strip them
    const cleanData = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
    const docRef = await addDoc(categoriesRef, cleanData);
    return docRef.id;
}

export async function getCategories(goalId?: string) {
    // Always fetch all categories — it's a small collection
    const snapshot = await getDocs(categoriesRef);
    const allCats = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));

    if (!goalId) return allCats;

    // Find root categories that have this goalId, then include their entire subtree
    const rootsWithGoal = allCats.filter(c => c.goalIds?.includes(goalId));
    if (rootsWithGoal.length === 0) return [];

    // Recursively collect all descendant IDs
    const collectSubtree = (parentId: string): string[] => {
        const ids = [parentId];
        for (const child of allCats.filter(c => c.parentId === parentId)) {
            ids.push(...collectSubtree(child.id!));
        }
        return ids;
    };

    const includedIds = new Set<string>();
    for (const root of rootsWithGoal) {
        for (const id of collectSubtree(root.id!)) {
            includedIds.add(id);
        }
    }

    return allCats.filter(c => includedIds.has(c.id!));
}

export async function assignCategoryToGoal(categoryId: string, goalId: string) {
    const catRef = doc(db, "categories", categoryId);
    await updateDoc(catRef, { goalIds: arrayUnion(goalId) });
}

export async function removeCategoryFromGoal(categoryId: string, goalId: string) {
    const catRef = doc(db, "categories", categoryId);
    await updateDoc(catRef, { goalIds: arrayRemove(goalId) });
}

// Get questions only matching specific category IDs (up to 30 due to Firestore 'in' limit)
export async function getQuestionsInCategories(categoryIds: string[]) {
    if (categoryIds.length === 0) return [];

    const questions: Question[] = [];
    // Firestore 'in' operator supports max 30 values at a time
    for (let i = 0; i < categoryIds.length; i += 30) {
        const chunk = categoryIds.slice(i, i + 30);
        const q = query(questionsRef, where("categoryId", "in", chunk));
        const snapshot = await getDocs(q);
        questions.push(...snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question)));
    }
    return questions;
}

let cachedAllQuestions: Question[] | null = null;
let cachedAllQuestionsTime = 0;

export async function getAllQuestions() {
    // 5-minute memory cache to prevent burning quota on Manage page reloads
    if (cachedAllQuestions && Date.now() - cachedAllQuestionsTime < 5 * 60 * 1000) {
        return cachedAllQuestions;
    }
    const snapshot = await getDocs(questionsRef);
    cachedAllQuestions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));
    cachedAllQuestionsTime = Date.now();
    return cachedAllQuestions;
}

// --- User Progress / SRS ---

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

/**
 * Upsert SRS progress using a deterministic doc ID so we can use setDoc with
 * merge=true — a single write, zero reads. Uses a simplified SM-2 algorithm.
 */
export async function upsertUserProgress(
    userId: string,
    questionId: string,
    categoryId: string,
    rating: SRSRating,
    goalId?: string,
): Promise<void> {
    // Fetch the existing doc to get current interval/easeFactor/consecutiveCorrect
    const docId = `${userId}_${questionId}`;
    const docRef = doc(db, "userProgress", docId);
    const snap = await getDoc(docRef);

    const existing = snap.exists() ? snap.data() : null;
    const prevInterval: number = existing?.interval ?? 0;       // days
    const prevEF: number = existing?.easeFactor ?? 2.5;
    const prevConsecutive: number = existing?.consecutiveCorrect ?? 0;

    // SM-2 quality mapping: again=0, hard=2, good=3, easy=4 (out of 5)
    const q: Record<SRSRating, number> = { again: 0, hard: 2, good: 3, easy: 4 };
    const quality = q[rating];

    // New ease factor (clamped ≥ 1.3)
    const newEF = Math.max(1.3, prevEF + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    let newInterval: number; // days
    let newConsecutive: number;
    let newStatus: "new" | "learning" | "review" | "mastered";

    if (rating === 'again') {
        // Reset — short 10-minute requeue (stored as fractional day)
        newInterval = 10 / (24 * 60);
        newConsecutive = 0;
        newStatus = 'learning';
    } else if (prevConsecutive === 0) {
        // First successful rating
        newInterval = rating === 'easy' ? 4 : 1;
        newConsecutive = 1;
        newStatus = 'learning';
    } else if (prevConsecutive === 1) {
        newInterval = rating === 'easy' ? 7 : 3;
        newConsecutive = 2;
        newStatus = 'review';
    } else {
        newInterval = Math.min(180, Math.round(prevInterval * newEF));
        newConsecutive = prevConsecutive + 1;
        newStatus = newConsecutive >= 8 ? 'mastered' : 'review';
    }

    const nextReviewDate = Date.now() + newInterval * 24 * 60 * 60 * 1000;

    await setDoc(docRef, {
        userId,
        questionId,
        categoryId,
        goalId: goalId ?? null,
        easeFactor: newEF,
        interval: newInterval,
        consecutiveCorrect: newConsecutive,
        status: newStatus,
        nextReviewDate,
        lastReviewed: Date.now(),
    }, { merge: true });
}

export async function getUserProgress(userId: string, questionId: string) {
    const docId = `${userId}_${questionId}`;
    const snap = await getDoc(doc(db, "userProgress", docId));
    if (snap.exists()) return { id: snap.id, ...snap.data() } as UserProgress & { id: string };
    return null;
}

export async function updateUserProgress(id: string, data: Partial<UserProgress>) {
    await updateDoc(doc(db, "userProgress", id), data);
}

export async function createUserProgress(progress: UserProgress) {
    const docRef = await addDoc(progressRef, progress);
    return docRef.id;
}

export async function getDueQuestions(userId: string, goalId?: string) {
    const now = Date.now();
    let constraints = [where("userId", "==", userId), where("nextReviewDate", "<=", now)];
    if (goalId) {
        constraints.push(where("goalId", "==", goalId));
    }
    const q = query(progressRef, ...constraints);
    const snapshot = await getDocs(q);
    const progressItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProgress));

    if (progressItems.length === 0) return [];

    const questions: (Question & { progress: UserProgress })[] = [];
    const questionIds = progressItems.map(p => p.questionId);

    // Batch fetch questions (up to 30 limit for 'in') to avoid N+1 queries
    for (let i = 0; i < questionIds.length; i += 30) {
        const chunk = questionIds.slice(i, i + 30);
        const qDocs = await getDocs(query(collection(db, "allQuestions"), where("__name__", "in", chunk)));

        qDocs.docs.forEach(d => {
            const progress = progressItems.find(p => p.questionId === d.id);
            if (progress) {
                questions.push({ id: d.id, ...d.data(), progress } as Question & { progress: UserProgress });
            }
        });
    }

    return questions;
}

// --- Quiz Results (per-user progress tracking) ---

export interface QuizResult {
    userId: string;
    questionId: string;
    categoryId: string;
    categoryName?: string;
    goalId?: string;
    isCorrect: boolean;
    answeredAt: unknown;
}

export async function saveQuizResult(
    userId: string,
    questionId: string,
    categoryId: string,
    isCorrect: boolean,
    categoryName?: string,
    goalId?: string,
) {
    await addDoc(quizResultsRef, {
        userId,
        questionId,
        categoryId,
        categoryName: categoryName ?? "",
        goalId: goalId ?? null,
        isCorrect,
        answeredAt: serverTimestamp(),
    });
    delete cachedUserStats[`${userId}_${goalId ?? "all"}`];
}

export interface UserStats {
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    recentResults: { date: string; correct: number; total: number }[];
    categoryStats: { categoryName: string; correct: number; total: number }[];
}

let cachedUserStats: Record<string, { stats: UserStats, time: number }> = {};

export async function getUserStats(userId: string, goalId?: string): Promise<UserStats> {
    const cacheKey = `${userId}_${goalId ?? "all"}`;

    // 5-minute cache per user+goal
    if (cachedUserStats[cacheKey] && Date.now() - cachedUserStats[cacheKey].time < 5 * 60 * 1000) {
        return cachedUserStats[cacheKey].stats;
    }

    let constraints: any[] = [where("userId", "==", userId)];
    if (goalId) {
        constraints.push(where("goalId", "==", goalId));
    }
    const q = query(quizResultsRef, ...constraints, orderBy("answeredAt", "desc"), limit(500));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => d.data() as QuizResult);

    if (results.length === 0) {
        const empty = { totalAnswered: 0, totalCorrect: 0, accuracy: 0, recentResults: [], categoryStats: [] };
        cachedUserStats[cacheKey] = { stats: empty, time: Date.now() };
        return empty;
    }

    const totalAnswered = results.length;
    const totalCorrect = results.filter(r => r.isCorrect).length;
    const accuracy = Math.round((totalCorrect / totalAnswered) * 100);

    // Last 7 days
    const dayMap: Record<string, { correct: number; total: number }> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dayMap[d.toISOString().split("T")[0]] = { correct: 0, total: 0 };
    }
    for (const r of results) {
        const ts = (r.answeredAt as any)?.toDate?.() ?? null;
        if (!ts) continue;
        const key = ts.toISOString().split("T")[0];
        if (dayMap[key]) { dayMap[key].total++; if (r.isCorrect) dayMap[key].correct++; }
    }
    const recentResults = Object.entries(dayMap).map(([date, v]) => ({ date, ...v }));

    // Per-category breakdown
    const catMap: Record<string, { correct: number; total: number }> = {};
    for (const r of results) {
        const name = r.categoryName || r.categoryId;
        if (!catMap[name]) catMap[name] = { correct: 0, total: 0 };
        catMap[name].total++;
        if (r.isCorrect) catMap[name].correct++;
    }
    const categoryStats = Object.entries(catMap)
        .map(([categoryName, v]) => ({ categoryName, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

    const stats = { totalAnswered, totalCorrect, accuracy, recentResults, categoryStats };
    cachedUserStats[cacheKey] = { stats, time: Date.now() };
    return stats;
}

// --- Mock Tests ---

const mockTestsRef = collection(db, "mockTests");
const mockTestResultsRef = collection(db, "mockTestResults");

export async function createMockTest(test: MockTest) {
    const { id, ...data } = test;
    const docRef = await addDoc(mockTestsRef, data);
    return docRef.id;
}

export async function updateMockTest(testId: string, data: Partial<MockTest>) {
    const docRef = doc(db, "mockTests", testId);
    await updateDoc(docRef, data);
}

export async function deleteMockTest(testId: string) {
    // Note: We don't automatically delete mockTestResults here.
    // Preserving them allows admins to still see stats for deleted tests if needed,
    // or we can clean them up via an admin script later.
    const docRef = doc(db, "mockTests", testId);
    await deleteDoc(docRef);
}

export async function getMockTest(id: string) {
    const snapshot = await getDoc(doc(db, "mockTests", id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as MockTest;
    return null;
}

export async function getAvailableMockTests(userId: string, goalId?: string) {
    let constraints: any[] = [where("targetUserIds", "array-contains", userId)];
    if (goalId) {
        constraints.push(where("goalId", "==", goalId));
    }
    // We remove orderBy("createdAt", "desc") to prevent requiring a Firestore composite index.
    const q = query(mockTestsRef, ...constraints);
    const snapshot = await getDocs(q);
    const tests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MockTest));
    
    // Sort manually in JS (newest first)
    return tests.sort((a, b) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.toMillis?.() || 0;
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.toMillis?.() || 0;
        return bTime - aTime;
    });
}

export async function getAllMockTests(goalId?: string) {
    let constraints: any[] = [];
    if (goalId) {
        constraints.push(where("goalId", "==", goalId));
    }
    const q = query(mockTestsRef, ...constraints);
    const snapshot = await getDocs(q);
    const tests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MockTest));
    
    // Sort manually in JS (newest first)
    return tests.sort((a, b) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.toMillis?.() || 0;
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.toMillis?.() || 0;
        return bTime - aTime;
    });
}

export async function saveMockTestResult(result: MockTestResult) {
    const { id, ...data } = result;
    const docRef = await addDoc(mockTestResultsRef, data);
    return docRef.id;
}

export async function getMockTestResult(testId: string, userId: string) {
    const q = query(mockTestResultsRef, where("testId", "==", testId), where("userId", "==", userId), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MockTestResult;
    }
    return null;
}

// Admin helper to get user list for assignment
export async function getAllUsers() {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- Activity Tracking ---

export async function logUserActivity(userId: string, activeSeconds: number) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const docId = `${userId}_${today}`;
    const docRef = doc(db, "userActivity", docId);

    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        await updateDoc(docRef, {
            totalSeconds: (snapshot.data().totalSeconds || 0) + activeSeconds,
            lastActiveAt: Date.now(),
        });
    } else {
        await setDoc(docRef, {
            userId,
            date: today,
            totalSeconds: activeSeconds,
            lastActiveAt: Date.now(),
        });
    }
}

export async function getUserActivityHistory(userId: string, days: number = 7) {
    const now = new Date();
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
    }

    const activities: Record<string, number> = {};
    for (const d of dates) {
        activities[d] = 0;
    }

    if (dates.length > 0) {
        // Fetch in batches of 30 if needed, but usually 7 days is fine
        for (let i = 0; i < dates.length; i += 30) {
            const chunk = dates.slice(i, i + 30);
            const q = query(userActivityRef, where("userId", "==", userId), where("date", "in", chunk));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const data = doc.data() as UserActivity;
                activities[data.date] = data.totalSeconds;
            });
        }
    }

    return Object.entries(activities).map(([date, totalSeconds]) => ({ date, totalSeconds }));
}

