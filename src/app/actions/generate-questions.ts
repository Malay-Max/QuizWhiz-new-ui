"use server";

import { genkit } from "genkit";
import { googleAI, gemini15Flash } from "@genkit-ai/googleai";
import { z } from "zod";
import { Question } from "@/lib/schemas";

// Initialize Genkit
const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
    model: gemini15Flash,
});

// AI output schema - options are plain strings for the AI, we convert afterwards
const GenerateQuestionsSchema = z.object({
    questions: z.array(z.object({
        text: z.string(),
        options: z.array(z.string()),
        correctAnswerIndex: z.number().int().min(0), // 0-based index
        explanation: z.string(),
        type: z.enum(["multiple-choice", "true-false"]),
    }))
});

export async function generateQuestionsAction(text: string, categoryId = "temp-category"): Promise<Question[]> {
    try {
        const { output } = await ai.generate({
            prompt: `Generate 3-5 multiple-choice or true/false questions based on the following text.
Ensure distractors are plausible.
Provide a clear explanation for the correct answer.
For each question, provide 4 options as plain strings and a correctAnswerIndex (0-based) indicating the correct one.
Text: "${text.substring(0, 5000)}"`,
            output: { schema: GenerateQuestionsSchema as any },
        });

        if (!output) throw new Error("No output generated");

        // Convert to our Question schema: options become {id, text}[], correctAnswerId becomes option id
        return output.questions.map((q: any) => {
            const options = (q.options as string[]).map((text, i) => ({
                id: `option-${String.fromCharCode(65 + i)}`, // option-A, option-B, etc.
                text,
            }));
            const correctAnswerId = options[q.correctAnswerIndex]?.id ?? options[0].id;
            return {
                id: Math.random().toString(36).substring(7),
                text: q.text,
                options,
                correctAnswerId,
                explanation: q.explanation,
                type: q.type,
                categoryId,
                createdAt: Date.now(),
                source: "AI Generation",
            } satisfies Question;
        });

    } catch (error) {
        console.error("Genkit Generation Error:", error);
        if (process.env.NODE_ENV === 'development') {
            // Return properly structured mock data
            return [
                {
                    id: "mock-1",
                    text: "What is the powerhouse of the cell?",
                    options: [
                        { id: "option-A", text: "Nucleus" },
                        { id: "option-B", text: "Mitochondria" },
                        { id: "option-C", text: "Ribosome" },
                        { id: "option-D", text: "Golgi Apparatus" },
                    ],
                    correctAnswerId: "option-B",
                    explanation: "Mitochondria generate most of the chemical energy needed to power the cell's biochemical reactions.",
                    type: "multiple-choice",
                    categoryId,
                    createdAt: Date.now(),
                }
            ];
        }
        throw error;
    }
}
