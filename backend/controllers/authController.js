const crypto = require('crypto');
const supabase = require('../db/supabase');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { sendPasswordResetEmail } = require('../utils/email');

/**
 * Sign up a new user
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    const { email, password, name, profile_image_url } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('players')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create new player
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        email,
        password_hash,
        name,
        profile_image_url: profile_image_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Generate JWT token
    const token = generateToken({
      id: newPlayer.id,
      email: newPlayer.email,
      isAdmin: newPlayer.is_admin
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: newPlayer.id,
        email: newPlayer.email,
        name: newPlayer.name,
        profile_image_url: newPlayer.profile_image_url,
        is_admin: newPlayer.is_admin
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Log in an existing user
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !player) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, player.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: player.id,
      email: player.email,
      isAdmin: player.is_admin
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: player.id,
        email: player.email,
        name: player.name,
        profile_image_url: player.profile_image_url,
        is_admin: player.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Logout user (client-side token removal)
 * POST /api/auth/logout
 */
function logout(req, res) {
  // Logout is handled client-side by removing the token
  // This endpoint exists for consistency and future server-side token invalidation
  res.json({ message: 'Logout successful' });
}

/**
 * Get current authenticated user info
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  try {
    const userId = req.user.id;

    const { data: player, error } = await supabase
      .from('players')
      .select('id, email, name, profile_image_url, is_admin, has_submitted_rankings, sole_survivor_id')
      .eq('id', userId)
      .single();

    if (error || !player) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: player
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Request a password reset email
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always respond the same way to avoid leaking whether an email exists
    const { data: player } = await supabase
      .from('players')
      .select('id, email')
      .eq('email', email)
      .single();

    if (player) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await supabase
        .from('players')
        .update({
          password_reset_token: hashedToken,
          password_reset_expires: expires
        })
        .eq('id', player.id);

      await sendPasswordResetEmail(player.email, rawToken);
    }

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Reset password using token
 * POST /api/auth/reset-password
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const { data: player } = await supabase
      .from('players')
      .select('id, password_reset_token, password_reset_expires')
      .eq('password_reset_token', hashedToken)
      .single();

    if (!player) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }

    if (new Date(player.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    }

    const password_hash = await hashPassword(password);

    await supabase
      .from('players')
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_expires: null
      })
      .eq('id', player.id);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  signup,
  login,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword
};
