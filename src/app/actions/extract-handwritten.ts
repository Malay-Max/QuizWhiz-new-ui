"use server";

import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";

// Initialize Genkit (no default model — we pass it dynamically)
const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
});

export async function extractHandwrittenAction(
    formData: FormData,
    modelId?: string
): Promise<string> {
    const files = formData.getAll("images") as File[];
    if (!files || files.length === 0) throw new Error("No image files provided");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    const promptParts: any[] = [];

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type for ${file.name || 'an image'}. Please upload JPEG, PNG, or WebP images.`);
        }
        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;
        promptParts.push({ media: { url: dataUrl } });
    }

    const selectedModel = modelId || "googleai/gemini-2.0-flash";

    try {
        const { text } = await ai.generate({
            model: selectedModel,
            prompt: [
                ...promptParts,
                {
                    text: `You are an expert OCR system specialized in reading handwritten notes.

Your task:
1. Carefully read ALL handwritten text visible in these images.
2. Transcribe it faithfully, preserving the original structure (headings, bullet points, numbered lists, paragraphs).
3. Fix obvious spelling errors but do NOT paraphrase or summarize — output the text as written.
4. If there are diagrams, tables, or drawings, describe them briefly in [brackets].
5. Use markdown formatting to preserve structure (## for headings, - for bullets, etc.).
6. If the note is in any other language than english, Translate the entire note to English. No need to output the original language.

Output ONLY the transcribed english translated text. Do not include any preamble like "Here is the transcription:" or similar.`,
                },
            ],
        });

        if (!text || text.trim().length === 0) {
            throw new Error("Could not extract any text from the image. Please try a clearer image.");
        }

        return text.trim();
    } catch (error: any) {
        console.error("Handwritten text extraction error:", error);
        if (error.message?.includes("not supported") || error.message?.includes("vision")) {
            throw new Error("The selected model does not support image input. Please choose a vision-capable model (e.g., Gemini 2.0 Flash).");
        }
        throw error;
    }
}
