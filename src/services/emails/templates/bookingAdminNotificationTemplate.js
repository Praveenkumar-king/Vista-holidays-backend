/**
 * bookingAdminNotificationTemplate.js
 * 
 * Generates internal admin notification email for newly confirmed bookings.
 * Preserves Vista Holidays branding and layout.
 */

import { renderBaseEmail } from './baseTemplate.js';
import { escapeHtml } from '../emailComponents.js';
import { formatISTDateTime } from '../emailTimeHelper.js';

export const buildBookingAdminNotification = ({
  bookingId,
  userName,
  email,
  mobile,
  destinationName,
  packageName,
  pricePerDay,
  days,
  members,
  subtotal,
  tax = 0,
  totalAmount,
  paymentStatus = 'Paid',
  razorpayOrderId = '',
  razorpayPaymentId = '',
  bookingDate = new Date(),
  clientUrl
}) => {
  const safeName = (userName && String(userName).trim()) || 'Traveler';
  const subject = `New Booking Confirmed | ${bookingId} | ${destinationName} | ${safeName}`;
  const emailType = 'ADMIN NOTIFICATION';

  const safeClientUrl = (clientUrl || 'http://localhost:5173').replace(/\/+$/, '');
  const adminUrl = `${safeClientUrl}/admin/transactions`;
  const formattedDate = formatISTDateTime(bookingDate);

  const formattedPricePerDay = `₹${Number(pricePerDay).toLocaleString('en-IN')}`;
  const formattedSubtotal = `₹${Number(subtotal).toLocaleString('en-IN')}`;
  const formattedTax = tax > 0 ? `₹${Number(tax).toLocaleString('en-IN')}` : '₹0';
  const formattedTotal = `₹${Number(totalAmount).toLocaleString('en-IN')}`;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
      A traveler has successfully booked a destination package on Vista Holidays and payment has been verified. Review details below:
    </p>

    <!-- Booking Badge -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 18px; margin: 18px 0; text-align: center;">
      <tr>
        <td align="center">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #166534; font-weight: 700;">
            New Booking Received
          </div>
          <div style="font-size: 22px; font-weight: 800; color: #14532d; font-family: monospace, Courier, monospace; margin-top: 4px;">
            ${escapeHtml(bookingId)}
          </div>
          <div style="font-size: 14px; color: #16a34a; font-weight: 700; margin-top: 6px;">
            Amount Paid: ${formattedTotal}
          </div>
        </td>
      </tr>
    </table>

    <!-- Booking & Customer Data Table -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 20px 0; font-size: 14px;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569; width: 38%;">Traveler Name</td>
        <td style="padding: 10px 12px; color: #0f172a; font-weight: 700;">${escapeHtml(safeName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Email Address</td>
        <td style="padding: 10px 12px; color: #0e87ea;">${escapeHtml(email)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Mobile Number</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(mobile || 'Not provided')}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Destination</td>
        <td style="padding: 10px 12px; color: #0f172a; font-weight: 700;">${escapeHtml(destinationName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Package</td>
        <td style="padding: 10px 12px; color: #0284c7; font-weight: 700;">${escapeHtml(packageName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Stay Duration</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(days)} Day${Number(days) === 1 ? '' : 's'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Members</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(members)} Traveler${Number(members) === 1 ? '' : 's'}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Price Per Day</td>
        <td style="padding: 10px 12px; color: #0f172a;">${formattedPricePerDay} / Day</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Subtotal</td>
        <td style="padding: 10px 12px; color: #0f172a;">${formattedSubtotal}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Taxes / Fees</td>
        <td style="padding: 10px 12px; color: #0f172a;">${formattedTax}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9; background: #f8fafc;">
        <td style="padding: 12px; font-weight: 800; color: #0f172a;">Total Amount</td>
        <td style="padding: 12px; color: #16a34a; font-weight: 800; font-size: 16px;">${formattedTotal}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Payment Status</td>
        <td style="padding: 10px 12px; color: #16a34a; font-weight: 700;">${escapeHtml(paymentStatus)}</td>
      </tr>
      ${
        razorpayOrderId
          ? `<tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Razorpay Order ID</td>
              <td style="padding: 10px 12px; color: #334155; font-family: monospace;">${escapeHtml(razorpayOrderId)}</td>
            </tr>`
          : ''
      }
      ${
        razorpayPaymentId
          ? `<tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Razorpay Payment ID</td>
              <td style="padding: 10px 12px; color: #334155; font-family: monospace;">${escapeHtml(razorpayPaymentId)}</td>
            </tr>`
          : ''
      }
      <tr>
        <td style="padding: 10px 12px; font-weight: 700; color: #475569;">Booking Date</td>
        <td style="padding: 10px 12px; color: #0f172a;">${escapeHtml(formattedDate)}</td>
      </tr>
    </table>
  `;

  const html = renderBaseEmail({
    emailType,
    userName: 'Booking Administrator',
    recipientEmail: 'admin@vistaholidays.com',
    bodyHtml,
    ctaText: 'Open Admin Transactions',
    ctaUrl: adminUrl,
    ctaButtonColor: '#059669',
    showSecurityNotice: false,
    showHelpSection: false,
    clientUrl,
    headerGradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)'
  });

  const text = `
ADMIN NOTIFICATION — NEW BOOKING RECEIVED
------------------------------------------------------------
Subject: ${subject}
Booking ID: ${bookingId}
User Name: ${safeName}
Email: ${email}
Mobile: ${mobile || 'N/A'}
Destination: ${destinationName}
Package: ${packageName}
Price Per Day: ${formattedPricePerDay}
Days: ${days}
Members: ${members}
Subtotal: ${formattedSubtotal}
Taxes/Fees: ${formattedTax}
Total Amount: ${formattedTotal}
Payment Status: ${paymentStatus}
${razorpayOrderId ? `Razorpay Order ID: ${razorpayOrderId}\n` : ''}${razorpayPaymentId ? `Razorpay Payment ID: ${razorpayPaymentId}\n` : ''}Booking Date: ${formattedDate}

Access Transactions: ${adminUrl}
  `.trim();

  return { subject, html, text };
};

export default buildBookingAdminNotification;
