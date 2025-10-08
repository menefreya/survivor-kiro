const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'https://survivor-kiro.vercel.app',
  'https://survivor-league.app',
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    // In development mode, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      // Allow any localhost origin in development
      if (origin && origin.includes('localhost')) {
        return callback(null, true);
      }
      // Allow any 127.0.0.1 origin in development
      if (origin && origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.FRONTEND_URL === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
const eventTypeRoutes = require('./routes/eventTypes');
const eventRoutes = require('./routes/events');
const predictionRoutes = require('./routes/predictions');
const episodeRoutes = require('./routes/episodes');

app.use('/api/auth', authRoutes);
app.use('/api/contestants', contestantRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/sole-survivor', soleSurvivorRoutes);
app.use('/api/draft', draftRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/event-types', eventTypeRoutes);
app.use('/api', eventRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/episodes', episodeRoutes);

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
