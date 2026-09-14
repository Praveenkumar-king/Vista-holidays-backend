/**
 * feedbackConfirmationTemplate.js
 * 
 * Generates user confirmation email when Feedback is received.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting, formatISTDateTime } from '../emailTimeHelper.js';

export const buildFeedbackConfirmationEmail = ({
  toEmail,
  userName,
  ticketId,
  rating = 5,
  answers = {},
  submittedAt = new Date(),
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = `Feedback Received - ${safeName} 💬`;
  const emailType = 'FEEDBACK RECEIVED';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const trackUrl = `${safeClientUrl}/track-status?ticket=${encodeURIComponent(ticketId)}`;
  const formattedDate = formatISTDateTime(submittedAt);

  const starRating = '⭐'.repeat(Math.max(1, Math.min(5, Number(rating) || 5)));

  let summarySnippet = '';
  if (answers && typeof answers === 'object') {
    const firstAnswer = Object.values(answers).find((val) => typeof val === 'string' && val.trim().length > 0);
    if (firstAnswer) {
      summarySnippet = firstAnswer.length > 200 ? firstAnswer.substring(0, 200) + '...' : firstAnswer;
    }
  }

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Thank you for sharing your thoughts with Vista Holidays! Your feedback has been received by our product experience team and helps us craft better journeys for travelers worldwide.
    </p>

    <!-- Ticket Summary Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 16px; padding: 22px; margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6d28d9; font-weight: 700; margin-bottom: 6px;">
            Feedback Ticket ID
          </div>
          <div style="font-size: 24px; font-weight: 800; color: #4c1d95; font-family: monospace, Courier, monospace; letter-spacing: 1px;">
            ${escapeHtml(ticketId)}
          </div>
          <div style="font-size: 14px; color: #7c3aed; margin-top: 8px; font-weight: 700;">
            Overall Experience: ${starRating} (${Number(rating) || 5}/5)
          </div>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 18px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; line-height: 1.7; border-top: 1px solid #e9d5ff; padding-top: 12px;">
            <tr>
              <td style="padding: 4px 0; width: 35%; color: #6d28d9; font-weight: 600;">Submitted Time:</td>
              <td style="padding: 4px 0; color: #4c1d95;">${escapeHtml(formattedDate)}</td>
            </tr>
            ${
              summarySnippet
                ? `<tr>
                    <td style="padding: 4px 0; color: #6d28d9; font-weight: 600; vertical-align: top;">Feedback Highlights:</td>
                    <td style="padding: 4px 0; color: #334155; font-style: italic;">"${escapeHtml(summarySnippet)}"</td>
                  </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 15px; color: #334155;">
      You can track the status of your feedback and view responses from our team at any time:
    </p>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: safeName,
    recipientEmail: toEmail,
    bodyHtml,
    ctaText: 'Track Your Status',
    ctaUrl: trackUrl,
    ctaButtonColor: '#7c3aed',
    showSecurityNotice: true,
    showHelpSection: true,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

Thank you for your feedback! It has been received by our product experience team.

Ticket ID: ${ticketId}
Rating: ${rating}/5 (${starRating})
Submitted Time: ${formattedDate}
${summarySnippet ? `Feedback Highlights: "${summarySnippet}"\n` : ''}

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

export default buildFeedbackConfirmationEmail;
