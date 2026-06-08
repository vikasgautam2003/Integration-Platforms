import { Router } from 'express';
import type { Request, Response } from 'express';
import { IntakeSchema } from '../schemas/intake.js';
import type { IntakeMessage } from '../schemas/intake.js';
import type { Classification } from '../schemas/classification.js';
import { classify } from '../services/classifier.js';

export const intakeRouter = Router();

type StoredMessage = IntakeMessage & {
    classification?: Classification;
    receivedAt: string;
};

export const messages: StoredMessage[] = [];
const seenIds = new Set<string>();

intakeRouter.post('/', async (req: Request, res: Response) => {
    const result = IntakeSchema.safeParse(req.body);

    if (!result.success) {
        res.status(400).json({
            error: 'Invalid input',
            details: result.error.flatten().fieldErrors,
        });
        return;
    }

    const message = result.data;

    if (seenIds.has(message.id)) {
        res.status(200).json({ accepted: true, duplicate: true });
        return;
    }

    const stored: StoredMessage = {
        ...message,
        receivedAt: new Date().toISOString(),
    };

    seenIds.add(message.id);
    messages.push(stored);

    // 202 immediately — don't wait for Gemini
    res.status(202).json({ accepted: true, duplicate: false });

    // Classify async in background
    classify(message.content).then((classification) => {
        stored.classification = classification;
        console.log(`[intake] Classified ${message.id}:`, classification);
    });
});