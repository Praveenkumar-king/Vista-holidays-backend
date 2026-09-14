/**
 * baseTemplate.js
 * 
 * Production-quality, reusable master HTML email shell for all Vista Holidays emails.
 * Mobile-responsive, client-compatible, table-based layout.
 */

import {
  escapeHtml,
  renderHeader,
  renderCtaButton,
  renderCopyPasteFallback,
  renderSecurityNotice,
  renderNeedHelpSection,
  renderTaglineAndClosing,
  renderFooter
} from '../emailComponents.js';
import { getISTGreeting } from '../emailTimeHelper.js';

/**
 * Builds the complete branded Vista Holidays email
 * 
 * @param {object} params
 * @param {string} params.emailType - Label for badge (e.g. 'EMAIL VERIFICATION', 'WELCOME TO VISTA HOLIDAYS')
 * @param {string} [params.headline] - Optional prominent headline under greeting
 * @param {string} params.userName - Recipient's name for personalized greeting
 * @param {string} [params.recipientEmail] - Recipient's email for footer notice
 * @param {string} params.bodyHtml - Specific inner content HTML
 * @param {string} [params.ctaText] - Label for primary CTA button
 * @param {string} [params.ctaUrl] - URL for primary CTA button
 * @param {string} [params.ctaButtonColor] - Custom background color for CTA button
 * @param {boolean} [params.showSecurityNotice=true] - Toggle visibility of red security notice
 * @param {boolean} [params.showHelpSection=true] - Toggle visibility of Need Help section
 * @param {string} [params.clientUrl] - Frontend base URL for links
 * @param {string} [params.headerGradient] - Custom gradient for header banner
 * @param {Date} [params.date] - Optional custom date for greeting computation (defaults to current date)
 * @returns {string} Fully assembled HTML email string
 */
export const renderBaseEmail = ({
  emailType = 'NOTIFICATION',
  headline = '',
  userName = '',
  recipientEmail = '',
  bodyHtml = '',
  ctaText = '',
  ctaUrl = '',
  ctaButtonColor = '#0e87ea',
  showSecurityNotice = true,
  showHelpSection = true,
  clientUrl = 'http://localhost:5173',
  headerGradient,
  date = new Date()
}) => {
  const { fullGreetingHtml } = getISTGreeting({ userName, date });

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>Vista Holidays</title>
  <!--[if mso]>
  <style>
    * { font-family: sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1e293b;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
      .content-padding {
        padding: 24px 18px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1120;">
  <!-- Outer Background Shell -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0b1120; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <!-- Email Container (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5); overflow: hidden; border: 1px solid #1e293b;">
          <!-- 1. Header (Logo + Email Type Label) -->
          <tr>
            <td>
              ${renderHeader({ emailType, headerGradient })}
            </td>
          </tr>

          <!-- 2. Main Content Body -->
          <tr>
            <td class="content-padding" style="padding: 36px 32px; font-size: 15px; line-height: 1.6; color: #334155;">
              <!-- Greetings (Weekend + Time-based + Username) -->
              <div style="margin-bottom: 20px;">
                ${fullGreetingHtml}
              </div>

              <!-- Optional Headline -->
              ${
                headline
                  ? `<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">
                      ${escapeHtml(headline)}
                    </h1>`
                  : ''
              }

              <!-- Specific Content Injected Here -->
              <div style="color: #334155; font-size: 15px; line-height: 1.6;">
                ${bodyHtml}
              </div>

              <!-- Primary CTA Button (if supplied) -->
              ${ctaUrl && ctaText ? renderCtaButton({ label: ctaText, url: ctaUrl, buttonColor: ctaButtonColor }) : ''}

              <!-- Fallback Copy/Paste Link (if CTA supplied) -->
              ${ctaUrl ? renderCopyPasteFallback({ url: ctaUrl }) : ''}

              <!-- Red Security Notice (if applicable) -->
              ${showSecurityNotice ? renderSecurityNotice() : ''}

              <!-- Need Help Section -->
              ${showHelpSection ? renderNeedHelpSection({ clientUrl }) : ''}

              <!-- Brand Tagline and Thanks & Regards Closing -->
              ${renderTaglineAndClosing()}
            </td>
          </tr>

          <!-- 3. Branded Footer -->
          <tr>
            <td>
              ${renderFooter({ recipientEmail })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default renderBaseEmail;
