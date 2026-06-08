import { z } from 'zod';

export const IntakeSchema = z.object({
    id: z.string().uuid(),
    source: z.enum(['web', 'email', 'slack']),
    content: z.string().min(1),
    email: z.string().email().optional(),
});

export type IntakeMessage = z.infer<typeof IntakeSchema>;