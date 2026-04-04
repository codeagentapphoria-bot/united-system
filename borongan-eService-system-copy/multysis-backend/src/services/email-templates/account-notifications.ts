/**
 * Email templates for account management notifications
 */

import { getAlertBox, getBaseEmailTemplate, getInfoCard, getStatusBadge } from './base-template';

interface AccountEmailData {
  subscriberName: string;
  email?: string;
  phoneNumber?: string;
  status?: string;
  remarks?: string;
  activationLink?: string;
  resetLink?: string;
}

/**
 * Generate HTML email template for account notifications
 */
const getAccountEmailTemplate = (
  data: AccountEmailData,
  title: string,
  message: string,
  showActionButton = false,
  actionText = '',
  actionUrl = ''
): string => {
  const COLORS = {
    text: '#374151',
    textLight: '#6b7280',
  };

  // Build account information card content
  let accountInfoContent = '';
  if (data.status || data.email || data.phoneNumber) {
    let infoRows = '';

    if (data.email) {
      infoRows += `
        <tr>
          <td style="padding: 10px 0; color: ${COLORS.textLight}; width: 40%; font-size: 14px;">Email:</td>
          <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.email}</td>
        </tr>
      `;
    }

    if (data.phoneNumber) {
      infoRows += `
        <tr>
          <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Phone Number:</td>
          <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.phoneNumber}</td>
        </tr>
      `;
    }

    if (data.status) {
      infoRows += `
        <tr>
          <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Status:</td>
          <td style="padding: 10px 0; font-size: 14px;">${getStatusBadge(data.status, data.status)}</td>
        </tr>
      `;
    }

    accountInfoContent = `
      <table style="width: 100%; border-collapse: collapse;">
        ${infoRows}
      </table>
    `;
  }

  // Build content sections
  let contentSections = '';

  if (accountInfoContent) {
    contentSections += getInfoCard('Account Information', accountInfoContent);
  }

  if (data.remarks) {
    const alertType = data.status === 'BLOCKED' ? 'danger' : 'warning';
    contentSections += getAlertBox(data.remarks, alertType);
  }

  if (data.activationLink) {
    contentSections += getAlertBox(
      'Your account is currently pending activation. An administrator will review and activate your account soon.',
      'info'
    );
  }

  return getBaseEmailTemplate({
    title,
    greeting: `Dear ${data.subscriberName},`,
    message,
    content: contentSections,
    showActionButton,
    actionText,
    actionUrl,
  });
};

/**
 * Welcome email after portal signup
 */
export const getWelcomeEmail = (
  data: AccountEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Welcome to City of Borongan E-Government Services';
  const message = `Thank you for registering with City of Borongan E-Government Services. Your account has been created successfully. ${data.status === 'PENDING' ? 'Your account is currently pending activation and will be reviewed by our administrators.' : 'You can now log in and start using our services.'}`;

  const html = getAccountEmailTemplate(data, 'Welcome to City of Borongan', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Account activation confirmation email
 */
export const getAccountActivationEmail = (
  data: AccountEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Your Account Has Been Activated';
  const message =
    'Great news! Your account has been activated. You can now log in and access all our E-Government services.';

  const html = getAccountEmailTemplate({ ...data, status: 'ACTIVE' }, 'Account Activated', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Account blocked notification email
 */
export const getAccountBlockedEmail = (
  data: AccountEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Account Access Restricted';
  const message =
    'Your account access has been restricted. Please see the details below. If you believe this is an error, please contact our support team.';

  const html = getAccountEmailTemplate(
    { ...data, status: 'BLOCKED' },
    'Account Access Restricted',
    message
  );
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Account deactivation notification email
 */
export const getAccountDeactivationEmail = (
  data: AccountEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Your Account Has Been Deactivated';
  const message =
    'Your account has been deactivated. Your access to E-Government services has been temporarily restricted. If you believe this is an error or need to reactivate your account, please contact our support team.';

  const html = getAccountEmailTemplate(
    { ...data, status: 'EXPIRED' },
    'Account Deactivated',
    message
  );
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Password reset email (if implementing password reset)
 */
export const getPasswordResetEmail = (
  data: AccountEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Password Reset Request';
  const message =
    'You have requested to reset your password. Click the button below to reset your password. This link will expire in 1 hour.';

  const html = getAccountEmailTemplate(
    data,
    'Password Reset',
    message,
    true,
    'Reset Password',
    data.resetLink || '#'
  );
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};
