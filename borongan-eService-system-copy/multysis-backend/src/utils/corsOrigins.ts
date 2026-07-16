const DEFAULT_LOCAL_ORIGIN = 'http://localhost:5174';
const PRODUCTION_ORIGINS = ['https://borongan-eservice.vercel.app'];

export const parseCorsOrigins = (rawOrigin = process.env.CORS_ORIGIN): string[] => {
  const configured = (rawOrigin || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...(configured.length ? configured : [DEFAULT_LOCAL_ORIGIN]), ...PRODUCTION_ORIGINS]));
};
