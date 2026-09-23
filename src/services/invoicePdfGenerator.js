/**
 * invoicePdfGenerator.js
 * 
 * High-performance, server-side PDF invoice generator for Vista Holidays.
 * Generates single-page, print-ready, A4 invoices with pixel-perfect
 * layout, Unicode / INR (₹) symbol support, and official Cloudinary logo branding.
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatISTDateTime, getCurrentISTYear } from './emails/emailTimeHelper.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regularFontPath = path.resolve(__dirname, '../assets/fonts/Arial-Regular.ttf');
const boldFontPath = path.resolve(__dirname, '../assets/fonts/Arial-Bold.ttf');
const logoPath = path.resolve(__dirname, '../assets/logo.png');

// Fallback font names if custom fonts fail
let FONT_REGULAR = 'Helvetica';
let FONT_BOLD = 'Helvetica-Bold';

/**
 * Format currency in Indian numbering system with Rupee symbol
 * @param {number} amount 
 * @returns {string} e.g. "₹48,000"
 */
const formatINR = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

/**
 * Format date in IST with fallback
 * @param {Date|string} date 
 * @param {boolean} includeTime 
 * @returns {string}
 */
const formatDateIST = (date, includeTime = false) => {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'N/A';

  if (includeTime) {
    return formatISTDateTime(d);
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(d);
};

/**
 * Generate Invoice PDF Buffer
 * @param {object} params
 * @param {object} params.booking - Booking record from DB
 * @param {object} params.invoice - Invoice record from DB
 * @param {object} [params.user] - Optional User record
 * @param {object} [params.transaction] - Optional Transaction record
 * @returns {Promise<Buffer>}
 */
export const generateInvoicePdf = async ({
  booking,
  invoice,
  user = null,
  transaction = null
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 32,
        info: {
          Title: `Vista Holidays Invoice - ${invoice.invoiceNumber}`,
          Author: 'Vista Holidays',
          Subject: `Travel Booking Invoice for ${booking.bookingId}`,
          Keywords: 'invoice, travel, vista holidays, booking',
          Creator: 'Vista Holidays Invoicing System',
          Producer: 'Vista Holidays'
        }
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      // Register Arial TrueType fonts for full Unicode and Rupee (₹) symbol support
      if (fs.existsSync(regularFontPath)) {
        doc.registerFont('ArialRegular', regularFontPath);
        FONT_REGULAR = 'ArialRegular';
      }
      if (fs.existsSync(boldFontPath)) {
        doc.registerFont('ArialBold', boldFontPath);
        FONT_BOLD = 'ArialBold';
      }

      doc.font(FONT_REGULAR);

      const PAGE_WIDTH = 595.28;
      const MARGIN = 32;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 531.28 pt

      // Dynamic data preparation
      const invoiceNumber = invoice.invoiceNumber || 'VISTA-INV-PENDING';
      const bookingId = booking.bookingId || 'VISTA-BOOK-PENDING';
      const invoiceDateStr = formatDateIST(invoice.generatedAt || new Date());
      const bookingDateStr = formatDateIST(booking.createdAt || new Date());
      const generatedDateTimeStr = formatDateIST(invoice.generatedAt || new Date(), true);

      const customerName = booking.userName || user?.name || 'Valued Traveler';
      const customerEmail = booking.email || user?.email || 'N/A';
      const customerMobile = booking.mobile || user?.mobile || 'N/A';
      const billingAddress = user?.address || 'Not Provided';
      const customerCountry = booking.country || user?.country || 'India';

      const destinationName = booking.destinationName || 'Destination';
      const destinationCountry = booking.country || '';
      const packageName = booking.packageName || 'Standard Package';
      const packageType = booking.packageId ? (booking.packageId.charAt(0).toUpperCase() + booking.packageId.slice(1)) : 'Standard Explorer';
      const checkInDateStr = formatDateIST(booking.checkInDate);
      
      let checkOutDateStr = 'N/A';
      if (booking.checkInDate && booking.days) {
        const outDate = new Date(booking.checkInDate);
        outDate.setDate(outDate.getDate() + (booking.days || 1));
        checkOutDateStr = formatDateIST(outDate);
      }

      const daysCount = booking.days || 1;
      const membersCount = booking.members || 1;
      const pricePerDay = booking.pricePerDay || 0;
      const subtotal = booking.subtotal || (pricePerDay * daysCount * membersCount);
      const tax = booking.tax || 0;
      const totalAmount = booking.totalAmount || subtotal + tax;
      const specialRequests = booking.notes || 'None';

      const razorpayPaymentId = booking.razorpayPaymentId || transaction?.razorpayPaymentId || 'pay_simulated';
      const razorpayOrderId = booking.razorpayOrderId || transaction?.razorpayOrderId || 'order_simulated';
      const transactionRef = transaction?.transactionId || `TRX-${booking.bookingId.replace(/[^a-zA-Z0-9]/g, '')}`;
      const paymentDateStr = formatDateIST(transaction?.transactionDate || booking.updatedAt || new Date(), true);

      const currentYear = getCurrentISTYear();

      // ==========================================
      // SECTION 1: HEADER & TOP METADATA
      // ==========================================
      let topY = 28;

      // Draw Vista Holidays Logo
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, MARGIN, topY, { width: 145 });
        } catch (imgErr) {
          logger.warn('Failed to embed local logo image:', imgErr.message);
          doc.font(FONT_BOLD).fontSize(20).fillColor('#074984').text('Vista Holidays', MARGIN, topY);
        }
      } else {
        doc.font(FONT_BOLD).fontSize(20).fillColor('#074984').text('Vista Holidays', MARGIN, topY);
      }

      // Tagline under logo
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#475569')
        .text('Travel. Discover. Experience.', MARGIN + 2, topY + 48);

      // Title & Subtitle
      doc.font(FONT_BOLD).fontSize(17).fillColor('#074984')
        .text('TRAVEL BOOKING INVOICE', MARGIN, topY + 62);
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#64748b')
        .text('Explore the World with Vista Holidays', MARGIN, topY + 81);

      // Right Header Metadata Box
      const metaBoxX = 350;
      const metaBoxY = topY + 4;
      const metaBoxWidth = CONTENT_WIDTH - (metaBoxX - MARGIN);
      const metaBoxHeight = 88;

      // Draw subtle background card for metadata
      doc.roundedRect(metaBoxX, metaBoxY, metaBoxWidth, metaBoxHeight, 8)
        .fillAndStroke('#f8fafc', '#e2e8f0');

      const drawMetaRow = (label, value, y, isHighlight = false) => {
        doc.font(FONT_BOLD).fontSize(8).fillColor('#475569').text(label, metaBoxX + 10, y);
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text(':', metaBoxX + 82, y);
        doc.font(isHighlight ? FONT_BOLD : FONT_REGULAR)
          .fontSize(8)
          .fillColor(isHighlight ? '#074984' : '#0f172a')
          .text(value, metaBoxX + 90, y, { width: metaBoxWidth - 98, ellipsis: true });
      };

      drawMetaRow('Invoice Number', invoiceNumber, metaBoxY + 10, true);
      drawMetaRow('Invoice Date', invoiceDateStr, metaBoxY + 28);
      drawMetaRow('Booking ID', bookingId, metaBoxY + 46, true);
      drawMetaRow('Booking Date', bookingDateStr, metaBoxY + 64);

      // ==========================================
      // SECTION 2 & 3: TWO-COLUMN DETAILS
      // ==========================================
      const colGap = 12;
      const colWidth = (CONTENT_WIDTH - colGap) / 2; // ~259.6 pt
      const detailsTopY = 124;
      const detailsHeight = 124;

      // Helper function to draw Section Card with solid blue header
      const drawCardHeader = (x, y, width, title) => {
        doc.roundedRect(x, y, width, detailsHeight, 8).fillAndStroke('#ffffff', '#cbd5e1');
        // Header pill
        doc.roundedRect(x, y, width, 22, 8).fill('#0284c7');
        // Fill lower corners of header to maintain rectangular bottom edge
        doc.rect(x, y + 14, width, 8).fill('#0284c7');
        doc.font(FONT_BOLD).fontSize(9.5).fillColor('#ffffff').text(title, x + 10, y + 6);
      };

      // Helper for key-value inside card
      const drawCardRow = (x, label, value, y, labelWidth = 78) => {
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text(label, x + 10, y);
        doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text(':', x + labelWidth, y);
        doc.font(FONT_BOLD).fontSize(8).fillColor('#0f172a')
          .text(String(value || 'N/A'), x + labelWidth + 8, y, { width: colWidth - labelWidth - 16, ellipsis: true });
      };

      // LEFT COLUMN: Customer / Billing Details
      const leftColX = MARGIN;
      drawCardHeader(leftColX, detailsTopY, colWidth, 'Customer / Billing Details');
      drawCardRow(leftColX, 'Full Name', customerName, detailsTopY + 29);
      drawCardRow(leftColX, 'Email', customerEmail, detailsTopY + 46);
      drawCardRow(leftColX, 'Mobile', customerMobile, detailsTopY + 63);
      drawCardRow(leftColX, 'Billing Address', billingAddress, detailsTopY + 80);
      drawCardRow(leftColX, 'Country', customerCountry, detailsTopY + 105);

      // RIGHT COLUMN: Travel / Booking Details
      const rightColX = MARGIN + colWidth + colGap;
      drawCardHeader(rightColX, detailsTopY, colWidth, 'Travel / Booking Details');
      drawCardRow(rightColX, 'Destination', destinationName, detailsTopY + 29, 88);
      drawCardRow(rightColX, 'Country', destinationCountry || 'International', detailsTopY + 44, 88);
      drawCardRow(rightColX, 'Package', packageName, detailsTopY + 59, 88);
      drawCardRow(rightColX, 'Package Type', packageType, detailsTopY + 74, 88);
      drawCardRow(rightColX, 'Check-in Date', checkInDateStr, detailsTopY + 89, 88);
      drawCardRow(rightColX, 'Duration / Travelers', `${daysCount} Days  •  ${membersCount} Travelers`, detailsTopY + 104, 88);

      // ==========================================
      // SECTION 4: PRICE BREAKDOWN TABLE
      // ==========================================
      const tableTopY = detailsTopY + detailsHeight + 10; // 258
      const tableHeaderHeight = 20;

      // Table Header Card Bar
      doc.roundedRect(MARGIN, tableTopY, CONTENT_WIDTH, 20, 6).fill('#0284c7');
      doc.font(FONT_BOLD).fontSize(9.5).fillColor('#ffffff').text('Price Breakdown', MARGIN + 10, tableTopY + 5);

      // Column definitions
      const colNumW = 28;
      const colDescW = 190;
      const colQtyW = 120;
      const colRateW = 85;
      const colAmtW = CONTENT_WIDTH - (colNumW + colDescW + colQtyW + colRateW); // ~108 pt

      const thX1 = MARGIN;
      const thX2 = thX1 + colNumW;
      const thX3 = thX2 + colDescW;
      const thX4 = thX3 + colQtyW;
      const thX5 = thX4 + colRateW;

      const theadY = tableTopY + 23;
      doc.rect(MARGIN, theadY, CONTENT_WIDTH, 17).fill('#f1f5f9');
      doc.rect(MARGIN, theadY, CONTENT_WIDTH, 17).stroke('#cbd5e1');

      doc.font(FONT_BOLD).fontSize(8).fillColor('#334155');
      doc.text('#', thX1 + 8, theadY + 4);
      doc.text('Description', thX2 + 8, theadY + 4);
      doc.text('Qty', thX3 + 8, theadY + 4, { align: 'center', width: colQtyW - 16 });
      doc.text('Rate (INR)', thX4 + 8, theadY + 4, { align: 'right', width: colRateW - 16 });
      doc.text('Amount (INR)', thX5 + 8, theadY + 4, { align: 'right', width: colAmtW - 16 });

      // Table Row 1 (Item)
      const row1Y = theadY + 17;
      const row1H = 22;
      doc.rect(MARGIN, row1Y, CONTENT_WIDTH, row1H).fillAndStroke('#ffffff', '#e2e8f0');

      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#0f172a');
      doc.text('1', thX1 + 8, row1Y + 6);
      doc.font(FONT_BOLD).text(`${packageName} (Per Day)`, thX2 + 8, row1Y + 6, { width: colDescW - 12, ellipsis: true });
      doc.font(FONT_REGULAR).text(`${daysCount} Days × ${membersCount} Members`, thX3 + 8, row1Y + 6, { align: 'center', width: colQtyW - 16 });
      doc.text(formatINR(pricePerDay), thX4 + 8, row1Y + 6, { align: 'right', width: colRateW - 16 });
      doc.font(FONT_BOLD).text(formatINR(subtotal), thX5 + 8, row1Y + 6, { align: 'right', width: colAmtW - 16 });

      // Summary Box & Left Explanatory Note
      const summaryY = row1Y + row1H;
      const summaryTableW = 210;
      const summaryTableX = MARGIN + CONTENT_WIDTH - summaryTableW;

      // Note on left side
      const noteY = summaryY + 8;
      doc.font(FONT_BOLD).fontSize(7.5).fillColor('#64748b')
        .text('Formula: Total = Price Per Day × Days × Members', MARGIN + 6, noteY);
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor('#94a3b8')
        .text('All taxes and standard service fees are included in the final amount.', MARGIN + 6, noteY + 12);
      if (specialRequests && specialRequests !== 'None') {
        doc.font(FONT_REGULAR).fontSize(7.5).fillColor('#64748b')
          .text(`Special Note: ${specialRequests}`, MARGIN + 6, noteY + 24, { width: summaryTableX - MARGIN - 20, ellipsis: true });
      }

      // Summary Rows on right side
      const drawSummaryRow = (label, value, y, isGreen = false) => {
        if (isGreen) {
          doc.rect(summaryTableX, y, summaryTableW, 20).fill('#dcfce7');
          doc.rect(summaryTableX, y, summaryTableW, 20).stroke('#86efac');
          doc.font(FONT_BOLD).fontSize(9.5).fillColor('#15803d').text(label, summaryTableX + 8, y + 5);
          doc.font(FONT_BOLD).fontSize(10).fillColor('#15803d').text(value, summaryTableX + 8, y + 5, { align: 'right', width: summaryTableW - 16 });
        } else {
          doc.rect(summaryTableX, y, summaryTableW, 16).fillAndStroke('#ffffff', '#e2e8f0');
          doc.font(FONT_REGULAR).fontSize(8).fillColor('#475569').text(label, summaryTableX + 8, y + 4);
          doc.font(FONT_BOLD).fontSize(8).fillColor('#0f172a').text(value, summaryTableX + 8, y + 4, { align: 'right', width: summaryTableW - 16 });
        }
      };

      drawSummaryRow('Subtotal', formatINR(subtotal), summaryY);
      drawSummaryRow('Discount', '₹0', summaryY + 16);
      drawSummaryRow('Taxes & Fees', tax > 0 ? formatINR(tax) : '₹0 (Included)', summaryY + 32);
      drawSummaryRow('Grand Total', formatINR(totalAmount), summaryY + 48, true);

      // ==========================================
      // SECTION 5, 6, 7: PAYMENT DETAILS & STATUS
      // ==========================================
      const midY = summaryY + 74; // ~396
      const midHeight = 126;

      // LEFT: Payment Details Card
      drawCardHeader(leftColX, midY, colWidth, 'Payment Details');
      
      // Payment Status with Pill Badge
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text('Payment Status', leftColX + 10, midY + 27);
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text(':', leftColX + 90, midY + 27);
      doc.roundedRect(leftColX + 98, midY + 25, 42, 13, 6).fill('#16a34a');
      doc.font(FONT_BOLD).fontSize(7.5).fillColor('#ffffff').text('Paid', leftColX + 98, midY + 27.5, { align: 'center', width: 42 });

      drawCardRow(leftColX, 'Payment Method', 'Razorpay (UPI/Cards/NetBanking)', midY + 41, 90);
      drawCardRow(leftColX, 'Currency', 'INR (₹)', midY + 54, 90);
      drawCardRow(leftColX, 'Amount Paid', formatINR(totalAmount), midY + 67, 90);
      drawCardRow(leftColX, 'Payment Date', paymentDateStr, midY + 80, 90);
      drawCardRow(leftColX, 'Razorpay Payment ID', razorpayPaymentId, midY + 93, 90);
      drawCardRow(leftColX, 'Transaction Ref', transactionRef, midY + 106, 90);

      // RIGHT TOP: Booking Status Card
      const rightTopY = midY;
      const rightTopH = 52;
      doc.roundedRect(rightColX, rightTopY, colWidth, rightTopH, 8).fillAndStroke('#ffffff', '#cbd5e1');
      doc.roundedRect(rightColX, rightTopY, colWidth, 18, 8).fill('#0284c7');
      doc.rect(rightColX, rightTopY + 10, colWidth, 8).fill('#0284c7');
      doc.font(FONT_BOLD).fontSize(8.5).fillColor('#ffffff').text('Booking Status', rightColX + 10, rightTopY + 5);

      // Confirmed Badge
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text('Booking Status', rightColX + 10, rightTopY + 23);
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text(':', rightColX + 90, rightTopY + 23);
      doc.roundedRect(rightColX + 98, rightTopY + 21, 62, 13, 6).fill('#dcfce7');
      doc.rect(rightColX + 98, rightTopY + 21, 62, 13).stroke('#86efac');
      doc.font(FONT_BOLD).fontSize(7.5).fillColor('#15803d').text('✓ Confirmed', rightColX + 98, rightTopY + 23.5, { align: 'center', width: 62 });

      // Paid Badge
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text('Payment State', rightColX + 10, rightTopY + 37);
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b').text(':', rightColX + 90, rightTopY + 37);
      doc.roundedRect(rightColX + 98, rightTopY + 35, 42, 13, 6).fill('#dcfce7');
      doc.rect(rightColX + 98, rightTopY + 35, 42, 13).stroke('#86efac');
      doc.font(FONT_BOLD).fontSize(7.5).fillColor('#15803d').text('Paid', rightColX + 98, rightTopY + 37.5, { align: 'center', width: 42 });

      // RIGHT BOTTOM: Invoice / Business Information
      const rightBottomY = rightTopY + rightTopH + 8;
      const rightBottomH = 66;
      doc.roundedRect(rightColX, rightBottomY, colWidth, rightBottomH, 8).fillAndStroke('#ffffff', '#cbd5e1');
      doc.roundedRect(rightColX, rightBottomY, colWidth, 18, 8).fill('#0284c7');
      doc.rect(rightColX, rightBottomY + 10, colWidth, 8).fill('#0284c7');
      doc.font(FONT_BOLD).fontSize(8.5).fillColor('#ffffff').text('Invoice / Business Information', rightColX + 10, rightBottomY + 5);

      drawCardRow(rightColX, 'Generated At', generatedDateTimeStr, rightBottomY + 22, 88);
      drawCardRow(rightColX, 'Timezone', 'Asia/Kolkata (IST)', rightBottomY + 34, 88);
      drawCardRow(rightColX, 'Support Email', 'no-reply-travelbooking@outlook.com', rightBottomY + 46, 88);
      drawCardRow(rightColX, 'Contact Page', 'https://vistaholidays.com/contact', rightBottomY + 56, 88);

      // ==========================================
      // SECTION 8 & 9: IMPORTANT NOTES & SECURITY NOTICE
      // ==========================================
      const bottomBoxY = midY + midHeight + 10; // ~532
      const bottomBoxHeight = 88;

      // LEFT: Important Notes (Warm Gold/Amber Card)
      doc.roundedRect(leftColX, bottomBoxY, colWidth, bottomBoxHeight, 8).fillAndStroke('#fffbeb', '#fef3c7');
      doc.font(FONT_BOLD).fontSize(8.5).fillColor('#92400e').text('Important Notes', leftColX + 10, bottomBoxY + 8);

      const notes = [
        'This invoice confirms the successful payment for your Vista Holidays booking.',
        'Booking details are based on the authoritative confirmed database record.',
        'Please retain this invoice PDF as official proof of payment and reservation.',
        'For cancellations, support, or itinerary updates, refer to our contact page.'
      ];

      let noteItemY = bottomBoxY + 22;
      for (const n of notes) {
        doc.font(FONT_BOLD).fontSize(7).fillColor('#b45309').text('•', leftColX + 10, noteItemY);
        doc.font(FONT_REGULAR).fontSize(7).fillColor('#78350f').text(n, leftColX + 18, noteItemY, { width: colWidth - 26 });
        noteItemY += 15;
      }

      // RIGHT: Security Notice (Subtle Red / Security Card)
      doc.roundedRect(rightColX, bottomBoxY, colWidth, bottomBoxHeight, 8).fillAndStroke('#fef2f2', '#fecaca');
      doc.font(FONT_BOLD).fontSize(8.5).fillColor('#991b1b').text('Security Notice', rightColX + 10, bottomBoxY + 8);

      const securityText = 'Vista Holidays will NEVER ask you to share your account password, OTP, banking details, card CVV/PIN, or request direct money transfers through email. Please stay vigilant and report any suspicious communication immediately to our official support team at no-reply-travelbooking@outlook.com.';
      doc.font(FONT_REGULAR).fontSize(7.2).fillColor('#7f1d1d')
        .text(securityText, rightColX + 10, bottomBoxY + 23, { width: colWidth - 20, lineGap: 1.5 });

      // ==========================================
      // SECTION 10: FOOTER
      // ==========================================
      const footerY = bottomBoxY + bottomBoxHeight + 12; // ~632

      // Divider line
      doc.moveTo(MARGIN, footerY).lineTo(MARGIN + CONTENT_WIDTH, footerY).strokeColor('#e2e8f0').lineWidth(0.75).stroke();

      // Centered branded signature
      doc.font(FONT_BOLD).fontSize(10).fillColor('#074984')
        .text('Thank You for Choosing Vista Holidays! ❤️', MARGIN, footerY + 8, { align: 'center', width: CONTENT_WIDTH });

      doc.font(FONT_REGULAR).fontSize(8).fillColor('#64748b')
        .text('🌍 Travel. Discover. Experience.   •   Thanks & Regards, Vista Holidays Team', MARGIN, footerY + 21, { align: 'center', width: CONTENT_WIDTH });

      doc.font(FONT_REGULAR).fontSize(7.5).fillColor('#94a3b8')
        .text(`© ${currentYear} Vista Holidays. All Rights Reserved.   •   This invoice is intended for ${customerEmail}`, MARGIN, footerY + 33, { align: 'center', width: CONTENT_WIDTH });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

export default {
  generateInvoicePdf
};
