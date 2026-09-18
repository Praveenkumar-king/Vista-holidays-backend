/**
 * bookingConfirmationTemplate.js
 * 
 * Generates branded Vista Holidays Booking Confirmation email.
 * Leverages the master baseTemplate and emailComponents.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml, VISTA_SUPPORT_EMAIL } from '../emailComponents.js';
import { getISTGreeting, formatISTDateTime } from '../emailTimeHelper.js';

export const buildBookingConfirmationEmail = ({
  toEmail,
  userName,
  bookingId,
  destinationName,
  country = '',
  packageName,
  checkInDate = null,
  stayDuration,
  members,
  pricePerDay,
  subtotal,
  tax = 0,
  totalAmount,
  paymentStatus = 'Paid',
  razorpayPaymentId = '',
  bookingDate = new Date(),
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  // Personalized subject convention matching existing Email folder style
  const subject = `Booking Confirmed - ${safeName} 🎉❤️`;
  const emailType = 'BOOKING CONFIRMATION';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const dynamicBookingUrl = `${safeClientUrl}/users/bookings?id=${encodeURIComponent(bookingId)}`;
  const formattedDate = formatISTDateTime(bookingDate);
  const formattedCheckIn = checkInDate
    ? new Date(checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const formattedPricePerDay = `₹${Number(pricePerDay).toLocaleString('en-IN')}`;
  const formattedSubtotal = `₹${Number(subtotal).toLocaleString('en-IN')}`;
  const formattedTax = tax > 0 ? `₹${Number(tax).toLocaleString('en-IN')}` : 'Included (₹0)';
  const formattedTotal = `₹${Number(totalAmount).toLocaleString('en-IN')}`;

  const bodyHtml = `
    <!-- Celebration Headline -->
    <div style="text-align: center; margin: 4px 0 22px 0;">
      <span style="display: inline-block; font-size: 32px; margin-bottom: 6px;">🎉✈️🌴</span>
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 6px 0; line-height: 1.3;">
        Booking Confirmed 🎉
      </h2>
      <p style="font-size: 14px; color: #64748b; margin: 0;">
        Your journey with Vista Holidays is locked in! Pack your bags for an unforgettable adventure.
      </p>
    </div>

    <!-- Booking ID Hero Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; margin: 20px 0; text-align: center;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; font-weight: 700; margin-bottom: 4px;">
            Official Booking Reference
          </div>
          <div style="font-size: 22px; font-weight: 800; color: #14532d; font-family: monospace, Courier, monospace; letter-spacing: 1px;">
            ${escapeHtml(bookingId)}
          </div>
          <div style="margin-top: 8px;">
            <span style="display: inline-block; background: #dcfce7; color: #15803d; font-weight: 800; font-size: 12px; padding: 4px 14px; border-radius: 9999px; border: 1px solid #86efac;">
              ✓ Payment Status: ${escapeHtml(paymentStatus)}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <!-- Detailed Itinerary / Booking Table -->
    <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin: 24px 0 10px 0;">
      Trip &amp; Reservation Details
    </div>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px; font-size: 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b; width: 42%;">Destination</td>
        <td style="padding: 11px 16px; color: #0f172a; font-weight: 800;">${escapeHtml(destinationName)}${country ? `, ${escapeHtml(country)}` : ''}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Package Selected</td>
        <td style="padding: 11px 16px; color: #0284c7; font-weight: 700;">${escapeHtml(packageName)}</td>
      </tr>
      ${
        formattedCheckIn
          ? `<tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Check-in Date</td>
              <td style="padding: 11px 16px; color: #0f172a; font-weight: 700;">${escapeHtml(formattedCheckIn)}</td>
            </tr>`
          : ''
      }
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Stay Duration</td>
        <td style="padding: 11px 16px; color: #0f172a; font-weight: 700;">${escapeHtml(stayDuration)} Day${Number(stayDuration) === 1 ? '' : 's'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Number of Members</td>
        <td style="padding: 11px 16px; color: #0f172a; font-weight: 700;">${escapeHtml(members)} Traveler${Number(members) === 1 ? '' : 's'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Price Per Day</td>
        <td style="padding: 11px 16px; color: #0f172a; font-weight: 600;">${formattedPricePerDay} / Day</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Subtotal</td>
        <td style="padding: 11px 16px; color: #0f172a; font-weight: 600;">${formattedSubtotal}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 11px 16px; font-weight: 600; color: #64748b;">Taxes &amp; Platform Fees</td>
        <td style="padding: 11px 16px; color: #0f172a; font-weight: 600;">${formattedTax}</td>
      </tr>
      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 13px 16px; font-weight: 800; color: #0f172a; font-size: 15px;">Total Amount Paid</td>
        <td style="padding: 13px 16px; color: #16a34a; font-weight: 800; font-size: 17px;">${formattedTotal}</td>
      </tr>
      ${
        razorpayPaymentId
          ? `<tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 16px; font-weight: 600; color: #64748b;">Razorpay Payment ID</td>
              <td style="padding: 10px 16px; color: #475569; font-family: monospace; font-size: 13px;">${escapeHtml(razorpayPaymentId)}</td>
            </tr>`
          : ''
      }
      <tr>
        <td style="padding: 10px 16px; font-weight: 600; color: #64748b;">Booking Date</td>
        <td style="padding: 10px 16px; color: #0f172a; font-weight: 600;">${escapeHtml(formattedDate)}</td>
      </tr>
    </table>

    <p style="margin: 0 0 12px 0; font-size: 14px; color: #64748b; text-align: center;">
      You can review your full itinerary, manage reservation details, and access travel assistance inside your Vista Holidays account:
    </p>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: safeName,
    recipientEmail: toEmail,
    bodyHtml,
    ctaText: 'View My Booking',
    ctaUrl: dynamicBookingUrl,
    ctaButtonColor: '#0e87ea',
    showSecurityNotice: true,
    showHelpSection: true,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #065f46 0%, #0d9488 50%, #0e87ea 100%)'
  });

  const { fullGreetingText } = getISTGreeting({ userName: safeName });

  const text = `
${emailType}
------------------------------------------------------------
${fullGreetingText}

Booking Confirmed 🎉

Your journey with Vista Holidays has been successfully booked and paid!

Booking ID: ${bookingId}
Destination: ${destinationName}${country ? `, ${country}` : ''}
Package: ${packageName}
${formattedCheckIn ? `Check-in Date: ${formattedCheckIn}\n` : ''}Stay Duration: ${stayDuration} Day${Number(stayDuration) === 1 ? '' : 's'}
Members: ${members} Traveler${Number(members) === 1 ? '' : 's'}
Price Per Day: ${formattedPricePerDay}
Subtotal: ${formattedSubtotal}
Taxes/Fees: ${formattedTax}
Total Amount Paid: ${formattedTotal}
Payment Status: ${paymentStatus}
${razorpayPaymentId ? `Razorpay Payment ID: ${razorpayPaymentId}\n` : ''}Booking Date: ${formattedDate}

View My Booking:
${dynamicBookingUrl}

If the button is not working, copy this link and paste it into your browser:
${dynamicBookingUrl}

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

export default buildBookingConfirmationEmail;
