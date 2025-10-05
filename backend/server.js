const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Survivor Fantasy League API' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
