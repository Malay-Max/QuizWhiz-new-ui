"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { Question } from "@/lib/schemas";
import { z } from "zod";

const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
    // Using explicit model string identifier to bypass missing exports in older SDKs
    model: "googleai/gemini-2.5-flash-lite",
});

const ExplainSchema = z.object({
    explanation: z.string().describe("A detailed, engaging markdown explanation of why the correct answer is correct and why the other options are incorrect."),
});

export async function explainQuestionAction(question: Question): Promise<string> {
    try {
        const correctOption = question.options.find(o => o.id === question.correctAnswerId);

        const prompt = `
You are a helpful and encouraging tutor. 
A student just answered the following multiple-choice question:
"${question.text}"

The options provided were:
${question.options.map((o, i) => `${String.fromCharCode(65 + i)}: ${o.text}`).join('\n')}

The correct option is:
${correctOption?.text}

The short explanation provided with the question is:
"${question.explanation}"

Please provide a deeper, more comprehensive explanation. 
- Explain exactly WHY the correct answer is correct.
- Briefly explain why some of the distinct incorrect options are wrong (if applicable).
- Keep it engaging, easy to read, and formatted nicely in Markdown.
- Limit to 2-3 short paragraphs.
`;

        const { output } = await ai.generate({
            prompt,
            output: { schema: ExplainSchema as any },
        });

        if (!output || !output.explanation) throw new Error("No explanation generated");

        return output.explanation;
    } catch (error) {
        console.error("Explain Generation Error:", error);
        throw new Error("Failed to generate AI explanation.");
    }
}
