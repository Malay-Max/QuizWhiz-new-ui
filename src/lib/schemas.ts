import { z } from "zod";

export const QuestionTypeSchema = z.enum(["multiple-choice", "true-false"]);

// Option is stored as {id, text} map in Firestore
export const OptionSchema = z.object({
    id: z.string(),
    text: z.string(),
});

export const QuestionSchema = z.object({
    id: z.string().optional(),
    text: z.string().min(5, "Question text must be at least 5 characters"),
    options: z.array(OptionSchema),
    correctAnswerId: z.string(), // The ID of the correct option (e.g. "option-B" or a UUID)
    explanation: z.string(),
    source: z.string().optional(),
    categoryId: z.string(),
    type: QuestionTypeSchema.optional().default("multiple-choice"),
    createdAt: z.number().optional(),
});

export const CategorySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Category name must be at least 2 characters"),
    parentId: z.string().optional(),
    description: z.string().optional(),
});

export const UserProgressSchema = z.object({
    userId: z.string(),
    questionId: z.string(),
    easeFactor: z.number().default(2.5),
    interval: z.number().default(0), // in days
    nextReviewDate: z.number(), // timestamp
    consecutiveCorrect: z.number().default(0),
    status: z.enum(["new", "learning", "review", "mastered"]).default("new"),
    lastReviewed: z.number().optional(),
});

export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type UserProgress = z.infer<typeof UserProgressSchema>;
