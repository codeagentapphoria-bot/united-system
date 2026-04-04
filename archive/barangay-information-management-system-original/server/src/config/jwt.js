import jwt from 'jsonwebtoken';
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