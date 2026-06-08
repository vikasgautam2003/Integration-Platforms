import { ClassificationSchema, ClassificationFallback } from '../schemas/classification.js';
import type { Classification } from '../schemas/classification.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;


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
    try{
       const response = await fetch(GEMINI_URL, { 
        method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${SYSTEM_PROMPT}\n\nMessage: ${content}`
                    }]
                }]
            }),
         });

         if (!response.ok) {
    const errorBody = await response.json();
    console.error(`[classifier] Gemini API error: ${response.status}`, JSON.stringify(errorBody, null, 2));
    return ClassificationFallback;
}

        const raw = await response.json();

        const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('[classifier] Empty response from Gemini');
            return ClassificationFallback;
        }

        const cleaned = text.replace(/```json|```/g, '').trim();
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