const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Decodes a JWT token and extracts the user ID.
 * @param {string} token - JWT token to decode
 * @returns {string|null} - Returns the user ID if valid, otherwise null
 */
function decodeUserIdFromToken(token) {
  try {
    console.log('decodeUserIdFromToken called.');
    // Remove "Bearer " prefix if present
    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token;

    console.log('Token without bearer is', tokenWithoutBearer);
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded);
    return decoded.userId;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

module.exports = { decodeUserIdFromToken };
