/**
 * bookingController.js
 * 
 * Central controller for Vista Holidays booking operations,
 * authoritative price recalculation, Razorpay order generation,
 * secure payment verification, and user booking retrieval.
 */

import Booking from '../models/Booking.js';
import Transaction from '../models/Transaction.js';
import BookingCounter from '../models/BookingCounter.js';
import { calculateBookingPrice } from '../config/destinationPackages.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature
} from '../services/razorpayService.js';
import emailService from '../services/emailService.js';
import invoiceService from '../services/invoiceService.js';
import logger from '../utils/logger.js';
import config from '../config/environment.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';

/**
 * 1. Create Checkout & Razorpay Order
 * POST /api/bookings/checkout
 */
export const createCheckoutOrder = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const {
      destinationId,
      destinationName,
      country,
      checkInDate,
      packageId = 'standard',
      days = 1,
      members = 1,
      mobile
    } = req.body;

    if (!destinationId || typeof destinationId !== 'string' || !destinationId.trim()) {
      return errorResponse(res, 'Valid destination identifier is required.', null, 400);
    }

    const safeDays = parseInt(days, 10);
    const safeMembers = parseInt(members, 10);

    if (isNaN(safeDays) || safeDays < 1) {
      return errorResponse(res, 'Stay duration must be at least 1 day.', null, 400);
    }

    if (isNaN(safeMembers) || safeMembers < 1) {
      return errorResponse(res, 'Number of travelers must be at least 1.', null, 400);
    }

    const userMobile = (mobile && String(mobile).trim()) || req.user.mobile;
    if (!userMobile) {
      return errorResponse(res, 'A valid contact phone number is required for booking.', null, 400);
    }

    // Authoritative pricing calculation: NEVER trust client amount
    const pricing = calculateBookingPrice({
      destinationId: destinationId.trim(),
      packageId: packageId.trim(),
      days: safeDays,
      members: safeMembers
    });

    // Generate atomic, sequential Booking ID: VISTA-BOOK-YYYYMMDD-0001
    const bookingId = await BookingCounter.getNextBookingId();

    // Create Razorpay Order
    const rzpOrder = await createRazorpayOrder({
      amountInRupees: pricing.totalAmount,
      currency: pricing.currency,
      receipt: bookingId,
      notes: {
        destinationId: destinationId.trim(),
        destinationName: destinationName || destinationId,
        packageName: pricing.packageName,
        userId: req.user._id.toString()
      }
    });

    // Create Initial Booking Record in pending/created state
    const booking = new Booking({
      bookingId,
      userId: req.user._id,
      userName: req.user.name,
      email: req.user.email,
      mobile: userMobile,
      destinationId: destinationId.trim(),
      destinationName: destinationName || destinationId,
      country: country ? String(country).trim() : '',
      checkInDate: checkInDate ? new Date(checkInDate) : null,
      packageId: pricing.packageId,
      packageName: pricing.packageName,
      pricePerDay: pricing.pricePerDay,
      days: pricing.days,
      members: pricing.members,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      totalAmount: pricing.totalAmount,
      currency: pricing.currency,
      bookingStatus: 'pending',
      paymentStatus: 'created',
      razorpayOrderId: rzpOrder.id
    });

    await booking.save();

    logger.info(`Checkout created successfully for booking ${bookingId}: ₹${pricing.totalAmount}`);

    return successResponse(res, 'Checkout session created successfully.', {
      bookingId,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount, // in paise
      currency: rzpOrder.currency,
      keyId: config.razorpay.keyId || 'rzp_test_simulation',
      pricePerDay: pricing.pricePerDay,
      days: pricing.days,
      members: pricing.members,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      totalAmount: pricing.totalAmount,
      packageName: pricing.packageName,
      destinationName: destinationName || destinationId,
      country: booking.country,
      checkInDate: booking.checkInDate,
      isSimulated: rzpOrder.isSimulated || false
    }, 201);
  } catch (error) {
    logger.error('Checkout creation error:', error.message);
    return errorResponse(res, 'Unable to create checkout session. Please try again.', error.message, 500);
  }
};

/**
 * 2. Verify Razorpay Payment and Confirm Booking
 * POST /api/bookings/verify-payment
 */
