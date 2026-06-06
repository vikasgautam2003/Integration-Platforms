import express from "express";
import type { Request, Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
const HEALTH_ENDPOINT = process.env.HEALTH || '/api/health';

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check at ${HEALTH_ENDPOINT}`);
});