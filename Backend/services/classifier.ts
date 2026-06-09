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

const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isTransient(err: unknown): boolean {
    if (err instanceof Groq.APIError) {
        return TRANSIENT_STATUS_CODES.has(err.status);
    }
    if (err instanceof Error && err.message.includes('fetch')) {
        return true;
    }
    return false;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callGroq(client: Groq, content: string): Promise<Classification> {
    const completion = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Message: ${content}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
    });

    const text = completion.choices[0]?.message?.content;

    if (!text) {
        console.error('[classifier] Empty response from Groq');
        return ClassificationFallback;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        console.error('[classifier] JSON parse failed. Raw:', text);
        return ClassificationFallback;
    }

    const result = ClassificationSchema.safeParse(parsed);
    if (!result.success) {
        console.error('[classifier] Schema mismatch:', result.error.flatten());
        return ClassificationFallback;
    }

    return result.data;
}

export async function classify(content: string): Promise<Classification> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.error('[classifier] GROQ_API_KEY not set');
        return ClassificationFallback;
    }

    const client = new Groq({ apiKey, timeout: 10000 });

    let lastErr: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await callGroq(client, content);
            if (attempt > 1) {
                console.log(`[classifier] Succeeded on attempt ${attempt}`);
            }
            return result;

        } catch (err) {
            lastErr = err;

            if (!isTransient(err)) {
                console.error(`[classifier] Permanent error, not retrying:`, err);
                return ClassificationFallback;
            }

            if (attempt === MAX_RETRIES) break;

            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.warn(`[classifier] Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    console.error('[classifier] All attempts failed. Last error:', lastErr);
    return ClassificationFallback;
}