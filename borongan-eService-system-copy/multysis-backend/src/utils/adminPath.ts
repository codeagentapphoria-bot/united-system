const trimTrailingSlash = (path: string): string => (path.length > 1 ? path.replace(/\/+$/, '') : path);

export const normalizeAdminPath = (path: string): string => {
  const withoutQuery = path.trim().replace(/\?.*$/, '').toLowerCase();
  const withLeadingSlash = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  return trimTrailingSlash(withLeadingSlash);
};

export const matchesAllowedPath = (path: string, allowedPaths: string[]): boolean => {
  const normalizedPath = normalizeAdminPath(path);

  return allowedPaths.some((allowedPath) => {
    const normalizedAllowed = normalizeAdminPath(allowedPath);
    if (normalizedAllowed === normalizedPath) return true;
    if (!normalizedAllowed.includes(':')) return false;

    const allowedParts = normalizedAllowed.split('/');
    const pathParts = normalizedPath.split('/');
    if (allowedParts.length !== pathParts.length) return false;

    return allowedParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
  });
};

export const serviceCodeToAdminPath = (serviceCode: string): string =>
  `/admin/e-government/${serviceCode.trim().toLowerCase().replace(/_/g, '-')}`;

export const adminPathToServiceCode = (path: string): string | null => {
  const normalizedPath = normalizeAdminPath(path);
  const prefix = '/admin/e-government/';
  if (!normalizedPath.startsWith(prefix)) return null;

  const servicePath = normalizedPath.slice(prefix.length);
  if (!servicePath || servicePath.includes('/') || servicePath.startsWith(':')) return null;

  return servicePath.toUpperCase().replace(/-/g, '_');
};
