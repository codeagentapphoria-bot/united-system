/**
 * Email templates for citizen registration notifications
 */

import { getAlertBox, getBaseEmailTemplate, getInfoCard } from './base-template';

interface CitizenApprovalEmailData {
  applicantName: string;
  email: string;
  phoneNumber: string;
  tempPassword: string;
  loginUrl: string;
}

interface CitizenRejectionEmailData {
  applicantName: string;
  email: string;
  reason?: string;
}

/**
 * Generate HTML email template for citizen approval
 */
const getCitizenApprovalEmailTemplate = (
  data: CitizenApprovalEmailData,
  title: string,
  message: string
): string => {
  const credentialsInfo = `
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; color: #6b7280; width: 40%; font-size: 14px;">Phone Number:</td>
        <td style="padding: 10px 0; font-weight: 600; color: #374151; font-size: 14px;">${data.phoneNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Temporary Password:</td>
        <td style="padding: 10px 0; font-weight: 600; color: #374151; font-size: 14px; font-family: monospace; background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">${data.tempPassword}</td>
      </tr>
    </table>
  `;

  const content = `
    ${getAlertBox(
      'Please change your password after your first login for security purposes.',
      'warning'
    )}
    ${getInfoCard('Your Login Credentials', credentialsInfo)}
    ${getInfoCard('Next Steps', `
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        <li>Go to the <a href="${data.loginUrl}" style="color: #3b82f6;">Borongan E-Services Portal</a></li>
        <li>Log in using your phone number and temporary password</li>
        <li>You will be prompted to change your password</li>
        <li>Complete your profile and start using our services</li>
      </ol>
    `)}
  `;

  return getBaseEmailTemplate({
    title,
    greeting: `Dear ${data.applicantName},`,
    message,
    content,
    showActionButton: true,
    actionText: 'Login to Portal',
    actionUrl: data.loginUrl,
  });
};

/**
 * Generate HTML email template for citizen rejection
 */
const getCitizenRejectionEmailTemplate = (
  data: CitizenRejectionEmailData,
  title: string,
  message: string
): string => {
  let content = '';

  if (data.reason) {
    content += getAlertBox(data.reason, 'danger');
  }

  content += getAlertBox(
    'If you believe this is an error or would like to reapply with corrected information, please visit our portal and submit a new registration request.',
    'info'
  );

  return getBaseEmailTemplate({
    title,
    greeting: `Dear ${data.applicantName},`,
    message,
    content,
  });
};

/**
 * Email sent when citizen registration is approved
 */
export const getCitizenApprovalEmail = (
  data: CitizenApprovalEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Your Borongan Citizen Registration Has Been Approved!';
  const message =
    'Congratulations! Your citizen registration has been approved by our administrators. Your account is now active and you can access all E-Government services.';

  const html = getCitizenApprovalEmailTemplate(data, 'Registration Approved', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Email sent when citizen registration is rejected
 */
export const getCitizenRejectionEmail = (
  data: CitizenRejectionEmailData
): { subject: string; html: string; text: string } => {
  const subject = 'Your Borongan Citizen Registration Status';
  const message =
    'Thank you for submitting your citizen registration. Unfortunately, we are unable to approve your registration at this time.';

  const html = getCitizenRejectionEmailTemplate(data, 'Registration Update', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};
