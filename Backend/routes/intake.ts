import { Router } from 'express';
import type { Request, Response } from 'express';
import { IntakeSchema } from '../schemas/intake.js';
import type { IntakeMessage } from '../schemas/intake.js';
import type { Classification } from '../schemas/classification.js';
import { supabase } from '../services/supabase.js';
import { classify } from '../services/classifier.js';

export const intakeRouter = Router();

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

    try {
        
    const { data: existingSignal, error: lookupError } = await supabase
        .from('signals')
        .select('id')
        .eq('id', message.id)
        .maybeSingle();

    if (lookupError) {
        throw lookupError;
    }

    if (existingSignal) {
        res.status(200).json({ accepted: true, duplicate: true });
        return;
    }


    const classification = await classify(message.content);

    const { data, error } = await supabase
        .from('signals')
        .insert([
            {
                id: message.id,
                source: message.source,
                content: message.content,

                type: classification.type,
                urgency: classification.urgency,
                summary: classification.summary,
                suggested_reply: classification.suggested_reply,

                status: 'classified',
            },
        ])
        .select();

    if (error) {
        if (error.code === '23505') {
            res.status(200).json({
                accepted: true,
                duplicate: true,
            });
            return;
        }

        throw error;
    }

    res.status(201).json({
        accepted: true,
        duplicate: false,
        signal: data?.[0],
    });
} catch (error) {
    console.error(error);

    res.status(500).json({
        error: 'Failed to process intake message',
    });
}
});