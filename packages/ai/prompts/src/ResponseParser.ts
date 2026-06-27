
export class ResponseParser {
    static parseJson<T = any>(response: string): T {
        try {
            // Strip out markdown code blocks if the LLM wrapped it
            const cleaned = response.replace(/^\s*```(json)?\s*|\s*```\s*$/g, '');
            return JSON.parse(cleaned);
        } catch (err) {
            throw new Error('Failed to parse LLM response as JSON: ' + (err as Error).message);
        }
    }
}
