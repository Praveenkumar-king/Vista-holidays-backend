/**
 * ticketUpdateTemplate.js
 * 
 * Generates notification email when admin posts a message on a Contact or Feedback ticket.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting, formatISTDateTime } from '../emailTimeHelper.js';

export const buildTicketUpdateEmail = ({
  toEmail,
  userName,
  ticketId,
  status,
  adminMessage,
  isFeedback = false,
  updatedAt = new Date(),
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = isFeedback
    ? `Feedback Ticket Update - ${safeName} 💬`
    : `Support Ticket Update - ${safeName} 🎫`;

  const emailType = 'SUPPORT TICKET UPDATE';
  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const trackUrl = `${safeClientUrl}/track-status?ticket=${encodeURIComponent(ticketId)}`;
  const formattedDate = formatISTDateTime(updatedAt);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Our support team has posted a new update regarding your Vista Holidays ticket.
    </p>

    <!-- Ticket Status Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 20px 0;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 4px;">
            Ticket Reference
          </div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; font-family: monospace, Courier, monospace;">
            ${escapeHtml(ticketId)}
          </div>
          <div style="margin-top: 6px; font-size: 13px; color: #0284c7; font-weight: 700;">
            Current Status: <span style="display: inline-block; background: #e0effe; color: #026bc8; padding: 2px 10px; border-radius: 9999px; font-size: 12px;">${escapeHtml(status || 'Open')}</span>
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            Updated at: ${escapeHtml(formattedDate)}
          </div>
        </td>
      </tr>
    </table>

    <!-- Admin Message Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eff6ff; border-left: 4px solid #38a3f6; border-radius: 12px; margin: 20px 0;">
      <tr>
        <td style="padding: 18px 20px;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #1e40af; margin-bottom: 8px;">
            Message from Vista Holidays Support Team:
          </div>
          <div style="font-size: 15px; color: #0f172a; line-height: 1.6; white-space: pre-wrap; font-style: italic;">
            "${escapeHtml(adminMessage)}"
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">
      You can review the entire conversation history, ticket timeline, and submit further inquiries via the tracking portal:
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
    headerGradient: 'linear-gradient(135deg, #0c3d6e 0%, #0284c7 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

There is a new update on your Vista Holidays ticket.

Ticket ID: ${ticketId}
Current Status: ${status}
Updated Time: ${formattedDate}

Message from Vista Holidays Support Team:
"${adminMessage}"

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

export default buildTicketUpdateEmail;
