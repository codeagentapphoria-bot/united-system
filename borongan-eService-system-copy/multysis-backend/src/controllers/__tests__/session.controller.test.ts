import { Response } from 'express';
import { getSessionStatusController } from '../session.controller';
import { AuthRequest } from '../../middleware/auth';
import cacheService from '../../services/cache.service';

jest.mock('../../services/cache.service', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedCache = cacheService as jest.Mocked<typeof cacheService>;

describe('getSessionStatusController', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    status = jest.fn().mockReturnThis();
    json = jest.fn().mockReturnThis();
    req = {
      user: {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        type: 'admin',
      },
    };
    res = { status, json };
    jest.clearAllMocks();
  });

  it('does not report an expired session when Redis bookkeeping is missing', async () => {
    mockedCache.get.mockResolvedValue(null);

    await getSessionStatusController(req as AuthRequest, res as Response);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        idleRemainingMs: null,
        absoluteRemainingMs: null,
        error: 'session_status_unavailable',
      },
    });
  });
});
