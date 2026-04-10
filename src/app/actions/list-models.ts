"use server";

interface GeminiModel {
    name: string;
    displayName: string;
    supportedGenerationMethods: string[];
}

interface ListModelsResponse {
    models: GeminiModel[];
    nextPageToken?: string;
}

export interface AvailableModel {
    id: string;         // e.g. "googleai/gemini-2.0-flash"
    displayName: string;
    supportsVision: boolean;
}

// Simple in-memory cache
let cachedModels: AvailableModel[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function listModelsAction(): Promise<AvailableModel[]> {
    const now = Date.now();
    if (cachedModels && now - cacheTimestamp < CACHE_TTL_MS) {
        return cachedModels;
    }

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENAI_API_KEY is not set");
    }

    try {
        const allModels: GeminiModel[] = [];
        let pageToken: string | undefined;

        // Paginate through all models
        do {
            const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
            url.searchParams.set("key", apiKey);
            url.searchParams.set("pageSize", "100");
            if (pageToken) {
                url.searchParams.set("pageToken", pageToken);
            }

            const res = await fetch(url.toString(), { cache: "no-store" });
            if (!res.ok) {
                throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`);
            }

            const data: ListModelsResponse = await res.json();
            allModels.push(...(data.models || []));
            pageToken = data.nextPageToken;
        } while (pageToken);

        // Filter to only models that support content generation
        const generativeModels = allModels.filter(m =>
            m.supportedGenerationMethods?.includes("generateContent")
        );

        // Known vision-capable model patterns
        const visionPatterns = [
            "gemini-2", "gemini-3", "gemini-pro-vision",
            "gemini-1.5", "gemini-2.0", "gemini-2.5",
        ];

        const models: AvailableModel[] = generativeModels.map(m => {
            // m.name is like "models/gemini-2.0-flash"
            const shortName = m.name.replace("models/", "");
            const supportsVision = visionPatterns.some(p => shortName.includes(p));

            return {
                id: `googleai/${shortName}`,
                displayName: m.displayName || shortName,
                supportsVision,
            };
        });

        // Sort: put commonly used models first
        models.sort((a, b) => {
            // Prioritize stable releases over experimental/preview
            const aIsPreview = a.id.includes("preview") || a.id.includes("exp");
            const bIsPreview = b.id.includes("preview") || b.id.includes("exp");
            if (aIsPreview !== bIsPreview) return aIsPreview ? 1 : -1;
            return a.displayName.localeCompare(b.displayName);
        });

        cachedModels = models;
        cacheTimestamp = now;
        return models;
    } catch (error) {
        console.error("Error listing models:", error);
        // Return a sensible fallback list
        return [
            { id: "googleai/gemini-2.0-flash", displayName: "Gemini 2.0 Flash", supportsVision: true },
            { id: "googleai/gemini-2.0-flash-lite", displayName: "Gemini 2.0 Flash Lite", supportsVision: true },
            { id: "googleai/gemini-2.5-flash-preview-04-17", displayName: "Gemini 2.5 Flash Preview", supportsVision: true },
            { id: "googleai/gemini-2.5-pro-preview-05-06", displayName: "Gemini 2.5 Pro Preview", supportsVision: true },
        ];
    }
}
