/**
 * emailService.js
 * 
 * Central Email Service for Vista Holidays.
 * Integrates with Brevo SMTP and leverages the unified branded template system.
 */

import nodemailer from 'nodemailer';
import config from '../config/environment.js';
import logger from '../utils/logger.js';
import { getPrimaryClientUrl } from '../utils/security.js';

import {
  buildVerificationEmail,
  buildWelcomeEmail,
  buildContactConfirmationEmail,
  buildFeedbackConfirmationEmail,
  buildTicketUpdateEmail,
  buildTicketStatusChangeEmail,
  buildContactAdminNotification,
  buildFeedbackAdminNotification,
  buildBookingConfirmationEmail,
  buildBookingAdminNotification
} from './emails/templates/index.js';

let transporter = null;

/**
 * Initialize or get Nodemailer SMTP transporter for Brevo
 */
const getTransporter = () => {
  if (transporter) return transporter;

  const { host, port, user, password } = config.brevo;

  if (!user || !password) {
    logger.warn('Brevo SMTP credentials (BREVO_SMTP_USER, BREVO_SMTP_PASSWORD) are not configured.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587 or other ports
    auth: {
      user,
      pass: password
    },
    tls: {
      rejectUnauthorized: config.nodeEnv === 'production'
    }
  });

  return transporter;
};

/**
 * Generic internal sender with dev fallback simulation
 */
const deliverMail = async ({ to, subject, html, text, logCategory = 'EMAIL' }) => {
  const mailTransporter = getTransporter();

  if (!mailTransporter) {
    logger.warn('------------------------------------------------------------');
    logger.warn(`[DEV SIMULATION ${logCategory}] To: ${to}`);
    logger.warn(`[DEV SIMULATION] Subject: ${subject}`);
    logger.warn(`[DEV SIMULATION] Content excerpt: ${text ? text.substring(0, 200) : ''}...`);
    logger.warn('Configure BREVO_SMTP_USER and BREVO_SMTP_PASSWORD in server/.env for live delivery.');
    logger.warn('------------------------------------------------------------');
    return { sent: false, simulated: true, message: 'SMTP credentials missing; email simulated in development.' };
  }

  const fromAddress = `"${config.brevo.fromName}" <${config.brevo.fromEmail}>`;

  try {
    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html
    });
    logger.info(`[${logCategory}] Sent successfully to ${to}: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[${logCategory}] Failed to send to ${to}: ${error.message}`);
    throw error;
  }
};

/**
 * FEATURE 4: Send user verification email
 */
export const sendVerificationEmail = async ({ toEmail, userName, verificationUrl, expiresHours = 24 }) => {
  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildVerificationEmail({
    toEmail,
    userName,
    verificationUrl,
    expiresHours,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'USER_ACCOUNT_VERIFICATION'
  });
};

/**
 * FEATURE 5: Send user welcome email immediately after successful verification
 */
export const sendWelcomeEmail = async ({ toEmail, userName }) => {
  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildWelcomeEmail({
    toEmail,
    userName,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'USER_WELCOME_AFTER_VERIFICATION'
  });
};

/**
 * FEATURE 6: Send user confirmation email when Contact request is received
 */
export const sendContactConfirmationEmail = async ({
  toEmail,
  userName,
  ticketId,
  queryType,
  message,
  submittedAt
}) => {
  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildContactConfirmationEmail({
    toEmail,
    userName,
    ticketId,
    queryType,
    message,
    submittedAt,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'CONTACT_USER_CONFIRMATION'
  });
};

/**
 * FEATURE 7: Send user confirmation email when Feedback is received
 */
export const sendFeedbackConfirmationEmail = async ({
  toEmail,
  userName,
  ticketId,
  rating,
  answers,
  submittedAt
}) => {
  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildFeedbackConfirmationEmail({
    toEmail,
    userName,
    ticketId,
    rating,
    answers,
    submittedAt,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'FEEDBACK_USER_CONFIRMATION'
  });
};

/**
 * FEATURE 8: Send email when admin updates/messages a ticket
 */
export const sendTicketUpdateEmail = async ({
  toEmail,
  userName,
  ticketId,
  status,
  adminMessage,
  isFeedback = false,
  updatedAt
}) => {
  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildTicketUpdateEmail({
    toEmail,
    userName,
    ticketId,
    status,
    adminMessage,
    isFeedback,
    updatedAt,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'TICKET_ADMIN_MESSAGE_UPDATE'
  });
};

// Backwards compatibility alias
export const sendTicketAdminMessageEmail = sendTicketUpdateEmail;

/**
 * FEATURE 9: Send email when ticket status changes
 */
