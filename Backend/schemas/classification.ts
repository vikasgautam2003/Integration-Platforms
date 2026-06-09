import { z } from 'zod';

export const ClassificationSchema = z.object({
    type: z.enum(['lead', 'bug', 'feature', 'support','unknown']),
    urgency: z.enum(['low', 'medium', 'high']),
    summary: z.string().min(1),
    suggested_reply: z.string().min(1),
});

export type Classification = z.infer<typeof ClassificationSchema>;

export const ClassificationFallback: Classification = {
    type: 'unknown',
    urgency: 'high',
    summary: 'Unable to classify the message.',
    suggested_reply: 'Please provide more details about your issue.',
}