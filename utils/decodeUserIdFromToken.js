const jwt = require('jsonwebtoken');
const { betterErrorLog } = require('./logMethods');
require('dotenv').config();

/**
 * Decodes a JWT token and extracts the user ID.
 * @param {string} token - JWT token to decode
 * @returns {string|null} - Returns the user ID if valid, otherwise null
 */
function decodeUserIdFromToken(token) {
  try {
    // Remove "Bearer " prefix if present
    const tokenWithoutBearer = token.startsWith('Bearer ') ? token.slice(7) : token;
    const decoded = jwt.verify(tokenWithoutBearer, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    betterErrorLog('> Error decing token:', error);
    return null;
  }
}

module.exports = { decodeUserIdFromToken };
