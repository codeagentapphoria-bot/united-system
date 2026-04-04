import jwt from 'jsonwebtoken';
import { parseTimeStringToSeconds } from './timeParser';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set in environment variables and be at least 32 characters long'
  );
}

// Access token: 5-15 minutes (default: 10 minutes)
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '10m';
// Refresh token: 30 days (default: 30 days)
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

// Convert to JWT format (JWT accepts '10m', '30d' directly)
const JWT_ACCESS_EXPIRES_IN = parseTimeStringToSeconds(ACCESS_TOKEN_EXPIRES);
const JWT_REFRESH_EXPIRES_IN = parseTimeStringToSeconds(REFRESH_TOKEN_EXPIRES);

export interface TokenPayload {
  id: string;
  email?: string;
  phoneNumber?: string;
  role: string;
  type: 'admin' | 'subscriber' | 'dev';
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
