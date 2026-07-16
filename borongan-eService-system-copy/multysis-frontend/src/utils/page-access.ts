export const normalizePagePath = (path: string): string => {
  const withoutQuery = path.trim().replace(/\?.*$/, '').toLowerCase();
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, '') : withLeadingSlash;
};

export const matchesAllowedPath = (path: string, allowedPaths: Iterable<string>): boolean => {
  const normalizedPath = normalizePagePath(path);

  for (const allowedPath of allowedPaths) {
    const normalizedAllowed = normalizePagePath(allowedPath);
    if (normalizedAllowed === normalizedPath) return true;
    if (!normalizedAllowed.includes(':')) continue;

    const allowedParts = normalizedAllowed.split('/');
    const pathParts = normalizedPath.split('/');
    if (allowedParts.length !== pathParts.length) continue;

    if (allowedParts.every((part, index) => part.startsWith(':') || part === pathParts[index])) {
      return true;
    }
  }

  return false;
};

export const hasPageAccess = (pagePath: string | undefined, allowedPaths: Iterable<string>): boolean =>
  !pagePath || matchesAllowedPath(pagePath, allowedPaths);
