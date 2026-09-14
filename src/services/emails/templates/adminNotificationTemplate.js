/**
 * adminNotificationTemplate.js
 * 
 * Generates internal admin notification emails for new Contact and Feedback submissions.
 * Retains Vista Holidays branding with admin-focused data tables.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml } from '../emailComponents.js';
import { formatISTDateTime } from '../emailTimeHelper.js';

/**
 * Admin notification for new Contact Request
 */
export const buildContactAdminNotification = ({
  ticketId,
  name,
  email,
  mobile,
  location,
  queryType,
  message,
  submittedAt = new Date(),
  termsAccepted = true,
  clientUrl
}) => {
  const safeName = (name && String(name).trim()) || 'Traveler';
  const subject = `New Contact Request | ${ticketId} | ${safeName}`;
  const emailType = 'ADMIN NOTIFICATION';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const adminUrl = `${safeClientUrl}/admin/contact`;
  const formattedDate = formatISTDateTime(submittedAt);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
      A traveler submitted a new contact inquiry through the Vista Holidays public portal. Review the inquiry details below:
    </p>

    <!-- Ticket Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 18px; margin: 18px 0;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c2410c; font-weight: 700;">
            Ticket Reference
          </div>
          <div style="font-size: 22px; font-weight: 800; color: #9a3412; font-family: monospace, Courier, monospace; margin-top: 4px;">
            ${escapeHtml(ticketId)}
          </div>
        </td>
      </tr>
    </table>

    <!-- Traveler Data Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569; width: 35%;">Traveler Name</td>
        <td style="padding: 10px 12px; color: #0f172a; font-weight: 700;">${escapeHtml(safeName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Email Address</td>
        <td style="padding: 10px 12px; color: #0e87ea;">${escapeHtml(email)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Mobile Number</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(mobile || 'Not provided')}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Location</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(location || 'Not provided')}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Query Type</td>
        <td style="padding: 10px 12px; color: #c2410c; font-weight: 700;">${escapeHtml(queryType)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Submitted Time</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(formattedDate)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Terms Accepted</td>
        <td style="padding: 10px 12px; color: #15803d; font-weight: 700;">${termsAccepted ? 'Yes' : 'No'}</td>
      </tr>
    </table>

    <!-- Inquired Message Box -->
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px;">
        Traveler Inquiry Message:
      </div>
      <div style="font-size: 14px; color: #1e293b; line-height: 1.6; white-space: pre-wrap;">
        ${escapeHtml(message)}
      </div>
    </div>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: 'Support Administrator',
    recipientEmail: 'admin@vistaholidays.com',
    bodyHtml,
    ctaText: 'Open Admin Directory',
    ctaUrl: adminUrl,
    ctaButtonColor: '#ea580c',
    showSecurityNotice: false,
    showHelpSection: false,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)'
  });

  const text = `
ADMIN NOTIFICATION — NEW CONTACT REQUEST
------------------------------------------------------------
Subject: ${subject}
Ticket ID: ${ticketId}
Name: ${safeName}
Email: ${email}
Mobile: ${mobile || 'N/A'}
Location: ${location || 'N/A'}
Query Type: ${queryType}
Submitted Time: ${formattedDate}
Terms Accepted: ${termsAccepted ? 'Yes' : 'No'}

Message:
${message}

Access Directory: ${adminUrl}
  `.trim();

  return { subject, html, text };
};

/**
 * Admin notification for new User Feedback
 */
export const buildFeedbackAdminNotification = ({
  ticketId,
  name,
  email,
  mobile,
  rating = 5,
  answers = {},
  submittedAt = new Date(),
  clientUrl
}) => {
  const safeName = (name && String(name).trim()) || 'Traveler';
  const subject = `New Feedback Received | ${ticketId} | ${safeName}`;
  const emailType = 'ADMIN NOTIFICATION';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const adminUrl = `${safeClientUrl}/admin/feedback`;
  const formattedDate = formatISTDateTime(submittedAt);
  const starRating = '⭐'.repeat(Math.max(1, Math.min(5, Number(rating) || 5)));

  let answersRows = '';
  if (answers && typeof answers === 'object') {
    const entries = answers instanceof Map ? Array.from(answers.entries()) : Object.entries(answers);
    entries.forEach(([q, a]) => {
      answersRows += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 12px; font-weight: 700; color: #475569; width: 35%;">${escapeHtml(q)}</td>
          <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(String(a))}</td>
        </tr>
      `;
    });
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
      A traveler submitted user experience feedback for Vista Holidays. Review details below:
    </p>

    <!-- Ticket Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 14px; padding: 18px; margin: 18px 0;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6d28d9; font-weight: 700;">
            Feedback Reference
          </div>
          <div style="font-size: 22px; font-weight: 800; color: #4c1d95; font-family: monospace, Courier, monospace; margin-top: 4px;">
            ${escapeHtml(ticketId)}
          </div>
          <div style="font-size: 14px; color: #7c3aed; margin-top: 6px; font-weight: 700;">
            Rating: ${starRating} (${Number(rating) || 5}/5)
          </div>
        </td>
      </tr>
    </table>

    <!-- Feedback Answers Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569; width: 35%;">Traveler Name</td>
        <td style="padding: 10px 12px; color: #0f172a; font-weight: 700;">${escapeHtml(safeName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Email Address</td>
        <td style="padding: 10px 12px; color: #0e87ea;">${escapeHtml(email)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Mobile Number</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(mobile || 'Not provided')}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Submitted Time</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(formattedDate)}</td>
      </tr>
      ${answersRows}
    </table>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: 'Experience Administrator',
    recipientEmail: 'admin@vistaholidays.com',
    bodyHtml,
    ctaText: 'Open Feedback Directory',
    ctaUrl: adminUrl,
    ctaButtonColor: '#7c3aed',
    showSecurityNotice: false,
    showHelpSection: false,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)'
  });

  const text = `
ADMIN NOTIFICATION — NEW FEEDBACK RECEIVED
------------------------------------------------------------
Subject: ${subject}
Ticket ID: ${ticketId}
Name: ${safeName}
Email: ${email}
Rating: ${rating}/5
Submitted Time: ${formattedDate}

Access Directory: ${adminUrl}
  `.trim();

  return { subject, html, text };
};

export default {
  buildContactAdminNotification,
  buildFeedbackAdminNotification
};
