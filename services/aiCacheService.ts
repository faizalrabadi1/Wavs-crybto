// A simple in-memory cache for AI-generated responses to prevent rate-limiting.
const aiResponseCache = new Map<string, string>();

/**
 * Retrieves a cached AI response.
 * @param key A unique key for the request (e.g., `type-pair-timeframe-difficulty`).
 * @returns The cached response string or undefined if not found.
 */
export const getCachedAiResponse = (key: string): string | undefined => {
    return aiResponseCache.get(key);
};

/**
 * Stores an AI response in the cache.
 * @param key A unique key for the request.
 * @param response The AI-generated response string to cache.
 */
export const setCachedAiResponse = (key: string, response: string): void => {
    // Basic cache eviction policy to prevent unbounded memory growth.
    if (aiResponseCache.size >= 50) {
        const oldestKey = aiResponseCache.keys().next().value;
        aiResponseCache.delete(oldestKey);
    }
    aiResponseCache.set(key, response);
};
