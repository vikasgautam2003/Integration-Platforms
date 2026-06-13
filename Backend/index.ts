// import express from "express";
// import type { Request, Response } from 'express';
// import dotenv from 'dotenv';
// import { z } from 'zod';

// dotenv.config();


// const seenIds = new Set<string>();

// const app = express();

// app.use(express.json());


// const IntakeSchema = z.object({
//     id: z.string().uuid(),  
//     source: z.enum(['web', 'email', 'slack']),
//     content: z.string().min(1),
//     email: z.string().email().optional(),
// });

// type IntakeMessage = z.infer<typeof IntakeSchema>;

// const messages: IntakeMessage[] = [];

// app.post('/api/intake', (req: Request, res: Response) => {
//     const result = IntakeSchema.safeParse(req.body);

//     if(!result.success){
//         res.status(400).json({
//             error: 'Invalid input',
//             details: result.error.flatten().fieldErrors
//         });
//         return;
//     }

//     const message: IntakeMessage = result.data;

//     if (seenIds.has(message.id)) {
//         res.status(200).json({ accepted: true, duplicate: true });
//         return;
//     }

//     seenIds.add(message.id);
//     messages.push(message);

//     console.log('Received message:', message);
//     res.status(202).json({ accepted: true, message });

// })


// app.get('/', (req: Request, res: Response) => {
//     res.send('Hello, World!');
// });

// app.get('/api/health', (req: Request, res: Response) => {
//     console.log('Health check endpoint hit: ' + process.env.HEALTH);
//     res.json({ status: 'ok', endpoint: process.env.HEALTH || '/api/health' });
// });

// const PORT = process.env.PORT || 4000;
// const HEALTH_ENDPOINT = process.env.HEALTH || '/api/health';

// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`Health check at ${HEALTH_ENDPOINT}`);
// });







import "dotenv/config";
import express from 'express';
//import * as dotenv from 'dotenv';
import { intakeRouter } from './routes/intake.js';
import { supabase } from "./services/supabase.js";

//dotenv.config();

const app = express();

// async function testSupabase() {
//   const { data, error } = await supabase
//     .from("signals")
//     .insert([
//       {
//         id: crypto.randomUUID(),
//         source: "web",
//         content: "Supabase connection test",
//         type: "bug",
//         urgency: "low",
//         summary: "Testing database insertion",
//         suggested_reply: "Test reply",
//         status: "classified",
//       },
//     ])
//     .select();

//   console.log("DATA:", data);
//   console.log("ERROR:", error);
// }
// testSupabase();
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/intake', intakeRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});