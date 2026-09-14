/**
 * ticketStatusTemplate.js
 * 
 * Generates notification email when ticket status is updated by an admin.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting, formatISTDateTime } from '../emailTimeHelper.js';

export const buildTicketStatusChangeEmail = ({
  toEmail,
  userName,
  ticketId,
  previousStatus,
  newStatus,
  updatedAt = new Date(),
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = `Ticket Status Updated - ${safeName} 🔔`;
  const emailType = 'TICKET STATUS UPDATED';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const trackUrl = `${safeClientUrl}/track-status?ticket=${encodeURIComponent(ticketId)}`;
  const formattedDate = formatISTDateTime(updatedAt);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Your Vista Holidays ticket status has been updated by our support operations team.
    </p>

    <!-- Status Change Visualizer Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; margin: 20px 0; text-align: center;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 4px;">
            Ticket Reference
          </div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; font-family: monospace, Courier, monospace;">
            ${escapeHtml(ticketId)}
          </div>

          <div style="margin-top: 16px; font-size: 15px;">
            <span style="color: #94a3b8; text-decoration: line-through; font-weight: 600;">${escapeHtml(previousStatus || 'Open')}</span>
            <span style="margin: 0 12px; color: #38a3f6; font-size: 18px; font-weight: 800;">➔</span>
            <span style="display: inline-block; background-color: #e0effe; color: #026bc8; font-weight: 800; padding: 4px 14px; border-radius: 9999px; border: 1px solid #bae0fd;">
              ${escapeHtml(newStatus)}
            </span>
          </div>

          <div style="font-size: 12px; color: #94a3b8; margin-top: 12px;">
            Updated at: ${escapeHtml(formattedDate)}
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">
      You can track the live progress, view support notes, or respond to this update on our tracking portal:
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
    headerGradient: 'linear-gradient(135deg, #0c3d6e 0%, #0e87ea 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

Your Vista Holidays ticket status has been updated.

Ticket ID: ${ticketId}
Previous Status: ${previousStatus}
New Status: ${newStatus}
Updated Time: ${formattedDate}

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

export default buildTicketStatusChangeEmail;
