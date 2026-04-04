/**
 * Email templates for appointment notifications
 */

import { getBaseEmailTemplate, getInfoCard, getAlertBox, getStatusBadge } from './base-template';

interface AppointmentEmailData {
  subscriberName: string;
  transactionId: string;
  referenceNumber: string;
  serviceName: string;
  preferredDate?: string;
  scheduledDate?: string;
  appointmentStatus?: string;
  remarks?: string;
  location?: string;
}

/**
 * Format date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Not specified';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Generate HTML email template for appointment notifications
 */
const getAppointmentEmailTemplate = (
  data: AppointmentEmailData,
  title: string,
  message: string
): string => {
  const COLORS = {
    text: '#374151',
    textLight: '#6b7280',
  };

  // Build appointment details card
  let appointmentRows = `
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

  if (data.scheduledDate) {
    appointmentRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Scheduled Date:</td>
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${formatDate(data.scheduledDate)}</td>
      </tr>
    `;
  } else if (data.preferredDate) {
    appointmentRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Preferred Date:</td>
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${formatDate(data.preferredDate)}</td>
      </tr>
    `;
  }

  if (data.appointmentStatus) {
    appointmentRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Status:</td>
        <td style="padding: 10px 0; font-size: 14px;">${getStatusBadge(data.appointmentStatus, data.appointmentStatus)}</td>
      </tr>
    `;
  }

  if (data.location) {
    appointmentRows += `
      <tr>
        <td style="padding: 10px 0; color: ${COLORS.textLight}; font-size: 14px;">Location:</td>
        <td style="padding: 10px 0; font-weight: 600; color: ${COLORS.text}; font-size: 14px;">${data.location}</td>
      </tr>
    `;
  }

  const appointmentDetailsContent = `
    <table style="width: 100%; border-collapse: collapse;">
      ${appointmentRows}
    </table>
  `;

  // Build content sections
  let contentSections = '';
  contentSections += getInfoCard('Appointment Details', appointmentDetailsContent);

  if (data.remarks) {
    contentSections += getAlertBox(data.remarks, 'warning');
  }

  // Build reminders section
  let remindersList = `
    <ul style="margin: 0; padding-left: 20px; color: ${COLORS.text}; font-size: 14px; line-height: 1.8;">
      <li>Please arrive 10 minutes before your scheduled appointment time</li>
      <li>Bring a valid government-issued ID</li>
      <li>Bring all required documents for your service request</li>
      ${data.location ? `<li>Location: ${data.location}</li>` : ''}
    </ul>
  `;

  contentSections += getInfoCard('Important Reminders', remindersList);

  return getBaseEmailTemplate({
    title,
    greeting: `Dear ${data.subscriberName},`,
    message: `${message}${data.scheduledDate ? ` If you need to reschedule or cancel your appointment, please contact us as soon as possible.` : ''}`,
    content: contentSections,
  });
};

/**
 * Appointment confirmation email
 */
export const getAppointmentConfirmationEmail = (
  data: AppointmentEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Appointment Confirmed: ${data.serviceName}`;
  const message = `Your appointment for ${data.serviceName} has been confirmed. Please see the appointment details below.`;

  const html = getAppointmentEmailTemplate(data, 'Appointment Confirmed', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Appointment reminder email (24 hours before)
 */
export const getAppointmentReminderEmail = (
  data: AppointmentEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Appointment Reminder: ${data.serviceName} - Tomorrow`;
  const message = `This is a reminder that you have an appointment scheduled for ${data.serviceName} tomorrow. Please see the details below.`;

  const html = getAppointmentEmailTemplate(data, 'Appointment Reminder', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Appointment cancellation email
 */
export const getAppointmentCancellationEmail = (
  data: AppointmentEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Appointment Cancelled: ${data.serviceName}`;
  const message = `Your appointment for ${data.serviceName} has been cancelled. ${data.remarks ? 'Please see the remarks below for more information.' : ''}`;

  const html = getAppointmentEmailTemplate(data, 'Appointment Cancelled', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};

/**
 * Appointment rescheduling email
 */
export const getAppointmentReschedulingEmail = (
  data: AppointmentEmailData
): { subject: string; html: string; text: string } => {
  const subject = `Appointment Rescheduled: ${data.serviceName}`;
  const message = `Your appointment for ${data.serviceName} has been rescheduled. Please see the new appointment details below.`;

  const html = getAppointmentEmailTemplate(data, 'Appointment Rescheduled', message);
  const text = html.replace(/<[^>]*>/g, '');

  return { subject, html, text };
};
