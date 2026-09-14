/**
 * emailComponents.js
 * 
 * Reusable HTML components for Vista Holidays branded email system.
 * Designed for maximum email client compatibility (table layouts, inline styles, Outlook-safe).
 */

import { getCurrentISTYear } from './emailTimeHelper.js';

export const VISTA_LOGO_URL = 'https://res.cloudinary.com/dkzkasg7x/image/upload/v1789387703/Vista_Holidays_Logo.png';
export const VISTA_SUPPORT_EMAIL = 'no-reply-travelbooking@outlook.com';

/**
 * HTML Escaping utility
 */
export const escapeHtml = (text) => {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Renders the Vista Holidays branded Header with Cloudinary Logo and Email Type Label
 */
export const renderHeader = ({ emailType = 'NOTIFICATION', headerGradient }) => {
  const gradient = headerGradient || 'linear-gradient(135deg, #074984 0%, #0e87ea 100%)';

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: ${gradient}; border-radius: 20px 20px 0 0; overflow: hidden;">
      <tr>
        <td align="center" style="padding: 36px 24px 28px 24px; text-align: center;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
            <tr>
              <td align="center">
                <img 
                  src="${VISTA_LOGO_URL}" 
                  alt="Vista Holidays" 
                  width="180" 
                  height="auto" 
                  style="display: block; width: 180px; max-width: 100%; height: auto; border: 0; outline: none; text-decoration: none; margin: 0 auto;" 
                />
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 18px;">
            <span style="display: inline-block; background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 9999px; padding: 6px 18px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.6px; color: #ffffff;">
              ${escapeHtml(emailType)}
            </span>
          </div>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Renders the Primary Call To Action Button
 */
export const renderCtaButton = ({ label, url, buttonColor = '#0e87ea' }) => {
  if (!url || !label) return '';

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="border-radius: 12px; background-color: ${buttonColor};">
                <a 
                  href="${escapeHtml(url)}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style="display: inline-block; padding: 15px 34px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #ffffff !important; text-decoration: none; border-radius: 12px; background-color: ${buttonColor}; border: 1px solid ${buttonColor}; letter-spacing: 0.3px; text-align: center; box-shadow: 0 4px 14px rgba(14, 135, 234, 0.35);"
                >
                  ${escapeHtml(label)}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Renders the Copy/Paste Link Fallback section
 */
export const renderCopyPasteFallback = ({ url }) => {
  if (!url) return '';

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 18px 0 24px 0;">
      <tr>
        <td style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 14px 18px; font-size: 12px; line-height: 1.6; color: #64748b; text-align: left; word-break: break-all;">
          <strong style="color: #475569;">If the button is not working, copy this link and paste it into your browser:</strong><br>
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color: #0e87ea; text-decoration: underline; word-break: break-all;">
            ${escapeHtml(url)}
          </a>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Renders the mandatory RED Security Notice Box
 */
export const renderSecurityNotice = () => {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 24px 0;">
      <tr>
        <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 5px solid #dc2626; border-radius: 12px; padding: 16px 20px; text-align: left;">
          <div style="font-size: 12px; font-weight: 800; color: #b91c1c; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px;">
            ⚠️ Security Notice
          </div>
          <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #7f1d1d;">
            Vista Holidays will never ask for your money, password, OTP, banking information, card details, or other sensitive financial information through email.
          </p>
          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #991b1b;">
            If you receive a suspicious email claiming to be from Vista Holidays, do not share sensitive information or click unknown links.
          </p>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Renders the Need Help Section with Support Ticket and FAQ links
 */
export const renderNeedHelpSection = ({ clientUrl }) => {
  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const contactUrl = `${safeClientUrl}/contact`;
  const faqUrl = `${safeClientUrl}/faq`;

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 28px 0;">
      <tr>
        <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 22px; text-align: left;">
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
            Need Help?
          </div>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; line-height: 1.8; color: #475569;">
            <tr>
              <td style="padding: 4px 0; width: 32%; font-weight: 600; color: #64748b; vertical-align: middle;">
                Email:
              </td>
              <td style="padding: 4px 0; vertical-align: middle;">
                <a href="mailto:${VISTA_SUPPORT_EMAIL}" style="color: #0e87ea; text-decoration: none; font-weight: 600;">
                  ${VISTA_SUPPORT_EMAIL}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: middle;">
                Support Ticket:
              </td>
              <td style="padding: 6px 0; vertical-align: middle;">
                <a 
                  href="${contactUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style="display: inline-block; background-color: #e0effe; color: #026bc8; font-weight: 700; font-size: 12px; padding: 5px 14px; border-radius: 8px; text-decoration: none; border: 1px solid #bae0fd;"
                >
                  Contact Us
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b; vertical-align: middle;">
                Documentation:
              </td>
              <td style="padding: 6px 0; vertical-align: middle;">
                <a 
                  href="${faqUrl}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style="display: inline-block; background-color: #f1f5f9; color: #334155; font-weight: 700; font-size: 12px; padding: 5px 14px; border-radius: 8px; text-decoration: none; border: 1px solid #cbd5e1;"
                >
                  FAQ
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Renders the Vista Holidays Tagline and Closing
 */
export const renderTaglineAndClosing = () => {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <tr>
        <td align="center" style="text-align: center;">
          <div style="font-size: 15px; font-weight: 700; color: #0e87ea; letter-spacing: 0.8px; margin-bottom: 12px;">
            🌍 Travel. Discover. Experience.
          </div>
          <div style="font-size: 14px; font-weight: 500; color: #475569; line-height: 1.6;">
            Thanks &amp; Regards<br>
            <strong style="color: #0f172a; font-weight: 800; font-size: 15px;">Vista Holidays ❤️</strong>
          </div>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Renders the Common Footer
 */
export const renderFooter = ({ recipientEmail }) => {
  const currentYear = getCurrentISTYear();

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 20px 20px;">
      <tr>
        <td align="center" style="padding: 24px 20px; text-align: center; font-size: 12px; line-height: 1.6; color: #64748b;">
          <div>
            &copy; ${currentYear} Vista Holidays. All Rights Reserved.
          </div>
          ${
            recipientEmail
              ? `<div style="margin-top: 6px; color: #94a3b8;">
                  This email is intended for <strong style="color: #475569;">${escapeHtml(recipientEmail)}</strong>
                </div>`
              : ''
          }
        </td>
      </tr>
    </table>
  `;
};

export default {
  VISTA_LOGO_URL,
  VISTA_SUPPORT_EMAIL,
  escapeHtml,
  renderHeader,
  renderCtaButton,
  renderCopyPasteFallback,
  renderSecurityNotice,
  renderNeedHelpSection,
  renderTaglineAndClosing,
  renderFooter
};
