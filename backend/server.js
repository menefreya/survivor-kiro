const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const contestantRoutes = require('./routes/contestants');
const playerRoutes = require('./routes/players');
const rankingRoutes = require('./routes/rankings');
const soleSurvivorRoutes = require('./routes/soleSurvivor');
const draftRoutes = require('./routes/draft');
const scoreRoutes = require('./routes/scores');
const leaderboardRoutes = require('./routes/leaderboard');

app.use('/api/auth', authRoutes);
app.use('/api/contestants', contestantRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/sole-survivor', soleSurvivorRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Survivor Fantasy League API',
    endpoints: ['/api/health', '/api/auth', '/api/contestants', '/api/leaderboard']
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Survivor Fantasy League API' });
});

// Debug endpoint to check environment variables
app.get('/api/debug/env', (req, res) => {
  res.json({
    FRONTEND_URL: process.env.FRONTEND_URL || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    VERCEL: process.env.VERCEL || 'not set',
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
});

// Start server (only if not in serverless environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