export const sendStatusChangeEmail = async ({
  toEmail,
  userName,
  ticketId,
  previousStatus,
  newStatus,
  updatedAt
}) => {
  // Prevent duplicate/no-op sends if statuses are identical
  if (previousStatus && newStatus && previousStatus.trim() === newStatus.trim()) {
    logger.info(`Skipping status change email for ticket ${ticketId}: status unchanged (${newStatus}).`);
    return { sent: false, skipped: true };
  }

  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildTicketStatusChangeEmail({
    toEmail,
    userName,
    ticketId,
    previousStatus,
    newStatus,
    updatedAt,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'TICKET_STATUS_CHANGE_UPDATE'
  });
};

// Backwards compatibility alias
export const sendTicketStatusChangeEmail = sendStatusChangeEmail;

/**
 * FEATURE 10: Send admin notification for Contact Request
 */
export const sendAdminContactNotification = async ({
  ticketId,
  name,
  email,
  mobile,
  location,
  queryType,
  message,
  submittedAt,
  termsAccepted
}) => {
  const adminEmail = config.adminNotificationEmail || config.brevo.fromEmail;
  if (!adminEmail) {
    logger.warn('Admin notification email not configured, skipping contact alert.');
    return { sent: false, skipped: true };
  }

  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildContactAdminNotification({
    ticketId,
    name,
    email,
    mobile,
    location,
    queryType,
    message,
    submittedAt,
    termsAccepted,
    clientUrl
  });

  return deliverMail({
    to: adminEmail,
    subject,
    html,
    text,
    logCategory: 'CONTACT_ADMIN_ALERT'
  });
};

// Backwards compatibility alias
export const sendContactAdminNotification = sendAdminContactNotification;

/**
 * FEATURE 10: Send admin notification for User Feedback
 */
export const sendAdminFeedbackNotification = async ({
  ticketId,
  name,
  email,
  mobile,
  rating,
  answers,
  submittedAt
}) => {
  const adminEmail = config.adminNotificationEmail || config.brevo.fromEmail;
  if (!adminEmail) {
    logger.warn('Admin notification email not configured, skipping feedback alert.');
    return { sent: false, skipped: true };
  }

  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildFeedbackAdminNotification({
    ticketId,
    name,
    email,
    mobile,
    rating,
    answers,
    submittedAt,
    clientUrl
  });

  return deliverMail({
    to: adminEmail,
    subject,
    html,
    text,
    logCategory: 'FEEDBACK_ADMIN_ALERT'
  });
};

// Backwards compatibility alias
export const sendFeedbackAdminNotification = sendAdminFeedbackNotification;

/**
 * FEATURE: Send user booking confirmation email
 */
export const sendBookingConfirmationEmail = async ({
  toEmail,
  userName,
  bookingId,
  destinationName,
  packageName,
  stayDuration,
  members,
  pricePerDay,
  subtotal,
  tax = 0,
  totalAmount,
  paymentStatus = 'Paid',
  razorpayPaymentId = '',
  bookingDate = new Date()
}) => {
  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildBookingConfirmationEmail({
    toEmail,
    userName,
    bookingId,
    destinationName,
    packageName,
    stayDuration,
    members,
    pricePerDay,
    subtotal,
    tax,
    totalAmount,
    paymentStatus,
    razorpayPaymentId,
    bookingDate,
    clientUrl
  });

  return deliverMail({
    to: toEmail,
    subject,
    html,
    text,
    logCategory: 'BOOKING_USER_CONFIRMATION'
  });
};

/**
 * FEATURE: Send admin notification for confirmed booking
 */
export const sendAdminBookingNotification = async ({
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
  bookingDate = new Date()
}) => {
  const adminEmail = config.adminNotificationEmail || config.brevo.fromEmail;
  if (!adminEmail) {
    logger.warn('Admin notification email not configured, skipping booking alert.');
    return { sent: false, skipped: true };
  }

  const clientUrl = getPrimaryClientUrl();
  const { subject, html, text } = buildBookingAdminNotification({
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
    tax,
    totalAmount,
    paymentStatus,
    razorpayOrderId,
    razorpayPaymentId,
    bookingDate,
    clientUrl
  });

  return deliverMail({
    to: adminEmail,
    subject,
    html,
    text,
    logCategory: 'BOOKING_ADMIN_ALERT'
  });
};

export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendContactConfirmationEmail,
  sendFeedbackConfirmationEmail,
  sendTicketUpdateEmail,
  sendTicketAdminMessageEmail,
  sendStatusChangeEmail,
  sendTicketStatusChangeEmail,
  sendAdminContactNotification,
  sendContactAdminNotification,
  sendAdminFeedbackNotification,
  sendFeedbackAdminNotification,
  sendBookingConfirmationEmail,
  sendAdminBookingNotification
};

