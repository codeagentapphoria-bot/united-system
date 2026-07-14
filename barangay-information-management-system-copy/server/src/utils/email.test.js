import test from 'node:test';
import assert from 'node:assert/strict';

test('sendEmail uses Brevo HTTPS API with attachments when BREVO_API_KEY is set', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const calls = [];

  process.env.BREVO_API_KEY = 'xkeysib-test';
  process.env.EMAIL_FROM_NAME = 'City of Borongan';
  process.env.EMAIL_FROM_ADDRESS = 'code.agent.apphoria@gmail.com';
  process.env.SMTP_FROM = 'noreply@bims.gov.ph';
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_PASS;

  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 202,
      json: async () => ({ messageId: 'brevo-message-id' }),
    };
  };

  t.after(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  const { sendEmail } = await import(`./email.js?brevo-test=${Date.now()}`);

  const result = await sendEmail({
    to: 'admin@example.com',
    subject: 'BIMS Export',
    text: 'Attached export',
    html: '<p>Attached export</p>',
    attachments: [
      {
        filename: 'export.txt',
        content: 'hello',
        contentType: 'text/plain',
      },
    ],
  });

  assert.equal(result.messageId, 'brevo-message-id');
  assert.equal(result.provider, 'brevo');
  assert.equal(result.status, 202);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.brevo.com/v3/smtp/email');
  assert.equal(calls[0].options.headers['api-key'], 'xkeysib-test');

  const body = JSON.parse(calls[0].options.body);
  assert.deepEqual(body, {
    sender: { name: 'City of Borongan', email: 'code.agent.apphoria@gmail.com' },
    to: [{ email: 'admin@example.com' }],
    subject: 'BIMS Export',
    htmlContent: '<p>Attached export</p>',
    textContent: 'Attached export',
    attachment: [
      {
        name: 'export.txt',
        content: Buffer.from('hello').toString('base64'),
      },
    ],
  });
});

test('sendEmail times out stuck Brevo API requests', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  process.env.BREVO_API_KEY = 'xkeysib-test';
  process.env.EMAIL_FROM_ADDRESS = 'code.agent.apphoria@gmail.com';
  process.env.EMAIL_SEND_TIMEOUT_MS = '1';

  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });

  t.after(() => {
    process.env = originalEnv;
    globalThis.fetch = originalFetch;
  });

  const { sendEmail } = await import(`./email.js?timeout-test=${Date.now()}`);

  await assert.rejects(
    Promise.race([
      sendEmail({
        to: 'admin@example.com',
        subject: 'BIMS Export',
        text: 'Attached export',
      }),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('sendEmail did not time out')), 50)),
    ]),
    /timed out/
  );
});
