/**
 * Email templates for transaction status notifications
 */

import { getBaseEmailTemplate, getInfoCard, getAlertBox, getStatusBadge } from './base-template';

interface TransactionEmailData {
  subscriberName: string;
  transactionId: string;
  referenceNumber: string;
  serviceName: string;
  paymentStatus?: string;
  paymentAmount?: number;
  status?: string;
  remarks?: string;
  nextSteps?: string;
}

/**
 * Generate HTML email template for transaction status updates
 */
const getEmailTemplate = (data: TransactionEmailData, title: string, message: string): string => {
  const COLORS = {
    text: '#374151',
    textLight: '#6b7280',
  };

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
  `;

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
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">Php ${data.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }

  if (data.status) {
    transactionRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Status:</td>
        <td style="padding: 10px 0; font-size: 14px;">${getStatusBadge(data.status, data.status)}</td>
      </tr>
    `;
  }

  const transactionDetailsContent = `
    <table style="width: 100%; border-collapse: collapse;">
      ${transactionRows}
    </table>
  `;

  // Build content sections
  let contentSections = '';
  contentSections += getInfoCard('Transaction Details', transactionDetailsContent);

  if (data.remarks) {
    const alertType =
      data.status === 'REJECTED' || data.paymentStatus === 'REJECTED' ? 'danger' : 'warning';
    contentSections += getAlertBox(data.remarks, alertType);
  }

  if (data.nextSteps) {
    contentSections += getInfoCard(
      'Next Steps',
      `
      <p style="margin: 0; color: ${COLORS.text}; font-size: 14px; line-height: 1.6;">${data.nextSteps}</p>
    `
    );
  }

  return getBaseEmailTemplate({
    title,
    greeting: `Dear ${data.subscriberName},`,
    message,
    content: contentSections,
  });
};

/**
 * Payment status change notification
 */
export const getPaymentStatusChangeEmail = (
  data: TransactionEmailData
): { subject: string; html: string; text: string } => {
  const statusMessages: Record<string, string> = {
    PENDING: 'Your transaction is pending review.',
    APPROVED: 'Your transaction has been approved.',
    FOR_PRINTING: 'Your document is being prepared for printing.',
    FOR_PICK_UP: 'Your document is ready for pickup.',
    RELEASED: 'Your document has been released.',
    ASSESSED: 'Your transaction has been assessed.',
    FOR_PAYMENT: 'Payment is required to proceed.',
    PAID: 'Your payment has been received.',
    REJECTED: 'Your transaction has been rejected.',
  };

  const nextStepsMessages: Record<string, string> = {
    FOR_PAYMENT: 'Please proceed with payment to continue processing your request.',
    FOR_PICK_UP: 'Please visit our office during business hours to pick up your document.',
    REJECTED: 'Please review the remarks above and contact support if you have questions.',
  };

  const message =
    statusMessages[data.paymentStatus || ''] ||
    `Your transaction payment status has been updated to ${data.paymentStatus}.`;
  const nextSteps =
    nextStepsMessages[data.paymentStatus || ''] || 'Please check your portal for updates.';

  const subject = `Transaction Update: ${data.serviceName} - ${data.paymentStatus}`;
  const html = getEmailTemplate({ ...data, nextSteps }, 'Transaction Status Update', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Document ready notification
 */
export const getDocumentReadyEmail = (
  data: TransactionEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Your ${data.serviceName} is Ready for Pickup`;
  const message = `Your ${data.serviceName} document is ready for pickup. Please visit our office during business hours to collect your document.`;
  const nextSteps =
    'Please bring a valid ID when picking up your document. Our office hours are Monday to Friday, 8:00 AM to 5:00 PM.';

  const html = getEmailTemplate({ ...data, nextSteps }, 'Document Ready for Pickup', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Payment reminder notification
 */
export const getPaymentReminderEmail = (
  data: TransactionEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Payment Reminder: ${data.serviceName}`;
  const message = `This is a reminder that payment is required for your ${data.serviceName} transaction.`;
  const nextSteps = `Please proceed with payment of Php ${data.paymentAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to continue processing your request.`;

  const html = getEmailTemplate({ ...data, nextSteps }, 'Payment Reminder', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Generic transaction status update
 */
export const getTransactionStatusUpdateEmail = (
  data: TransactionEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Transaction Update: ${data.serviceName}`;
  const message = `Your ${data.serviceName} transaction status has been updated.`;

  const html = getEmailTemplate(data, 'Transaction Status Update', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};