export const verifyPayment = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const {
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    if (!bookingId || !razorpayOrderId || !razorpayPaymentId) {
      return errorResponse(res, 'Missing payment verification parameters.', null, 400);
    }

    // Lookup booking record
    const booking = await Booking.findOne({ bookingId: bookingId.trim() });
    if (!booking) {
      return errorResponse(res, 'Booking reference not found.', null, 404);
    }

    // Ownership check: User cannot verify someone else's booking
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'You are not authorized to verify this booking.', null, 403);
    }

    // Idempotency: If already confirmed and paid, return existing confirmed booking without duplicates
    if (booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'paid') {
      logger.info(`Idempotent payment callback received for already confirmed booking: ${booking.bookingId}`);
      return successResponse(res, 'Booking is already confirmed.', booking);
    }

    // Verify cryptographic Razorpay signature server-side
    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isValid) {
      booking.paymentStatus = 'failed';
      await booking.save();
      logger.error(`Payment signature verification failed for booking: ${bookingId}`);
      return errorResponse(res, 'Payment verification failed. Invalid signature.', null, 400);
    }

    // Mark booking as confirmed and paid
    booking.bookingStatus = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.razorpayPaymentId = razorpayPaymentId;
    booking.razorpaySignature = razorpaySignature || 'verified_sim';
    await booking.save();

    // Create Transaction Record
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const transaction = new Transaction({
      transactionId,
      bookingId: booking.bookingId,
      userId: booking.userId,
      userName: booking.userName,
      email: booking.email,
      destination: booking.destinationName,
      country: booking.country,
      checkInDate: booking.checkInDate,
      package: booking.packageName,
      days: booking.days,
      members: booking.members,
      amount: booking.totalAmount,
      currency: booking.currency,
      razorpayOrderId: booking.razorpayOrderId,
      razorpayPaymentId,
      paymentStatus: 'paid',
      transactionDate: new Date()
    });

    await transaction.save();
    logger.info(`Transaction ${transactionId} recorded for booking ${booking.bookingId}`);

    // Generate or retrieve authoritative Invoice (Feature: Complete Invoice System)
    let invoiceData = null;
    try {
      invoiceData = await invoiceService.getOrCreateInvoiceForBooking(booking, { transactionId });
    } catch (invoiceErr) {
      logger.error(`Invoice processing failed for booking ${booking.bookingId}:`, invoiceErr.message);
    }

    const emailAttachments = [];
    if (invoiceData?.pdfBuffer && invoiceData?.invoice?.invoiceNumber) {
      emailAttachments.push({
        filename: `Vista-Holidays-Invoice-${invoiceData.invoice.invoiceNumber}.pdf`,
        content: invoiceData.pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    // Send Booking Confirmation Email to User with Invoice attached
    let userEmailFailed = false;
    try {
      await emailService.sendBookingConfirmationEmail({
        toEmail: booking.email,
        userName: booking.userName,
        bookingId: booking.bookingId,
        destinationName: booking.destinationName,
        country: booking.country,
        packageName: booking.packageName,
        checkInDate: booking.checkInDate,
        stayDuration: booking.days,
        members: booking.members,
        pricePerDay: booking.pricePerDay,
        subtotal: booking.subtotal,
        tax: booking.tax,
        totalAmount: booking.totalAmount,
        paymentStatus: 'Paid',
        razorpayPaymentId,
        bookingDate: booking.createdAt,
        attachments: emailAttachments
      });
    } catch (emailErr) {
      userEmailFailed = true;
      logger.error(`Failed to send user confirmation email for ${booking.bookingId}:`, emailErr.message);
    }

    // Send Admin Notification Email (Feature 11)
    try {
      await emailService.sendAdminBookingNotification({
        bookingId: booking.bookingId,
        userName: booking.userName,
        email: booking.email,
        mobile: booking.mobile,
        destinationName: booking.destinationName,
        country: booking.country,
        packageName: booking.packageName,
        pricePerDay: booking.pricePerDay,
        checkInDate: booking.checkInDate,
        days: booking.days,
        members: booking.members,
        subtotal: booking.subtotal,
        tax: booking.tax,
        totalAmount: booking.totalAmount,
        paymentStatus: 'Paid',
        razorpayOrderId: booking.razorpayOrderId,
        razorpayPaymentId,
        bookingDate: booking.createdAt
      });
    } catch (adminEmailErr) {
      logger.error(`Failed to send admin notification email for ${booking.bookingId}:`, adminEmailErr.message);
    }

    return successResponse(res, 'Payment verified and booking confirmed! 🎉', {
      booking,
      transactionId,
      userEmailFailed
    });
  } catch (error) {
    logger.error('Payment verification error:', error.message);
    return errorResponse(res, 'Payment verification failed. Please try again.', error.message, 500);
  }
};

/**
 * 3. Get Authenticated User's Bookings
 * GET /api/bookings/my
 */
export const getMyBookings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { status = 'all' } = req.query;

    const filter = { userId: req.user._id };
    if (status && status !== 'all') {
      filter.bookingStatus = status.toLowerCase();
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });

    return successResponse(res, 'Bookings retrieved successfully.', {
      count: bookings.length,
      bookings
    });
  } catch (error) {
    logger.error('Get my bookings error:', error.message);
    return errorResponse(res, 'Unable to load bookings.', error.message, 500);
  }
};

