import nodemailer from "nodemailer";
import logger from "./logger.js";

// Gmail SMTP setup: You must enable 2FA and create an App Password for this to work.
// Set GMAIL_USER and GMAIL_PASS in your environment variables.
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;
const SMTP_FROM = process.env.SMTP_FROM || GMAIL_USER;

export async function sendEmail({ to, subject, text, html, from, attachments = [] }) {
  if (!to) throw new Error("Recipient email (to) is required");
  if (!subject) throw new Error("Subject is required");
  if (!text && !html)
    throw new Error("At least one of text or html content is required");
  if (!GMAIL_USER || !GMAIL_PASS)
    throw new Error(
      "Gmail SMTP credentials are not set in environment variables"
    );

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_PASS,
    },
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
