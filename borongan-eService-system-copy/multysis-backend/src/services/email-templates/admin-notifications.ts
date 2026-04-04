/**
 * Email templates for admin notifications
 */

import { getBaseEmailTemplate, getInfoCard, getAlertBox, getStatusBadge } from './base-template';

interface AdminEmailData {
  adminName: string;
  transactionId: string;
  referenceNumber: string;
  serviceName: string;
  subscriberName: string;
  subscriberEmail?: string;
  subscriberPhone?: string;
  paymentStatus?: string;
  paymentAmount?: number;
  priority?: 'low' | 'medium' | 'high';
  summary?: {
    totalTransactions?: number;
    pendingCount?: number;
    dateRange?: string;
  };
}

/**
 * Generate HTML email template for admin notifications
 */
const getAdminEmailTemplate = (data: AdminEmailData, title: string, message: string): string => {
  const COLORS = {
    text: '#374151',
    textLight: '#6b7280',
  };

  // Build priority alert if present
  let priorityAlert = '';
  if (data.priority) {
    const priorityType =
      data.priority === 'high' ? 'danger' : data.priority === 'medium' ? 'warning' : 'info';
    priorityAlert = getAlertBox(
      `<strong>Priority:</strong> ${data.priority.toUpperCase()}`,
      priorityType
    );
  }

  // Build transaction details card
  let transactionRows = `
    <tr>
      <td style="padding: 10px 0; color: ${COLORS.textLight}; width: 40%; font-size: 14px;">Transaction ID:</td>
      <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px; font-family: monospace;">${data.transactionId}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Reference Number:</td>
      <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px; font-family: monospace;">${data.referenceNumber}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Service:</td>
      <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.serviceName}</td>
    </tr>
    <tr>
      <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Subscriber:</td>
      <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.subscriberName}</td>
    </tr>
  `;

  if (data.subscriberEmail) {
    transactionRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Subscriber Email:</td>
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.subscriberEmail}</td>
      </tr>
    `;
  }

  if (data.subscriberPhone) {
    transactionRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Subscriber Phone:</td>
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.subscriberPhone}</td>
      </tr>
    `;
  }

  if (data.paymentStatus) {
    transactionRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Payment Status:</td>
        <td style="padding: 10px 0; font-size: 14px;">${getStatusBadge(data.paymentStatus, data.paymentStatus)}</td>
      </tr>
    `;
  }

  if (data.paymentAmount) {
    transactionRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Payment Amount:</td>
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">₱${data.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  const transactionDetailsContent = `
    <table style="width: 100%; border-collapse: collapse;">
      ${transactionRows}
    </table>
  `;

  // Build summary card if present
  let summaryContent = '';
  if (data.summary) {
    let summaryRows = '';

    if (data.summary.totalTransactions !== undefined) {
      summaryRows += `
        <tr>
          <td style="padding: 10px 0; color: ${COLORS.textLight}; width: 40%; font-size: 14px;">Total Transactions:</td>
          <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.summary.totalTransactions}</td>
        </tr>
      `;
    }

    if (data.summary.pendingCount !== undefined) {
      summaryRows += `
        <tr>
          <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Pending:</td>
          <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.summary.pendingCount}</td>
        </tr>
      `;
    }

    if (data.summary.dateRange) {
      summaryRows += `
        <tr>
          <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Date Range:</td>
          <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.summary.dateRange}</td>
        </tr>
      `;
    }

    summaryContent = getInfoCard(
      'Summary',
      `
      <table style="width: 100%; border-collapse: collapse;">
        ${summaryRows}
      </table>
    `
    );
  }

  // Build content sections
  let contentSections = priorityAlert;
  contentSections += getInfoCard('Transaction Details', transactionDetailsContent);
  contentSections += summaryContent;
  contentSections += getAlertBox(
    'Please log in to the admin portal to review and process this transaction.',
    'info'
  );

  return getBaseEmailTemplate({
    title,
    greeting: `Dear ${data.adminName},`,
    message,
    content: contentSections,
    closing: `Best regards,<br><strong>City of Borongan</strong><br>E-Government Services System`,
  });
};

/**
 * New transaction submitted notification
 */
export const getNewTransactionEmail = (
  data: AdminEmailData
): { subject: string; html: string; text: string } => {
  const subject = `New Transaction Submitted: ${data.serviceName}`;
  const message = `A new transaction has been submitted and requires your review.`;

  const html = getAdminEmailTemplate(data, 'New Transaction Submitted', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * High-priority transaction alert
 */
export const getHighPriorityTransactionEmail = (
  data: AdminEmailData
): { subject: string; html: string; text: string } => {
  const subject = `[HIGH PRIORITY] Transaction Requires Attention: ${data.serviceName}`;
  const message = `A high-priority transaction requires your immediate attention.`;

  const html = getAdminEmailTemplate(
    { ...data, priority: 'high' },
    'High Priority Transaction Alert',
    message
  );
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Daily summary email
 */
export const getDailySummaryEmail = (
  data: AdminEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Daily Transaction Summary - ${new Date().toLocaleDateString()}`;
  const message = `Here is your daily summary of transactions for ${data.summary?.dateRange || 'today'}.`;

  const html = getAdminEmailTemplate(data, 'Daily Transaction Summary', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Weekly summary email
 */
export const getWeeklySummaryEmail = (
  data: AdminEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Weekly Transaction Summary - ${data.summary?.dateRange || 'This Week'}`;
  const message = `Here is your weekly summary of transactions for ${data.summary?.dateRange || 'this week'}.`;

  const html = getAdminEmailTemplate(data, 'Weekly Transaction Summary', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};
