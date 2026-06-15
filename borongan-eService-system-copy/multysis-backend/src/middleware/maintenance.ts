import { Request, Response, NextFunction } from 'express';

interface MaintenanceConfig {
  admin: boolean;
  portal: boolean;
  api: boolean;
  message: string;
}

function getConfig(): MaintenanceConfig {
  return {
    admin: process.env.MAINTENANCE_ADMIN === 'true',
    portal: process.env.MAINTENANCE_PORTAL === 'true',
    api: process.env.MAINTENANCE_API === 'true',
    message: process.env.MAINTENANCE_MESSAGE || 'This section is under maintenance. Please try again later.',
  };
}

function buildHtmlPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Under Maintenance</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 480px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      color: #eab308;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 0.75rem;
    }
    p {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .status {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#9888;</div>
    <h1>Under Maintenance</h1>
    <p>${message}</p>
    <span class="status">503 Service Unavailable</span>
  </div>
</body>
</html>`;
}

export const maintenanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const config = getConfig();

  const path = req.path;

  // Normalize path: remove leading /api prefix for module detection
  const normalized = path.startsWith('/api/') ? path.slice(4) : path;

  let isBlocked = false;
  if (normalized.startsWith('admin/') && config.admin) isBlocked = true;
  if (normalized.startsWith('portal/') && config.portal) isBlocked = true;
  if (!normalized.startsWith('admin/') && !normalized.startsWith('portal/') && config.api) isBlocked = true;

  if (isBlocked) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Retry-After', '3600');
    res.status(503).send(buildHtmlPage(config.message));
    return;
  }

  next();
};
