import { emitNewTransaction, emitTransactionUpdate, setSocketInstance } from '../socket.service';

jest.mock('../cache.service', () => ({
  __esModule: true,
  default: {
    del: jest.fn(),
  },
}));

describe('socket service scoped emits', () => {
  const emit = jest.fn();
  const to = jest.fn(() => ({ emit }));

  beforeEach(() => {
    jest.clearAllMocks();
    setSocketInstance({ to } as any);
  });

  it('emits new transactions to the service room', async () => {
    await emitNewTransaction({
      id: 'transaction-1',
      residentId: 'resident-1',
      transactionId: 'BPLS-2026-001',
      serviceId: 'service-1',
      serviceCode: 'BPLS',
      paymentStatus: 'PENDING',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(to).toHaveBeenCalledWith('service:BPLS');
    expect(emit).toHaveBeenCalledWith(
      'transaction:new',
      expect.objectContaining({ id: 'transaction-1', serviceCode: 'BPLS' })
    );
  });

  it('emits transaction updates to the service room', async () => {
    await emitTransactionUpdate('transaction-1', {
      serviceCode: 'BPLS',
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(to).toHaveBeenCalledWith('service:BPLS');
    expect(emit).toHaveBeenCalledWith(
      'transaction:update',
      expect.objectContaining({ transactionId: 'transaction-1', serviceCode: 'BPLS' })
    );
  });
});
