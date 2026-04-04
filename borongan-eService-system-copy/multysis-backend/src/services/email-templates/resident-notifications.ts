/**
 * Email templates for resident registration notifications.
 * Replaces citizen-notifications.ts — now uses username instead of phone number.
 */

import { getAlertBox, getBaseEmailTemplate, getInfoCard } from './base-template';

interface ResidentApprovalEmailData {
  residentName: string;
  email: string;
  residentId: string;
  tempPassword: string;
  loginUrl: string;
}

interface ResidentRejectionEmailData {
  residentName: string;
  email: string;
  adminNotes?: string;
}

// =============================================================================
// APPROVAL EMAIL
// =============================================================================

export const getResidentApprovalEmail = (
  data: ResidentApprovalEmailData
): { subject: string; html: string; text: string } => {
  const credentialsInfo = `
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; color: #6b7280; width: 40%; font-size: 14px;">Resident ID:</td>
        <td style="padding: 10px 0; font-weight: 700; color: #1d4ed8; font-size: 16px; font-family: monospace;">${data.residentId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">Temporary Password:</td>
        <td style="padding: 10px 0; font-weight: 600; color: #374151; font-size: 14px; font-family: monospace; background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">${data.tempPassword}</td>
      </tr>
    </table>
  `;

  const content = `
    ${getAlertBox('Please change your password after your first login for security purposes.', 'warning')}
    ${getInfoCard('Your Registration Details', credentialsInfo)}
    ${getInfoCard('Next Steps', `
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        <li>Go to the <a href="${data.loginUrl}" style="color: #3b82f6;">Resident Portal</a></li>
        <li>Log in using your username and temporary password</li>
        <li>Change your password when prompted</li>
        <li>View your Resident ID card under "My ID"</li>
      </ol>
    `)}
  `;

  const html = getBaseEmailTemplate({
    title: 'Registration Approved',
    greeting: `Dear ${data.residentName},`,
    message:
      'Your registration has been approved. You can now log in to the portal using the credentials below.',
    content,
    showActionButton: true,
    actionText: 'Login to Portal',
    actionUrl: data.loginUrl,
  });

  const text = `
Dear ${data.residentName},

Your registration has been approved!

Resident ID: ${data.residentId}
Temporary Password: ${data.tempPassword}

Please log in at: ${data.loginUrl}
Change your password after your first login.

Thank you.
  `.trim();

  return {
    subject: 'Registration Approved — Welcome to the Resident Portal',
    html,
    text,
  };
};

// =============================================================================
// REJECTION EMAIL
// =============================================================================

export const getResidentRejectionEmail = (
  data: ResidentRejectionEmailData
): { subject: string; html: string; text: string } => {
  const content = data.adminNotes
    ? getAlertBox(data.adminNotes, 'danger')
    : '';

  const html = getBaseEmailTemplate({
    title: 'Registration Update',
    greeting: `Dear ${data.residentName},`,
    message:
      'We regret to inform you that your registration application has been rejected. Please see the reason below, or contact your local government office for more information.',
    content,
    showActionButton: false,
  });

  const text = `
Dear ${data.residentName},

Your registration application has been rejected.

${data.adminNotes ? `Reason: ${data.adminNotes}` : ''}

Please contact your local government office for assistance.
  `.trim();

  return {
    subject: 'Registration Application — Update Required',
    html,
    text,
  };
};

// =============================================================================
// RESUBMISSION REQUEST EMAIL
// =============================================================================

interface ResidentResubmissionEmailData {
  residentName: string;
  email: string;
  adminNotes: string;
  statusUrl: string;
}

export const getResidentResubmissionEmail = (
  data: ResidentResubmissionEmailData
): { subject: string; html: string; text: string } => {
  const content = `
    ${getAlertBox(data.adminNotes || 'Please re-upload your documents as requested by the administrator.', 'warning')}
    ${getInfoCard('Next Steps', `
      <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
        <li>Visit your <a href="${data.statusUrl}" style="color: #3b82f6;">Registration Status page</a></li>
        <li>Click "Re-upload Documents"</li>
        <li>Upload your selfie with ID and government ID document</li>
        <li>Submit — your application will return to review</li>
      </ol>
    `)}
  `;

  const html = getBaseEmailTemplate({
    title: 'Action Required',
    greeting: `Dear ${data.residentName},`,
    message: 'Your registration application requires additional documents before it can be processed.',
    content,
    showActionButton: true,
    actionText: 'Check Status & Re-upload',
    actionUrl: data.statusUrl,
  });

  const text = `
Dear ${data.residentName},

Your registration requires additional documents.

${data.adminNotes ? `Notes from administrator: ${data.adminNotes}` : ''}

Please visit the following link to re-upload your documents:
${data.statusUrl}

Thank you.
  `.trim();

  return {
    subject: 'Action Required — Additional Documents Needed',
    html,
    text,
  };
};
