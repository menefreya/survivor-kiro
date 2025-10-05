const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user
 * @param {Object} payload - User data to encode in token
 * @param {number} payload.id - User ID
 * @param {string} payload.email - User email
 * @param {boolean} payload.isAdmin - Admin status
 * @returns {string} JWT token
 */
function generateToken(payload) {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '7d'
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.verify(token, secret);
}

module.exports = {
  generateToken,
  verifyToken
};
