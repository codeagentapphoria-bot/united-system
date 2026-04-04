/**
 * Base email template with professional LGU design
 * Shared components and utilities for all email templates
 */

// Brand colors
const COLORS = {
  primary: '#4c6085',
  primaryLight: '#e8ecf1',
  primaryDark: '#3f4e6c',
  heading: '#4d5258',
  headingLight: '#84868b',
  success: '#16a34a',
  successBg: '#dcfce7',
  successText: '#166534',
  warning: '#d97706',
  warningBg: '#fef3c7',
  warningText: '#92400e',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  dangerText: '#991b1b',
  info: '#2563eb',
  infoBg: '#dbeafe',
  infoText: '#1e3a8a',
  border: '#e5e7eb',
  background: '#f8f9fa',
  white: '#ffffff',
  text: '#374151',
  textLight: '#6b7280',
};

/**
 * Generate status badge HTML
 */
export const getStatusBadge = (status: string, text: string): string => {
  const statusLower = status.toLowerCase();

  let bgColor = COLORS.infoBg;
  let textColor = COLORS.infoText;

  if (
    statusLower.includes('active') ||
    statusLower.includes('approved') ||
    statusLower.includes('success') ||
    statusLower.includes('paid') ||
    statusLower.includes('released')
  ) {
    bgColor = COLORS.successBg;
    textColor = COLORS.successText;
  } else if (
    statusLower.includes('pending') ||
    statusLower.includes('warning') ||
    statusLower.includes('for_payment') ||
    statusLower.includes('for_printing') ||
    statusLower.includes('for_pick_up')
  ) {
    bgColor = COLORS.warningBg;
    textColor = COLORS.warningText;
  } else if (
    statusLower.includes('blocked') ||
    statusLower.includes('rejected') ||
    statusLower.includes('cancelled') ||
    statusLower.includes('expired')
  ) {
    bgColor = COLORS.dangerBg;
    textColor = COLORS.dangerText;
  }

  return `
    <span style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; white-space: nowrap;">
      ${text}
    </span>
  `;
};

/**
 * Generate official LGU header
 */
export const getEmailHeader = (): string => {
  return `
    <div style="background-color: ${COLORS.white}; border-bottom: 3px solid ${COLORS.primary}; padding: 30px 20px; text-align: center;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="vertical-align: middle; padding-left: 20px; text-align: left;">
            <h1 style="margin: 0; color: ${COLORS.primary}; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">
              CITY OF BORONGAN
            </h1>
            <p style="margin: 4px 0 0 0; color: ${COLORS.heading}; font-size: 14px; font-weight: 500;">
              E-Government Services
            </p>
            <p style="margin: 2px 0 0 0; color: ${COLORS.headingLight}; font-size: 12px;">
              Republic of the Philippines
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
};

/**
 * Generate professional footer
 */
export const getEmailFooter = (): string => {
  const currentYear = new Date().getFullYear();

  return `
    <div style="background-color: ${COLORS.background}; border-top: 1px solid ${COLORS.border}; padding: 30px 20px; margin-top: 40px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="text-align: center; padding-bottom: 20px;">
            <p style="margin: 0 0 8px 0; color: ${COLORS.heading}; font-size: 13px; font-weight: 600;">
              City of Borongan
            </p>
            <p style="margin: 0 0 4px 0; color: ${COLORS.textLight}; font-size: 12px;">
              Borongan City, Eastern Samar, Philippines
            </p>
            <p style="margin: 0 0 4px 0; color: ${COLORS.textLight}; font-size: 12px;">
              (055) 261-2345 | info@borongan.gov.ph
            </p>
          </td>
        </tr>
        <tr>
          <td style="text-align: center; padding-top: 20px; border-top: 1px solid ${COLORS.border};">
            <p style="margin: 0 0 8px 0; color: ${COLORS.textLight}; font-size: 11px;">
              This is an automated email. Please do not reply to this message.
            </p>
            <p style="margin: 0; color: ${COLORS.textLight}; font-size: 11px;">
              &copy; ${currentYear} City of Borongan. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
};