/**
 * 4. Get Single Booking by ID
 * GET /api/bookings/:bookingId
 */
export const getBookingById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId: bookingId.trim() });
    if (!booking) {
      return errorResponse(res, 'Booking not found.', null, 404);
    }

    // Protection: Only the booking owner or an admin can access
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return errorResponse(res, 'You are not authorized to view this booking.', null, 403);
    }

    return successResponse(res, 'Booking details retrieved.', booking);
  } catch (error) {
    logger.error('Get booking by ID error:', error.message);
    return errorResponse(res, 'Unable to load booking details.', error.message, 500);
  }
};

/**
 * 5. Handle Razorpay Webhooks (Server-to-Server Event Capture)
 * POST /api/bookings/webhook
 */
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!signature) {
      logger.warn('Razorpay webhook received without x-razorpay-signature header');
      return res.status(400).json({ error: 'Signature header missing' });
    }

    const isValid = verifyRazorpayWebhookSignature({ rawBody, signature });
    if (!isValid) {
      logger.error('Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    logger.info(`Received Razorpay webhook event: ${event}`);

    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity || {};
      const orderEntity = payload?.order?.entity || {};

      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;
      const receipt = orderEntity.receipt || paymentEntity.notes?.bookingId;

      const query = razorpayOrderId
        ? { razorpayOrderId }
        : { bookingId: receipt };

      const booking = await Booking.findOne(query);
      if (!booking) {
        logger.warn(`Webhook: Booking not found for orderId: ${razorpayOrderId}, receipt: ${receipt}`);
        return res.status(200).json({ status: 'ignored', reason: 'Booking not found' });
      }

      // If already confirmed and paid, acknowledge immediately
      if (booking.bookingStatus === 'confirmed' && booking.paymentStatus === 'paid') {
        logger.info(`Webhook: Booking ${booking.bookingId} is already confirmed and paid.`);
        return res.status(200).json({ status: 'ok', alreadyProcessed: true });
      }

      // Mark confirmed & paid
      booking.bookingStatus = 'confirmed';
      booking.paymentStatus = 'paid';
      if (razorpayPaymentId) {
        booking.razorpayPaymentId = razorpayPaymentId;
      }
      await booking.save();

      // Ensure transaction record exists
      let transaction = await Transaction.findOne({ bookingId: booking.bookingId });
      if (!transaction) {
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        transaction = new Transaction({
          transactionId,
          bookingId: booking.bookingId,
          userId: booking.userId,
          userName: booking.userName,
          email: booking.email,
          destination: booking.destinationName,
          country: booking.country,
          checkInDate: booking.checkInDate,
          package: booking.packageName,
          days: booking.days,
          members: booking.members,
          amount: booking.totalAmount,
          currency: booking.currency,
          razorpayOrderId: booking.razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId || booking.razorpayOrderId,
          paymentStatus: 'paid',
          transactionDate: new Date()
        });
        await transaction.save();
      } else if (transaction.paymentStatus !== 'paid') {
        transaction.paymentStatus = 'paid';
        if (booking.country) transaction.country = booking.country;
        if (booking.checkInDate) transaction.checkInDate = booking.checkInDate;
        if (razorpayPaymentId) transaction.razorpayPaymentId = razorpayPaymentId;
        await transaction.save();
      }

      // Asynchronously send emails with attached invoice without blocking webhook response
      try {
        let webhookInvoiceData = null;
        try {
          webhookInvoiceData = await invoiceService.getOrCreateInvoiceForBooking(booking);
        } catch (invErr) {
          logger.error(`Webhook: Invoice generation failed for ${booking.bookingId}:`, invErr.message);
        }

        const webhookAttachments = [];
        if (webhookInvoiceData?.pdfBuffer && webhookInvoiceData?.invoice?.invoiceNumber) {
          webhookAttachments.push({
            filename: `Vista-Holidays-Invoice-${webhookInvoiceData.invoice.invoiceNumber}.pdf`,
            content: webhookInvoiceData.pdfBuffer,
            contentType: 'application/pdf'
          });
        }

        await emailService.sendBookingConfirmationEmail({
          toEmail: booking.email,
          userName: booking.userName,
          bookingId: booking.bookingId,
          destinationName: booking.destinationName,
          country: booking.country,
          packageName: booking.packageName,
          checkInDate: booking.checkInDate,
          stayDuration: booking.days,
          members: booking.members,
          pricePerDay: booking.pricePerDay,
          subtotal: booking.subtotal,
          tax: booking.tax,
          totalAmount: booking.totalAmount,
          paymentStatus: 'Paid',
          razorpayPaymentId: razorpayPaymentId || booking.razorpayOrderId,
          bookingUrl: `${config.clientUrl?.split(',')[0] || 'https://vista-holidays-frontend.vercel.app'}/users/bookings`,
          attachments: webhookAttachments
        });
      } catch (err) {
        logger.error('Webhook confirmation email failed:', err.message);
      }

      return res.status(200).json({ status: 'ok', message: 'Booking confirmed via webhook' });
    }

    if (event === 'payment.failed') {
      const paymentEntity = payload?.payment?.entity || {};
      const razorpayOrderId = paymentEntity.order_id;
      if (razorpayOrderId) {
        const booking = await Booking.findOne({ razorpayOrderId });
        if (booking && booking.bookingStatus !== 'confirmed') {
          booking.paymentStatus = 'failed';
          await booking.save();
        }
      }
      return res.status(200).json({ status: 'ok', message: 'Payment failure recorded' });
    }

    return res.status(200).json({ status: 'ignored', event });
  } catch (error) {
    logger.error('Razorpay webhook processing error:', error.message);
    return res.status(500).json({ error: 'Webhook processing error' });
  }
};

