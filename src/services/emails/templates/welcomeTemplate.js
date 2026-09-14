/**
 * welcomeTemplate.js
 * 
 * Generates branded Welcome Email sent immediately after email verification.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting } from '../emailTimeHelper.js';

export const buildWelcomeEmail = ({
  toEmail,
  userName,
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  // EXACT STYLE as mandated in requirements
  const subject = `Welcome to Vista Holidays Family - ${safeName} ❤️🥰🥳🎉`;
  const emailType = 'WELCOME TO VISTA HOLIDAYS';
  const exploreUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');

  const bodyHtml = `
    <div style="text-align: center; margin: 10px 0 24px 0;">
      <span style="display: inline-block; font-size: 32px; margin-bottom: 8px;">🎉✈️🏝️</span>
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; line-height: 1.3;">
        Your Account Is Now Active!
      </h2>
      <p style="font-size: 15px; color: #64748b; margin: 0;">
        We are thrilled to welcome you to the global Vista Holidays travel community.
      </p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Welcome to the Vista Holidays family, <strong>${escapeHtml(safeName)}</strong>. Your email has been verified and your account is now fully active.
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">
      You can now explore destinations, discover famous places, check real-time weather, create AI-powered travel plans, and use the Vista Holidays platform to plan your next journey.
    </p>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px 20px; margin: 20px 0;">
      <tr>
        <td>
          <div style="font-size: 13px; font-weight: 800; color: #15803d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            ✨ What You Can Do Now:
          </div>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #166534; line-height: 1.7;">
            <li><strong>AI Travel Assistant:</strong> Instant recommendations, packing tips, and local secrets.</li>
            <li><strong>Smart Itinerary Planner:</strong> Custom day-by-day travel schedules in seconds.</li>
            <li><strong>Live Weather Insights:</strong> Hourly and multi-day forecasts for top travel spots.</li>
            <li><strong>Curated Destinations:</strong> High-resolution photos, famous attractions, and insider guides.</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-align: center;">
      Ready to start your adventure? Let's take flight:
    </p>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: safeName,
    recipientEmail: toEmail,
    bodyHtml,
    ctaText: 'Explore Vista Holidays',
    ctaUrl: exploreUrl,
    ctaButtonColor: '#0e87ea',
    showSecurityNotice: true,
    showHelpSection: true,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #026bc8 0%, #38a3f6 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

Welcome to the Vista Holidays family, ${safeName}.

Your email has been verified and your account is now active.

You can now explore destinations, discover famous places, check real-time weather, create AI-powered travel plans, and use the Vista Holidays platform to plan your next journey.

Explore Vista Holidays:
${exploreUrl}

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

export default buildWelcomeEmail;
