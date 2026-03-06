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
            prompt: `System Role / Persona:
You are an expert academic assessment designer specializing in postgraduate-level curriculum evaluation. Your task is to generate a dense, exam-ready bank of Multiple Choice Questions (MCQs) and True/False questions based strictly on the provided input text.

Objective:
Produce conceptually rigorous, objective questions that accurately test advanced comprehension, analysis, and synthesis. The assessment must be meticulously balanced in design so that test-takers cannot guess the correct answer through structural flaws, option length, or grammatical giveaways.

Generate as many high-quality questions as possible. There is no maximum limit. You must systematically extract every single testable concept, theoretical nuance, and factual detail from the input text and convert it into a question.

Question Styles to Include:
You must provide a balanced mix of the following question types:

    Concept Identification: Recognizing highly specific theoretical frameworks or core arguments.
    Chronology: Sequencing events, theoretical developments, or historical phases based on the text.
    Text–Author Matching: Associating specific claims, quotes, or methodologies with their correct author/researcher.
    Term–Definition Pairing: Matching advanced terminology with its precise academic definition.
    Contextual Inference: Deducing implied conclusions, consequences, or underlying assumptions from a specific passage.

Strict Anti-Bias & Structural Constraints (CRITICAL):
To prevent test-takers from "gaming" the test, you must adhere strictly to the following rules:

    Symmetry in Length: The correct option must NEVER be consistently longer, shorter, or more detailed than the distractors. All options (A, B, C, D) must be visually and quantitatively similar in length (aim for a variance of no more than 2-3 words between options).
    Equal Information Density: Avoid mixing highly detailed options with single-word options. If the correct answer is a three-word phrase, all distractors must be plausible three-word phrases.
    Parallel Grammatical Structure: All options must logically and grammatically complete the stem in the exact same way (e.g., if one option starts with a gerund, all must start with a gerund).
    Precision Over Verbosity: Convey correctness through absolute academic precision, not by adding qualifying clauses or extra detail to the correct answer.
    Plausible Distractors: All incorrect options must be academically appropriate, logically sound within the context of the subject, and represent common misconceptions or subtle misreadings of the text.
    Banned Formats: DO NOT use "All of the above," "None of the above," "Both A and C," or similar meta-options under any circumstances.
    Uniform Complexity for Names/Terms: When testing names or specific jargon, do not make the correct term stand out in complexity or formatting.

IMPORTANT: You MUST output in the structured JSON schema provided. For each question, provide 4 options as plain strings and a correctAnswerIndex (0-based) indicating the correct one. The explanation field should contain the rationale explaining why the answer is correct and why the primary distractor is false.

Input Text:
"${text}"`,
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
