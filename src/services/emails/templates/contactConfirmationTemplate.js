/**
 * contactConfirmationTemplate.js
 * 
 * Generates user confirmation email when Contact request is received.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting, formatISTDateTime } from '../emailTimeHelper.js';

export const buildContactConfirmationEmail = ({
  toEmail,
  userName,
  ticketId,
  queryType,
  message = '',
  submittedAt = new Date(),
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = `Contact Request Received - ${safeName} 🎫`;
  const emailType = 'CONTACT REQUEST RECEIVED';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const trackUrl = `${safeClientUrl}/track-status?ticket=${encodeURIComponent(ticketId)}`;
  const formattedDate = formatISTDateTime(submittedAt);

  const messageExcerpt = message
    ? (message.length > 250 ? message.substring(0, 250) + '...' : message)
    : '';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Thank you for reaching out to Vista Holidays. We have received your inquiry and our support team has created an official support ticket to assist you.
    </p>

    <!-- Ticket Summary Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 6px;">
            Your Support Ticket ID
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #0f172a; font-family: monospace, Courier, monospace; letter-spacing: 1px;">
            ${escapeHtml(ticketId)}
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 18px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; line-height: 1.7; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            <tr>
              <td style="padding: 4px 0; width: 35%; color: #64748b; font-weight: 600;">Query Type:</td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 700;">${escapeHtml(queryType || 'General Inquiry')}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Submitted Time:</td>
              <td style="padding: 4px 0; color: #0f172a;">${escapeHtml(formattedDate)}</td>
            </tr>
            ${
              messageExcerpt
                ? `<tr>
                    <td style="padding: 4px 0; color: #64748b; font-weight: 600; vertical-align: top;">Message Summary:</td>
                    <td style="padding: 4px 0; color: #334155; font-style: italic;">"${escapeHtml(messageExcerpt)}"</td>
                  </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">
      You can track the progress of your inquiry in real time, view status updates, and read messages from our team directly on our tracking portal:
    </p>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: safeName,
    recipientEmail: toEmail,
    bodyHtml,
    ctaText: 'Track Your Status',
    ctaUrl: trackUrl,
    ctaButtonColor: '#0e87ea',
    showSecurityNotice: true,
    showHelpSection: true,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #b91c1c 0%, #ea580c 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

Thank you for reaching out to Vista Holidays. We have received your inquiry.

Ticket ID: ${ticketId}
Query Type: ${queryType}
Submitted Time: ${formattedDate}
${messageExcerpt ? `Message Summary: "${messageExcerpt}"\n` : ''}

Track your status:
${trackUrl}

Security Notice:
Vista Holidays will never ask for your money, password, OTP, banking information, card details, or other sensitive financial information through email.

Need Help?
Email: ${VISTA_SUPPORT_EMAIL}
Contact Us: ${clientUrl}/contact
FAQ: ${clientUrl}/faq

🌍 Travel. Discover. Experience.

Thanks & Regards,
Vista Holidays ❤️

© Vista Holidays. All Rights Reserved.
This email is intended for ${toEmail}
  `.trim();

  return { subject, html, text };
};

export default buildContactConfirmationEmail;
