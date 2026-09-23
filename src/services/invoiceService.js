/**
 * invoiceService.js
 * 
 * Central business service for Vista Holidays invoice operations.
 * Handles atomic sequential invoice numbering, authoritative PDF generation,
 * secure Cloudinary storage, idempotency protection against duplicate generation,
 * and reliable PDF retrieval for emails and authenticated downloads.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Invoice from '../models/Invoice.js';
import InvoiceCounter from '../models/InvoiceCounter.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { generateInvoicePdf } from './invoicePdfGenerator.js';
import { isCloudinaryConfigured, uploadPdfBuffer } from './cloudinaryService.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Local fallback storage directory for development or when Cloudinary is not configured
const localUploadsDir = path.resolve(__dirname, '../../uploads/invoices');
if (!fs.existsSync(localUploadsDir)) {
  try {
    fs.mkdirSync(localUploadsDir, { recursive: true });
  } catch (err) {
    // Ignore directory creation error in read-only environments
  }
}

/**
 * Ensures an invoice exists for a confirmed/paid booking.
 * Strictly idempotent: If an invoice already exists for the bookingId,
 * it returns the existing stored invoice and NEVER generates a duplicate.
 * 
 * @param {object} booking - Booking document from MongoDB
 * @param {object} [options]
 * @param {string} [options.transactionId] - Optional transaction ID
 * @returns {Promise<{ invoice: object, pdfBuffer: Buffer, isNew: boolean }>}
 */
export const getOrCreateInvoiceForBooking = async (booking, options = {}) => {
  if (!booking || !booking.bookingId) {
    throw new Error('Valid booking document with bookingId is required.');
  }

  // 1. Idempotency Check: Look for an existing invoice record in DB
  const existingInvoice = await Invoice.findOne({ bookingId: booking.bookingId });
  if (existingInvoice) {
    logger.info(`[InvoiceService] Reusing existing invoice ${existingInvoice.invoiceNumber} for booking ${booking.bookingId}`);
    
    // Retrieve buffer for attachment/download
    let pdfBuffer = null;
    try {
      pdfBuffer = await getInvoicePdfBuffer(existingInvoice, booking);
    } catch (bufErr) {
      logger.warn(`[InvoiceService] Could not retrieve existing PDF buffer, regenerating: ${bufErr.message}`);
      // Fallback: regenerate buffer dynamically from authoritative booking data
      pdfBuffer = await generateInvoicePdf({ booking, invoice: existingInvoice });
    }

    return {
      invoice: existingInvoice,
      pdfBuffer,
      isNew: false
    };
  }

  // 2. Lookup related User and Transaction records if available
  let user = null;
  if (booking.userId) {
    try {
      user = await User.findById(booking.userId);
    } catch (uErr) {
      logger.warn(`[InvoiceService] Could not load user for invoice: ${uErr.message}`);
    }
  }

  let transaction = null;
  try {
    transaction = await Transaction.findOne({ bookingId: booking.bookingId });
  } catch (tErr) {
    logger.warn(`[InvoiceService] Could not load transaction for invoice: ${tErr.message}`);
  }

  // 3. Generate atomic, unique, sequential Invoice Number
  const invoiceNumber = await InvoiceCounter.getNextInvoiceNumber();
  const generatedAt = new Date();

  // Create temporary in-memory invoice object for PDF generator
  const invoiceObj = {
    invoiceNumber,
    bookingId: booking.bookingId,
    generatedAt
  };

  // 4. Generate authoritative server-side PDF buffer
  const pdfBuffer = await generateInvoicePdf({
    booking,
    invoice: invoiceObj,
    user,
    transaction
  });

  const filename = `Vista-Holidays-Invoice-${invoiceNumber}.pdf`;
  let invoicePdfUrl = '';
  let invoicePdfPublicId = null;

  // 5. Store PDF securely in Cloudinary (or local fallback in development)
  if (isCloudinaryConfigured()) {
    try {
      const uploadResult = await uploadPdfBuffer(pdfBuffer, filename, 'vista-holidays/invoices');
      invoicePdfUrl = uploadResult.secureUrl;
      invoicePdfPublicId = uploadResult.publicId;
      logger.info(`[InvoiceService] Uploaded invoice PDF to Cloudinary: ${invoicePdfUrl}`);
    } catch (uploadErr) {
      logger.error(`[InvoiceService] Cloudinary upload failed, using local storage fallback: ${uploadErr.message}`);
    }
  }

  // If Cloudinary wasn't configured or failed, save locally in dev storage
  if (!invoicePdfUrl) {
    const localFilePath = path.join(localUploadsDir, filename);
    try {
      fs.writeFileSync(localFilePath, pdfBuffer);
      invoicePdfUrl = `/uploads/invoices/${filename}`;
      logger.info(`[InvoiceService] Saved invoice PDF locally to: ${localFilePath}`);
    } catch (writeErr) {
      logger.error(`[InvoiceService] Failed to write local fallback PDF: ${writeErr.message}`);
      invoicePdfUrl = `/api/bookings/${encodeURIComponent(booking.bookingId)}/invoice`;
    }
  }

  // 6. Persist Invoice document in MongoDB
  const newInvoice = new Invoice({
    invoiceNumber,
    bookingId: booking.bookingId,
    bookingObjectId: booking._id || null,
    userId: booking.userId,
    userName: booking.userName,
    userEmail: booking.email,
    invoicePdfUrl,
    invoicePdfPublicId,
    paymentReference: booking.razorpayPaymentId || transaction?.transactionId || options.transactionId || null,
    totalAmount: booking.totalAmount,
    currency: booking.currency || 'INR',
    generatedAt
  });

  await newInvoice.save();

  // 7. Update booking document with invoice reference
  try {
    booking.invoiceNumber = invoiceNumber;
    booking.invoicePdfUrl = invoicePdfUrl;
    await booking.save();
  } catch (bookingSaveErr) {
    logger.warn(`[InvoiceService] Could not update booking with invoice details: ${bookingSaveErr.message}`);
  }

  logger.info(`[InvoiceService] Successfully generated and stored invoice ${invoiceNumber} for booking ${booking.bookingId}`);

  return {
    invoice: newInvoice,
    pdfBuffer,
    isNew: true
  };
};

