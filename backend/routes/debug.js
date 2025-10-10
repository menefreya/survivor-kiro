const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// Debug endpoint to test database access
router.get('/test-db', async (req, res) => {
  try {
    console.log('Testing database access...');
    
    // Test 1: Check if we can query players table
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, email, name')
      .limit(3);
    
    if (playersError) {
      console.error('Players query error:', playersError);
      return res.json({
        success: false,
        error: 'Players query failed',
        details: playersError.message,
        code: playersError.code
      });
    }
    
    // Test 2: Check contestants table
    const { data: contestants, error: contestantsError } = await supabase
      .from('contestants')
      .select('id, name')
      .limit(3);
    
    if (contestantsError) {
      console.error('Contestants query error:', contestantsError);
      return res.json({
        success: false,
        error: 'Contestants query failed',
        details: contestantsError.message,
        code: contestantsError.code
      });
    }
    
    res.json({
      success: true,
      message: 'Database access working',
      data: {
        playersCount: players?.length || 0,
        contestantsCount: contestants?.length || 0,
        samplePlayer: players?.[0] || null
      }
    });
    
  } catch (error) {
    console.error('Debug test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Test environment variables
router.get('/test-env', async (req, res) => {
  res.json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,
    supabaseUrlPrefix: process.env.SUPABASE_URL?.substring(0, 30) + '...',
    nodeEnv: process.env.NODE_ENV
  });
});

module.exports = router;