/**
 * 6. Secure Invoice Download
 * GET /api/bookings/:bookingId/invoice
 * 
 * Authenticates user, verifies ownership or admin role, checks booking eligibility,
 * retrieves/creates authoritative invoice, and streams stored PDF.
 */
export const downloadInvoice = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { bookingId } = req.params;
    if (!bookingId || typeof bookingId !== 'string' || !bookingId.trim()) {
      return errorResponse(res, 'A valid booking ID is required.', null, 400);
    }

    const booking = await Booking.findOne({ bookingId: bookingId.trim() });
    if (!booking) {
      return errorResponse(res, 'Booking reference not found.', null, 404);
    }

    // Protection: User can only download their own invoice, unless admin
    if (booking.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn(`Unauthorized invoice download attempt for booking ${booking.bookingId} by user ${req.user._id}`);
      return errorResponse(res, 'You are not authorized to download this invoice.', null, 403);
    }

    // Eligibility check: Only paid and confirmed bookings receive an invoice
    if (booking.bookingStatus !== 'confirmed' || booking.paymentStatus !== 'paid') {
      return errorResponse(res, 'Invoice is only available for confirmed and paid bookings.', null, 400);
    }

    // Retrieve or create authoritative invoice (Idempotent)
    const invoiceResult = await invoiceService.getOrCreateInvoiceForBooking(booking);
    const invoice = invoiceResult.invoice;
    const pdfBuffer = invoiceResult.pdfBuffer;

    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      return errorResponse(res, 'Unable to retrieve invoice PDF document.', null, 500);
    }

    const filename = `Vista-Holidays-Invoice-${invoice.invoiceNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    logger.error('Download invoice error:', error.message);
    return errorResponse(res, 'Unable to download invoice. Please try again later.', error.message, 500);
  }
};

export default {
  createCheckoutOrder,
  verifyPayment,
  getMyBookings,
  getBookingById,
  handleRazorpayWebhook,
  downloadInvoice
};


