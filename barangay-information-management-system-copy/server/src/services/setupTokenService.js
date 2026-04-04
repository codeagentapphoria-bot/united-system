import { generateToken, verifyToken } from '../config/jwt.js';
import { ApiError } from '../utils/apiError.js';
import logger from '../utils/logger.js';

class SetupTokenService {
  /**
   * Generate a secure setup token for barangay admin setup
   * @param {Object} setupData - Setup data containing barangay and admin info
   * @returns {string} JWT token for setup
   */
  static generateSetupToken(setupData) {
    const { barangayId, barangayName, barangayCode, fullName, email } = setupData;
    
    const payload = {
      type: 'setup',
      barangayId,
      barangayName,
      barangayCode,
      fullName,
      email,
      iat: Math.floor(Date.now() / 1000),
    };

    // Generate token with 48-hour expiration for setup
    return generateToken(payload, { expiresIn: '48h' });
  }

  /**
   * Verify and decode setup token
   * @param {string} token - JWT setup token
   * @returns {Object} Decoded token payload
   */
  static verifySetupToken(token) {
    try {
      const decoded = verifyToken(token);
      
      // Validate token type
      if (decoded.type !== 'setup') {
        throw new ApiError(401, 'Invalid token type');
      }

      // Check if token is expired (additional check)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        throw new ApiError(401, 'Setup token has expired');
      }

      return decoded;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error('Setup token verification failed:', error.message);
      throw new ApiError(401, 'Invalid or expired setup token');
    }
  }

  /**
   * Generate setup link with secure token
   * @param {Object} setupData - Setup data
   * @param {string} baseUrl - Base URL for the application
   * @returns {string} Secure setup link
   */
  static generateSetupLink(setupData, baseUrl) {
    const token = this.generateSetupToken(setupData);
    return `${baseUrl}/setup-account?token=${token}`;
  }

  /**
   * Validate setup token and return setup data
   * @param {string} token - Setup token from URL
   * @returns {Object} Validated setup data
   */
  static validateSetupToken(token) {
    if (!token) {
      throw new ApiError(400, 'Setup token is required');
    }

    const decoded = this.verifySetupToken(token);
    
    // Return the setup data
    return {
      barangayId: decoded.barangayId,
      barangayName: decoded.barangayName,
      barangayCode: decoded.barangayCode,
      fullName: decoded.fullName,
      email: decoded.email,
      token: token
    };
  }
}

export default SetupTokenService;
