/**
 * verificationTemplate.js
 * 
 * Generates branded Email Verification email for Vista Holidays.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting } from '../emailTimeHelper.js';

export const buildVerificationEmail = ({
  toEmail,
  userName,
  verificationUrl,
  expiresHours = 24,
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = `Email Verification - ${safeName} ✔️`;
  const emailType = 'EMAIL VERIFICATION';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      Welcome to Vista Holidays! A new traveler account has been created with this email address. To activate your account and access all our personalized travel tools, please verify your email.
    </p>

    <div style="background-color: #eff6ff; border-left: 4px solid #38a3f6; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
      ⏱️ <strong>Time Sensitivity:</strong> This verification link will expire in <strong>${escapeHtml(expiresHours)} hours</strong>.
    </div>

    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
      Click the button below to complete your email verification and unlock AI-powered itineraries, real-time weather insights, and curated destinations:
    </p>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: safeName,
    recipientEmail: toEmail,
    bodyHtml,
    ctaText: 'Verify My Email',
    ctaUrl: verificationUrl,
    ctaButtonColor: '#0e87ea',
    showSecurityNotice: true,
    showHelpSection: true,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #074984 0%, #0e87ea 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

Welcome to Vista Holidays! A new traveler account was created with this email address. Please verify your email to activate your account.

Verify your email:
${verificationUrl}

Note: This link will expire in ${expiresHours} hours.

If the button above is not working, copy and paste the link directly into your browser.

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

export default buildVerificationEmail;
