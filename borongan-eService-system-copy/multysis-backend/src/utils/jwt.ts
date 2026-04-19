import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { parseTimeStringToSeconds } from './timeParser';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET must be set in environment variables and be at least 32 characters long'
  );
}

const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '10m';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

const JWT_ACCESS_EXPIRES_IN = parseTimeStringToSeconds(ACCESS_TOKEN_EXPIRES);
const JWT_REFRESH_EXPIRES_IN = parseTimeStringToSeconds(REFRESH_TOKEN_EXPIRES);

export interface TokenPayload {
  id: string;
  email?: string;
  username?: string;
  role: string;
  type: 'admin' | 'resident' | 'dev';
}

export interface RefreshTokenPayload extends TokenPayload {
  jti: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
};

// Returns both the signed JWT and the embedded `jti` claim so callers can store
// the jti as the DB lookup key instead of hashing the token.
export const generateRefreshToken = (payload: TokenPayload): { token: string; jti: string } => {
  const jti = randomUUID();
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    jwtid: jti,
  } as jwt.SignOptions);
  return { token, jti };
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET) as RefreshTokenPayload;
  if (!decoded.jti) {
    throw new Error('Refresh token missing jti claim');
  }
  return decoded;
};
