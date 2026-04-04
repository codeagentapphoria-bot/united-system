import { Response } from 'express';
import { parseTimeString } from './timeParser';

// Cookie configuration from environment variables
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
// In development, use 'lax' to allow cookies on different ports (localhost:5173 -> localhost:3000)
// In production, use 'strict' for better security
const COOKIE_SAME_SITE = (
  process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'strict' : 'lax')
).toLowerCase() as 'strict' | 'lax' | 'none';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const COOKIE_PATH = process.env.COOKIE_PATH || '/';

// Access token cookie name
const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
// Refresh token cookie name
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

// Get access token expiration in milliseconds for cookie maxAge
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '10m';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '30d';

/**
 * Set access token in HTTP-only, secure cookie
 */
export const setAccessTokenCookie = (res: Response, token: string): void => {
  const maxAge = Math.floor(parseTimeString(ACCESS_TOKEN_EXPIRES) / 1000); // Convert to seconds

  const cookieOptions: any = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    maxAge,
    path: COOKIE_PATH,
  };

  // Only set domain if explicitly configured (don't set for localhost)
  if (COOKIE_DOMAIN) {
    cookieOptions.domain = COOKIE_DOMAIN;
  }

  res.cookie(ACCESS_TOKEN_COOKIE_NAME, token, cookieOptions);
};

/**
 * Set refresh token in HTTP-only, secure cookie
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  const maxAge = Math.floor(parseTimeString(REFRESH_TOKEN_EXPIRES) / 1000); // Convert to seconds

  const cookieOptions: any = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    maxAge,
    path: COOKIE_PATH,
  };

  // Only set domain if explicitly configured (don't set for localhost)
  if (COOKIE_DOMAIN) {
    cookieOptions.domain = COOKIE_DOMAIN;
  }

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, cookieOptions);
};

/**
 * Clear both access and refresh token cookies
 */
export const clearAuthCookies = (res: Response): void => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: COOKIE_PATH,
    domain: COOKIE_DOMAIN,
  });

  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: COOKIE_SAME_SITE,
    path: COOKIE_PATH,
    domain: COOKIE_DOMAIN,
  });
};

/**
 * Get access token from cookie name (for reference)
 */
export const getAccessTokenCookieName = (): string => ACCESS_TOKEN_COOKIE_NAME;

/**
 * Get refresh token from cookie name (for reference)
 */
export const getRefreshTokenCookieName = (): string => REFRESH_TOKEN_COOKIE_NAME;
