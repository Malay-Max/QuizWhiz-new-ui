"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { z } from "zod";
import { Question } from "@/lib/schemas";

// Initialize Genkit
const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
    model: "googleai/gemini-3-pro-preview",
});

// Same output schema as generate-questions
const ExtractedQuestionsSchema = z.object({
    source: z.string().optional(),
    questions: z.array(z.object({
        text: z.string(),
        options: z.array(z.string()),
        correctAnswerIndex: z.number().int().min(0),
        explanation: z.string(),
        type: z.enum(["multiple-choice", "true-false"]),
    }))
});

export async function extractPYQsFromTextAction(text: string, categoryId = "temp-category"): Promise<Question[]> {
    const { output } = await ai.generate({
        prompt: `You are an expert academic question parser and answer key generator. You will be given raw text that contains Previously Asked Questions (PYQs) from competitive exams, textbooks, or question papers.

Your task:
1. Extract EVERY question found in the text, including all its options (A, B, C, D) exactly as written.
2. If the correct answer is provided in the text, use it. If NOT provided, determine the correct answer yourself based on your expert knowledge.
3. If an explanation/rationale is provided, use it. If NOT provided, generate a clear, concise explanation for why the correct answer is right.
4. Classify each question as "multiple-choice" (4 options) or "true-false" (2 options).
5. Preserve the original wording of questions and options as faithfully as possible.

Rules:
- Do NOT skip any question found in the text.
- Do NOT modify the original question text or options unless absolutely necessary for clarity.
- For questions without a marked correct answer, use your academic expertise to determine it.
- Explanations should be 1-3 sentences, referencing the key concept being tested.
- For each question, provide options as plain strings and a correctAnswerIndex (0-based) indicating the correct one.
- IMPORTANT: If the text mentions a book name, exam name, paper title, or source (e.g. "UGC-NET 2023", "Norton Anthology", "GATE 2022"), extract it into the top-level "source" field. If no source is identifiable, omit it.

IMPORTANT: Output in the structured JSON schema provided.

Input Text:
"${text}"`,
        output: { schema: ExtractedQuestionsSchema as any },
    });

    if (!output) throw new Error("No output from AI extraction");

    return output.questions.map((q: any) => {
        const options = (q.options as string[]).map((text, i) => ({
            id: `option-${String.fromCharCode(65 + i)}`,
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
            source: output.source || "PYQ Import",
        } satisfies Question;
    });
}

export async function extractPYQsFromPdfAction(formData: FormData, categoryId = "temp-category"): Promise<Question[]> {
    const file = formData.get("pdf") as File;
    if (!file) throw new Error("No PDF file provided");

    // Read the file as buffer and extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const pdfData = await pdfParse(buffer);

    if (!pdfData.text || pdfData.text.trim().length < 20) {
        throw new Error("Could not extract meaningful text from the PDF. The file may be image-based or empty.");
    }

    // Use the same extraction logic with the extracted text
    return extractPYQsFromTextAction(pdfData.text, categoryId);
}
