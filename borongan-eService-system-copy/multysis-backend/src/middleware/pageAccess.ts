import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { getAllowedPages } from '../services/user.service';

/**
 * requirePageAccess — defense-in-depth middleware for admin routes.
 *
 * The frontend AccessControlGate already blocks unauthorized users at the UI level.
 * This middleware validates the X-Page-Path header (sent by the axios interceptor)
 * against the user's allowed pages from the database.
 *
 * If the header is absent (e.g. direct API calls or third-party clients),
 * the request passes through — frontend guards + backend verifyAdmin are still in effect.
 * If the header is present and the page is not in the user's allowed list → 403.
 */
export const requirePageAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const pagePath = req.headers['x-page-path'] as string | undefined;

  // No header — let the request through (frontend guards handle it)
  if (!pagePath) {
    next();
    return;
  }

  // Skip path normalization for dynamic routes (e.g. /admin/e-government/:serviceCode)
  // The frontend AccessControlGate checks exact paths; backend allows the pattern
  const normalizedPath = normalizePath(pagePath);

  try {
    const allowedPages = await getAllowedPages(req.user!.id);
    const allowedPaths = allowedPages.map((p) => normalizePath(p.path));

    if (!allowedPaths.includes(normalizedPath) && !matchesDynamicPath(normalizedPath, allowedPaths)) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied to this page',
        code: 'PAGE_ACCESS_DENIED',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('requirePageAccess: failed to check page access:', error);
    // Fail open — if the DB check fails, let the request through
    // (frontend guards + verifyAdmin still protect the route)
    next();
  }
};

/**
 * Normalize a page path for comparison.
 * - Strip trailing slashes
 * - Lowercase
 */
function normalizePath(path: string): string {
  return path.toLowerCase().replace(/\/$/, '').trim();
}

/**
 * Check if a path matches any allowed dynamic path pattern.
 * e.g. /admin/e-government/BPLS matches /admin/e-government/:serviceCode
 */
function matchesDynamicPath(path: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((allowed) => {
    if (!allowed.includes(':')) return false;

    const allowedParts = allowed.split('/');
    const pathParts = path.split('/');

    if (allowedParts.length !== pathParts.length) return false;

    return allowedParts.every((part, i) => {
      if (part.startsWith(':')) return true; // dynamic segment matches anything
      return part === pathParts[i];
    });
  });
}
