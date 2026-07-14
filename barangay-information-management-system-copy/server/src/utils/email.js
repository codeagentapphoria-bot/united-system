import nodemailer from "nodemailer";
import logger from "./logger.js";

// Brevo's HTTPS API works on Railway; Gmail SMTP remains a local fallback.
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const EMAIL_SEND_TIMEOUT_MS = Number.parseInt(process.env.EMAIL_SEND_TIMEOUT_MS || "10000", 10);
const SMTP_FROM =
  process.env.SMTP_FROM ||
  (process.env.EMAIL_FROM_ADDRESS
    ? `${process.env.EMAIL_FROM_NAME ? `${process.env.EMAIL_FROM_NAME} ` : ""}<${process.env.EMAIL_FROM_ADDRESS}>`
    : GMAIL_USER);

function parseSender(value) {
  const match = value?.match(/^(.*?)\s*<([^>]+)>$/);
  if (!match) return { email: value?.trim() };
  const name = match[1].trim().replace(/^['"]|['"]$/g, '');
  return name ? { name, email: match[2].trim() } : { email: match[2].trim() };
}

async function sendViaBrevoApi({ to, subject, text, html, from, attachments = [] }) {
  const sender = parseSender(from || SMTP_FROM);
  if (!sender.email) throw new Error("Sender email is required. Set SMTP_FROM for Brevo email.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_SEND_TIMEOUT_MS);

  const attachment = attachments.map((attachment) => ({
    name: attachment.filename,
    content: Buffer.isBuffer(attachment.content)
      ? attachment.content.toString("base64")
      : Buffer.from(attachment.content).toString("base64"),
  }));

  let res;
  try {
    res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        ...(attachment.length ? { attachment } : {}),
      }),
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Brevo API send timed out after ${EMAIL_SEND_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo API send failed (${res.status}): ${body}`);
  }

  const data = await res.json().catch(() => ({}));
  logger.info(`Brevo API: Email sent to ${to}: ${data.messageId || ""}`);
  return { messageId: data.messageId };
}

export async function sendEmail({ to, subject, text, html, from, attachments = [] }) {
  if (!to) throw new Error("Recipient email (to) is required");
  if (!subject) throw new Error("Subject is required");
  if (!text && !html)
    throw new Error("At least one of text or html content is required");

  if (BREVO_API_KEY) {
    return sendViaBrevoApi({ to, subject, text, html, from, attachments });
  }

  if (!GMAIL_USER || !GMAIL_PASS)
    throw new Error(
      "Email credentials are not set. Set BREVO_API_KEY or Gmail SMTP credentials."
    );

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
    connectionTimeout: EMAIL_SEND_TIMEOUT_MS,
    greetingTimeout: EMAIL_SEND_TIMEOUT_MS,
    socketTimeout: EMAIL_SEND_TIMEOUT_MS,
  });

  const mailOptions = {
    from: from || SMTP_FROM,
    to,
    subject,
    text,
    html,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Gmail SMTP: Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error("Gmail SMTP: Failed to send email:", error.message || error);
    throw error;
  }
}
