import nodemailer from 'nodemailer';
import { addDevLog } from './dev.service';

// SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT.trim(), 10) : 587;
const SMTP_SECURE = process.env.SMTP_SECURE?.toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME?.trim();
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS?.trim();
const EMAIL_SEND_TIMEOUT_MS = process.env.EMAIL_SEND_TIMEOUT_MS
  ? parseInt(process.env.EMAIL_SEND_TIMEOUT_MS.trim(), 10)
  : 10_000;
const SMTP_FROM =
  process.env.SMTP_FROM?.trim() ||
  (EMAIL_FROM_ADDRESS
    ? `${EMAIL_FROM_NAME ? `${EMAIL_FROM_NAME} ` : ''}<${EMAIL_FROM_ADDRESS}>`
    : 'noreply@multysis.local');
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();

export type EmailSendResult = {
  provider: 'brevo' | 'smtp';
  messageId?: string;
  status?: number;
  senderEmail?: string;
};

// Initialize nodemailer transporter (only if valid credentials are provided)
let transporter: nodemailer.Transporter | null = null;

// Validate SMTP credentials before initializing
const isBrevoConfigured = (): boolean => Boolean(BREVO_API_KEY);

const isEmailConfigured = (): boolean => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return false;
  }

  // Validate port
  if (isNaN(SMTP_PORT) || SMTP_PORT < 1 || SMTP_PORT > 65535) {
    console.warn('⚠️  Invalid SMTP_PORT. Port must be between 1 and 65535.');
    return false;
  }

  return true;
};

const parseSender = (value: string): { name?: string; email: string } => {
  const match = value.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) return { email: value.trim() };
  const name = match[1].trim().replace(/^['"]|['"]$/g, '');
  return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
};

const sendViaBrevoApi = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
  from?: string,
  replyTo?: string
): Promise<EmailSendResult> => {
  const sender = parseSender(from || SMTP_FROM);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_SEND_TIMEOUT_MS);
  let res: Response;

  try {
    res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'api-key': BREVO_API_KEY as string,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to.trim() }],
        subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]*>/g, ''),
        ...(replyTo ? { replyTo: { email: replyTo.trim() } } : {}),
      }),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Brevo API send timed out after ${EMAIL_SEND_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API send failed (${res.status}): ${body}`);
  }

  const data = await res.json().catch(() => ({}));
  const messageId = (data as any)?.messageId;
  console.log(
    `✅ Email accepted to ${to} from ${sender.email} via Brevo; status=${res.status}; messageId=${messageId ?? ''}`
  );
  return { provider: 'brevo', messageId, status: res.status, senderEmail: sender.email };
};

if (isBrevoConfigured()) {
  console.log('✅ Brevo email API configured');
}

if (isEmailConfigured()) {
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      connectionTimeout: 10_000,  // 10s — fail fast instead of hanging for 30s
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    console.log('✅ Email transporter initialized successfully');
  } catch (error: any) {
    console.error('❌ Failed to initialize email transporter:', error.message);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Email transporter initialization failed. Please check your SMTP credentials.'
      );
    }
    console.warn(
      '⚠️  Continuing without email (development mode). Email functionality will not work.'
    );
  }
} else if (!isBrevoConfigured()) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  SMTP credentials not configured. Email functionality will not work.');
  } else {
    console.warn(
      '⚠️  SMTP credentials not configured. Email functionality disabled (development mode).'
    );
  }
}

/**
 * Check if email is enabled via environment variable
 * @returns true if email is enabled, false otherwise
 */
export const isEmailEnabled = (): boolean => {
  // Check environment variable first (explicit control)
  const emailEnabledEnv = process.env.EMAIL_ENABLED?.toLowerCase();
  if (emailEnabledEnv === 'false' || emailEnabledEnv === '0' || emailEnabledEnv === 'no') {
    return false;
  }
  if (emailEnabledEnv === 'true' || emailEnabledEnv === '1' || emailEnabledEnv === 'yes') {
    return isEmailAvailable();
  }

  return isEmailAvailable();
};

/**
 * Check if email transporter is configured and available
 * @returns true if email transporter is properly configured, false otherwise
 */
export const isEmailAvailable = (): boolean => {
  return isBrevoConfigured() || (transporter !== null && isEmailConfigured());
};

/**
 * Send email using nodemailer
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML email content
 * @param text - Plain text email content (optional)
 * @param from - Sender email address (optional, defaults to SMTP_FROM)
 * @param replyTo - Reply-to email address (optional)
 * @throws Error if email transporter is not configured or email sending fails
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
  from?: string,
  replyTo?: string
): Promise<EmailSendResult> => {
  if (!to || !to.trim()) {
    throw new Error('Recipient email address is required');
  }

  if (isBrevoConfigured()) {
    return sendViaBrevoApi(to, subject, html, text, from, replyTo);
  }

  if (!transporter) {
    throw new Error(
      'Email transporter is not configured. Please set BREVO_API_KEY or SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.'
    );
  }

  try {
    const mailOptions = {
      from: from || SMTP_FROM,
      to: to.trim(),
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text fallback
      html,
      ...(replyTo && { replyTo }),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return { provider: 'smtp', messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);

    // Provide more helpful error messages
    let errorMessage = error.message || 'Unknown error';

    if (error.code === 'EAUTH') {
      errorMessage =
        'SMTP authentication failed. Please check your SMTP_USER and SMTP_PASS credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage =
        'Failed to connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT settings.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage =
        'SMTP connection timed out. Please check your network connection and SMTP settings.';
    } else if (error.responseCode === 550) {
      errorMessage = 'Recipient email address not found or invalid.';
    } else if (error.responseCode === 553) {
      errorMessage = 'Invalid sender email address.';
    }

    // Log email failure to dev dashboard
    addDevLog('error', 'Email sending failed', {
      to,
      subject,
      error: errorMessage,
      errorCode: error.code || error.responseCode,
    });

    throw new Error(`Failed to send email: ${errorMessage}`);
  }
};

/**
 * Safely send email without throwing errors (for non-critical notifications)
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param html - HTML email content
 * @param text - Plain text email content (optional)
 * @param from - Sender email address (optional)
 * @param replyTo - Reply-to email address (optional)
 * @returns true if email was sent successfully, false otherwise
 */
export const sendEmailSafely = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
  from?: string,
  replyTo?: string
): Promise<boolean> => {
  try {
    if (!isEmailAvailable()) {
      console.warn(`⚠️  Email not configured. Skipping email to ${to}`);
      return false;
    }
    await sendEmail(to, subject, html, text, from, replyTo);
    return true;
  } catch (error: any) {
    console.error(`⚠️  Failed to send email to ${to}:`, error.message);
    // Log email failure (already logged in sendEmail, but log here for safe sends too)
    addDevLog('warn', 'Email sending failed (safe mode)', {
      to,
      subject,
      error: error.message,
    });
    return false;
  }
};