/**
 * Retrieve the PDF Buffer for a given Invoice record
 * @param {object} invoice 
 * @param {object} booking 
 * @returns {Promise<Buffer>}
 */
export const getInvoicePdfBuffer = async (invoice, booking) => {
  const filename = `Vista-Holidays-Invoice-${invoice.invoiceNumber}.pdf`;
  const localFilePath = path.join(localUploadsDir, filename);

  // 1. Check local filesystem cache first
  if (fs.existsSync(localFilePath)) {
    return fs.readFileSync(localFilePath);
  }

  // 2. Fetch from Cloudinary remote URL if available
  if (invoice.invoicePdfUrl && invoice.invoicePdfUrl.startsWith('http')) {
    try {
      const response = await fetch(invoice.invoicePdfUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Cache locally for fast future hits
        try {
          fs.writeFileSync(localFilePath, buffer);
        } catch (_) {}
        return buffer;
      }
    } catch (fetchErr) {
      logger.warn(`[InvoiceService] Failed to fetch invoice PDF from remote URL: ${fetchErr.message}`);
    }
  }

  // 3. Fallback: Regenerate dynamically using authoritative booking data
  let fullBooking = booking;
  if (!fullBooking) {
    fullBooking = await Booking.findOne({ bookingId: invoice.bookingId });
  }

  if (fullBooking) {
    const regenerated = await generateInvoicePdf({ booking: fullBooking, invoice });
    try {
      fs.writeFileSync(localFilePath, regenerated);
    } catch (_) {}
    return regenerated;
  }

  throw new Error(`Cannot retrieve PDF buffer for invoice ${invoice.invoiceNumber}`);
};

/**
 * Retrieve an existing invoice document by booking ID
 * @param {string} bookingId 
 * @returns {Promise<object|null>}
 */
export const getInvoiceByBookingId = async (bookingId) => {
  return Invoice.findOne({ bookingId: bookingId.trim() });
};

export default {
  getOrCreateInvoiceForBooking,
  getInvoicePdfBuffer,
  getInvoiceByBookingId
};
