jest.mock('../dev.service', () => ({
  addDevLog: jest.fn(),
}));

describe('email.service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      BREVO_API_KEY: 'xkeysib-test',
      EMAIL_FROM_NAME: 'City of Borongan',
      EMAIL_FROM_ADDRESS: 'code.agent.apphoria@gmail.com',
      EMAIL_ENABLED: 'true',
      NODE_ENV: 'test',
    };
    delete process.env.SMTP_FROM;
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: jest.fn().mockResolvedValue({ messageId: 'brevo-message-id' }),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    delete (global as any).fetch;
    jest.restoreAllMocks();
  });

  it('sends through Brevo HTTPS API when BREVO_API_KEY is set', async () => {
    const { sendEmail } = await import('../email.service');

    await expect(
      sendEmail('resident@example.com', 'Registration Approved', '<p>Approved</p>', 'Approved')
    ).resolves.toMatchObject({
      provider: 'brevo',
      messageId: 'brevo-message-id',
      status: 202,
      senderEmail: 'code.agent.apphoria@gmail.com',
    });

    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(request.headers).toMatchObject({
      'api-key': 'xkeysib-test',
      'content-type': 'application/json',
      accept: 'application/json',
    });

    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      sender: { name: 'City of Borongan', email: 'code.agent.apphoria@gmail.com' },
      to: [{ email: 'resident@example.com' }],
      subject: 'Registration Approved',
      htmlContent: '<p>Approved</p>',
      textContent: 'Approved',
    });
  });

  it('times out stuck Brevo API requests', async () => {
    process.env.EMAIL_SEND_TIMEOUT_MS = '1';
    (global as any).fetch = jest.fn((_url, request) => new Promise((_resolve, reject) => {
      request.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }));

    const { sendEmail } = await import('../email.service');

    await expect(
      Promise.race([
        sendEmail('resident@example.com', 'Registration Approved', '<p>Approved</p>', 'Approved'),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('sendEmail did not time out')), 50)),
      ])
    ).rejects.toThrow(/timed out/);
  });
});
