import Groq from 'groq-sdk';
import { ClassificationSchema, ClassificationFallback } from '../schemas/classification.js';
import type { Classification } from '../schemas/classification.js';

const SYSTEM_PROMPT = `
You are a message classifier. Given a message, return ONLY valid JSON matching this exact shape:
{
  "type": "lead" | "bug" | "feature" | "support",
  "urgency": "low" | "medium" | "high",
  "summary": "one sentence summary",
  "suggested_reply": "a short reply to send back"
}

Rules:
- lead: someone interested in buying or partnering
- bug: something is broken or not working
- feature: requesting new functionality
- support: how-to questions or general help
- No explanation, no markdown, no backticks — raw JSON only.
`;

export async function classify(content: string): Promise<Classification> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.error('[classifier] GROQ_API_KEY not set');
        return ClassificationFallback;
    }

    try {
        const client = new Groq({ apiKey });

        const completion = await client.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: `Message: ${content}` },
            ],
            temperature: 0.1,
        });

        const text = completion.choices[0]?.message?.content;

        if (!text) {
            console.error('[classifier] Empty response from Groq');
            return ClassificationFallback;
        }

        // const cleaned = text.replace(/```json|```/g, '').trim();
        // Force bad JSON to test fallback
const cleaned = '{ this is not json at all }';

        let parsed: unknown;
        try {
            parsed = JSON.parse(cleaned);
        } catch {
            console.error('[classifier] JSON parse failed. Raw text:', text);
            return ClassificationFallback;
        }

        const result = ClassificationSchema.safeParse(parsed);
        if (!result.success) {
            console.error('[classifier] Schema validation failed:', result.error.flatten());
            return ClassificationFallback;
        }

        return result.data;

    } catch (err) {
        console.error('[classifier] Unexpected error:', err);
        return ClassificationFallback;
    }
}