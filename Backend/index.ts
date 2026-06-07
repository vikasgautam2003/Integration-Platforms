import express from "express";
import type { Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, World!');
});

app.get('/api/health', (req: Request, res: Response) => {
    console.log('Health check endpoint hit: ' + process.env.HEALTH);
    res.json({ status: 'ok', endpoint: process.env.HEALTH || '/api/health' });
});

const PORT = process.env.PORT || 4000;
const HEALTH_ENDPOINT = process.env.HEALTH || '/api/health';

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check at ${HEALTH_ENDPOINT}`);
});