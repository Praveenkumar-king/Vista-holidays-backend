/**
 * loginOtpTemplate.js
 * 
 * Generates branded Sign In OTP email for Vista Holidays.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting } from '../emailTimeHelper.js';

export const buildLoginOtpEmail = ({
  toEmail,
  userName,
  otp,
  expiresMinutes = 5,
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = `Sign In Verification Code - ${safeName} 🔐`;
  const emailType = 'SIGN IN WITH OTP';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">
      You requested a one-time verification code (OTP) to sign in to your Vista Holidays account. Enter this code on the login page to proceed:
    </p>

    <div style="text-align: center; margin: 26px 0;">
      <div style="display: inline-block; background-color: #f0f7ff; border: 2px dashed #0e87ea; border-radius: 16px; padding: 16px 32px; letter-spacing: 10px; font-size: 32px; font-weight: 800; font-family: monospace, sans-serif; color: #074984; box-shadow: 0 4px 12px rgba(14, 135, 234, 0.08);">
        ${escapeHtml(otp)}
      </div>
    </div>

    <div style="background-color: #eff6ff; border-left: 4px solid #38a3f6; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
      ⏱️ <strong>Time Sensitivity:</strong> This code is valid for <strong>${escapeHtml(expiresMinutes)} minutes</strong> and can only be used once.
    </div>

    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b;">
      🔒 <strong>Security Advice:</strong> Never share this code with anyone. Vista Holidays support staff will never ask for your one-time verification code.
    </p>

    <p style="margin: 0 0 8px 0; font-size: 13px; color: #94a3b8;">
      If you did not attempt to sign in to your Vista Holidays account, you can safely ignore this email.
    </p>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: safeName,
    recipientEmail: toEmail,
    bodyHtml,
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

You requested a one-time verification code (OTP) to sign in to your Vista Holidays account.

Your verification code is:
${otp}

Note: This code will expire in ${expiresMinutes} minutes and can only be used once.

Security Notice:
Never share this code with anyone. Vista Holidays will never ask for your password, OTP, banking information, or sensitive financial information through email or phone.

If you did not request this login code, you can safely ignore this message.

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

export default buildLoginOtpEmail;
