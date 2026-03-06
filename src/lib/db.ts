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
} from "firebase/firestore";
import { db } from "./firebase";
import { Question, Category, UserProgress, MockTest, MockTestResult } from "./schemas";

// Collections
const questionsRef = collection(db, "allQuestions");
const categoriesRef = collection(db, "categories");
const progressRef = collection(db, "userProgress");
const quizResultsRef = collection(db, "quizResults");

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
    const docRef = await addDoc(categoriesRef, data);
    return docRef.id;
}

export async function getCategories() {
    // Basic memory cache to prevent excessive reads during navigation (not ideal for multi-user real-time edits, but fine for this app)
    const snapshot = await getDocs(categoriesRef);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
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

export async function getDueQuestions(userId: string) {
    const now = Date.now();
    const q = query(progressRef, where("userId", "==", userId), where("nextReviewDate", "<=", now));
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
    isCorrect: boolean;
    answeredAt: unknown;
}

export async function saveQuizResult(
    userId: string,
    questionId: string,
    categoryId: string,
    isCorrect: boolean,
    categoryName?: string,
) {
    await addDoc(quizResultsRef, {
        userId,
        questionId,
        categoryId,
        categoryName: categoryName ?? "",
        isCorrect,
        answeredAt: serverTimestamp(),
    });
    delete cachedUserStats[userId];
}

export interface UserStats {
    totalAnswered: number;
    totalCorrect: number;
    accuracy: number;
    recentResults: { date: string; correct: number; total: number }[];
    categoryStats: { categoryName: string; correct: number; total: number }[];
}

let cachedUserStats: Record<string, { stats: UserStats, time: number }> = {};

export async function getUserStats(userId: string): Promise<UserStats> {
    // 5-minute cache per user
    if (cachedUserStats[userId] && Date.now() - cachedUserStats[userId].time < 5 * 60 * 1000) {
        return cachedUserStats[userId].stats;
    }

    const q = query(quizResultsRef, where("userId", "==", userId), orderBy("answeredAt", "desc"), limit(500));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(d => d.data() as QuizResult);

    if (results.length === 0) {
        const empty = { totalAnswered: 0, totalCorrect: 0, accuracy: 0, recentResults: [], categoryStats: [] };
        cachedUserStats[userId] = { stats: empty, time: Date.now() };
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
    cachedUserStats[userId] = { stats, time: Date.now() };
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

export async function getMockTest(id: string) {
    const snapshot = await getDoc(doc(db, "mockTests", id));
    if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() } as MockTest;
    return null;
}

export async function getAvailableMockTests(userId: string) {
    const q = query(mockTestsRef, where("targetUserIds", "array-contains", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MockTest));
}

export async function getAllMockTests() {
    const q = query(mockTestsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MockTest));
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
    return snapshot.docs.map(d => d.data());
}
