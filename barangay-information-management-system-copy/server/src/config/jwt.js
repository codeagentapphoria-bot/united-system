import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { loadEnvConfig } from '../utils/envLoader.js';

// Load environment variables
loadEnvConfig();

export const generateToken = (payload, options = {}) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRES_IN,
    ...options
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId: String(userId), type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};
