import express from "express";
const app = express();
app.get('/', (req, res) => {
    res.send('Hello, World!');
});
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
const PORT = process.env.PORT || 4000;
const HEALTH_ENDPOINT = process.env.HEALTH || '/api/health';
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check at ${HEALTH_ENDPOINT}`);
});