/**
 * Generate information card section
 */
export const getInfoCard = (title: string, content: string, icon?: string): string => {
  return `
    <div style="background-color: ${COLORS.white}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 24px; margin: 24px 0; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
      ${
        icon
          ? `
        <div style="display: flex; align-items: center; margin-bottom: 16px;">
          <span style="font-size: 20px; margin-right: 8px;">${icon}</span>
          <h3 style="margin: 0; color: ${COLORS.heading}; font-size: 16px; font-weight: 600;">
            ${title}
          </h3>
        </div>
      `
          : `
        <h3 style="margin: 0 0 16px 0; color: ${COLORS.heading}; font-size: 16px; font-weight: 600;">
          ${title}
        </h3>
      `
      }
      ${content}
    </div>
  `;
};

/**
 * Generate alert/notice box
 */
export const getAlertBox = (
  message: string,
  type: 'info' | 'warning' | 'danger' | 'success'
): string => {
  let bgColor = COLORS.infoBg;
  let textColor = COLORS.infoText;
  let borderColor = COLORS.info;

  if (type === 'success') {
    bgColor = COLORS.successBg;
    textColor = COLORS.successText;
    borderColor = COLORS.success;
  } else if (type === 'warning') {
    bgColor = COLORS.warningBg;
    textColor = COLORS.warningText;
    borderColor = COLORS.warning;
  } else if (type === 'danger') {
    bgColor = COLORS.dangerBg;
    textColor = COLORS.dangerText;
    borderColor = COLORS.danger;
  }

  return `
    <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; color: ${textColor}; font-size: 14px; line-height: 1.5;">
        <strong>${type === 'info' ? 'Note:' : type === 'warning' ? 'Important:' : type === 'danger' ? 'Alert:' : 'Success:'}</strong> ${message}
      </p>
    </div>
  `;
};

/**
 * Generate action button
 */
export const getActionButton = (
  text: string,
  url: string,
  variant: 'primary' | 'secondary' = 'primary'
): string => {
  const bgColor = variant === 'primary' ? COLORS.primary : COLORS.white;
  const textColor = variant === 'primary' ? COLORS.white : COLORS.primary;
  const borderColor = variant === 'primary' ? COLORS.primary : COLORS.primary;

  return `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${url}" style="display: inline-block; background-color: ${bgColor}; color: ${textColor}; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; border: 2px solid ${borderColor}; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        ${text}
      </a>
    </div>
  `;
};

/**
 * Generate base email template structure
 */
export interface EmailTemplateOptions {
  title: string;
  greeting?: string;
  message: string;
  content?: string;
  showActionButton?: boolean;
  actionText?: string;
  actionUrl?: string;
  actionVariant?: 'primary' | 'secondary';
  closing?: string;
}

export const getBaseEmailTemplate = (options: EmailTemplateOptions): string => {
  const {
    title,
    greeting = '',
    message,
    content = '',
    showActionButton = false,
    actionText = '',
    actionUrl = '',
    actionVariant = 'primary',
    closing = `Best regards,<br><strong>City of Borongan</strong><br>E-Government Services Team`,
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: ${COLORS.text}; background-color: ${COLORS.background};">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: ${COLORS.background}; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: ${COLORS.white}; border-radius: 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          ${getEmailHeader()}
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: ${COLORS.heading}; font-size: 22px; font-weight: 700; line-height: 1.3;">
                ${title}
              </h2>
              
              ${greeting ? `<p style="margin: 0 0 16px 0; color: ${COLORS.text}; font-size: 14px;">${greeting}</p>` : ''}
              
              <p style="margin: 0 0 20px 0; color: ${COLORS.text}; font-size: 14px; line-height: 1.6;">
                ${message}
              </p>
              
              ${content}
              
              ${showActionButton && actionUrl ? getActionButton(actionText, actionUrl, actionVariant) : ''}
              
              <p style="margin: 30px 0 0 0; color: ${COLORS.text}; font-size: 14px; line-height: 1.6;">
                ${closing}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td>
              ${getEmailFooter()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
