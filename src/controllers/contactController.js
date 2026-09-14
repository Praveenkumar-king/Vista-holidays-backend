import ContactMessage from '../models/ContactMessage.js';
import TicketCounter from '../models/TicketCounter.js';
import emailService from '../services/emailService.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

const VALID_CONTACT_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

/**
 * Submit Contact Form
 * POST /api/contact
 */
export const submitContact = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is temporarily unavailable. Please try again shortly.', null, 503);
    }

    const {
      firstName,
      lastName,
      email,
      mobile = '',
      country = '',
      state = '',
      city = '',
      queryType,
      message,
      termsAccepted
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !queryType || !message) {
      return errorResponse(res, 'First name, last name, email, query type, and message are required.', null, 400);
    }

    if (termsAccepted !== true && termsAccepted !== 'true') {
      return errorResponse(res, 'You must accept the Terms & Conditions to submit your request.', null, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return errorResponse(res, 'Please provide a valid email address.', null, 400);
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    // Generate unique daily ticket ID on the server (format: Vista-CON-YYYYMMDD-001)
    const ticketId = await TicketCounter.getNextTicketId('CON');

    // Extract client IP safely
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

    // Create ticket document with initial timeline events
    const initialTimeline = [
      {
        type: 'SUBMISSION',
        message: 'Ticket Submitted',
        status: 'Open',
        createdAt: new Date()
      },
      {
        type: 'SYSTEM',
        message: 'Received by Vista Holidays',
        status: 'Open',
        createdAt: new Date(Date.now() + 1000)
      }
    ];

    const contactTicket = new ContactMessage({
      ticketId,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      name: fullName,
      email: normalizedEmail,
      mobile: String(mobile || '').trim(),
      country: String(country || '').trim(),
      state: String(state || '').trim(),
      city: String(city || '').trim(),
      queryType: String(queryType).trim(),
      message: String(message).trim(),
      termsAccepted: true,
      ipAddress,
      status: 'Open',
      messages: [],
      timeline: initialTimeline
    });

    await contactTicket.save();
    logger.info(`New Contact Ticket created: ${ticketId} (${normalizedEmail})`);

    // Asynchronously dispatch Brevo confirmation and admin notification emails
    const locationString = [city, state, country].filter(Boolean).join(', ');
    let emailSent = false;

    try {
      await emailService.sendContactConfirmationEmail({
        toEmail: normalizedEmail,
        userName: fullName,
        ticketId,
        queryType,
        message: contactTicket.message,
        submittedAt: contactTicket.createdAt
      });
      emailSent = true;
    } catch (err) {
      logger.error(`Failed to send user contact confirmation email for ${ticketId}:`, err.message);
    }

    try {
      await emailService.sendContactAdminNotification({
        ticketId,
        name: fullName,
        email: normalizedEmail,
        mobile: contactTicket.mobile,
        location: locationString,
        queryType,
        message: contactTicket.message,
        submittedAt: contactTicket.createdAt,
        termsAccepted: true
      });
    } catch (err) {
      logger.error(`Failed to send admin notification for ${ticketId}:`, err.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Your request has been received.'
        : 'Your request was received successfully, but we could not send the confirmation email right now.',
      emailWarning: !emailSent,
      data: {
        ticketId,
        email: normalizedEmail,
        name: fullName,
        status: 'Open',
        createdAt: contactTicket.createdAt
      }
    });
  } catch (error) {
    logger.error('Submit contact error:', error.message);
    return errorResponse(res, 'Failed to submit contact request. Please try again.', error.message, 500);
  }
};

/**
 * Get all Contact Messages (Admin directory)
 * GET /api/contact
 */
export const getContactMessages = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { search = '', status = 'All' } = req.query;

    const query = {};

    if (status && status !== 'All' && VALID_CONTACT_STATUSES.includes(status)) {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { ticketId: regex },
        { name: regex },
        { email: regex },
        { mobile: regex },
        { queryType: regex },
        { message: regex }
      ];
    }

    const [tickets, totalCount, openCount, inProgressCount, resolvedCount, closedCount] = await Promise.all([
      ContactMessage.find(query).sort({ createdAt: -1 }),
      ContactMessage.countDocuments({}),
      ContactMessage.countDocuments({ status: 'Open' }),
      ContactMessage.countDocuments({ status: 'In Progress' }),
      ContactMessage.countDocuments({ status: 'Resolved' }),
      ContactMessage.countDocuments({ status: 'Closed' })
    ]);

    return successResponse(res, 'Contact messages retrieved.', {
      tickets,
      summary: {
        total: totalCount,
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
        closed: closedCount
      }
    });
  } catch (error) {
    logger.error('Get contact messages error:', error.message);
    return errorResponse(res, 'Failed to fetch contact messages.', error.message, 500);
  }
};

/**
 * Get single Contact Message by ID or Ticket ID
 * GET /api/contact/:id
 */
export const getContactMessageById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;

    const ticket = await ContactMessage.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!ticket) {
      return errorResponse(res, 'Contact ticket not found.', null, 404);
    }

    return successResponse(res, 'Contact ticket retrieved.', { ticket });
  } catch (error) {
    logger.error('Get contact message by id error:', error.message);
    return errorResponse(res, 'Failed to fetch contact ticket details.', error.message, 500);
  }
};

/**
 * Update Contact Ticket Status
 * PATCH /api/contact/:id/status
 */
export const updateContactStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_CONTACT_STATUSES.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${VALID_CONTACT_STATUSES.join(', ')}`, null, 400);
    }

    const ticket = await ContactMessage.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!ticket) {
      return errorResponse(res, 'Contact ticket not found.', null, 404);
    }

    const previousStatus = ticket.status;

    if (previousStatus !== status) {
      ticket.status = status;

      // Add timeline event
      ticket.timeline.push({
        type: 'STATUS_CHANGE',
        message: `Status changed: ${previousStatus} → ${status}`,
        status,
        createdAt: new Date()
      });

      await ticket.save();
      logger.info(`Ticket ${ticket.ticketId} status updated: ${previousStatus} -> ${status}`);

      // Send status change notification email to user
      try {
        await emailService.sendTicketStatusChangeEmail({
          toEmail: ticket.email,
          userName: ticket.name,
          ticketId: ticket.ticketId,
          previousStatus,
          newStatus: status
        });
      } catch (err) {
        logger.error(`Failed to send status update email for ${ticket.ticketId}:`, err.message);
      }
    }

    return successResponse(res, `Status updated to ${status}.`, { ticket });
  } catch (error) {
    logger.error('Update contact status error:', error.message);
    return errorResponse(res, 'Failed to update ticket status.', error.message, 500);
  }
};

/**
 * Send admin message on a specific Contact ticket
 * POST /api/contact/:id/messages
 */
export const sendAdminMessage = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return errorResponse(res, 'Message content cannot be empty.', null, 400);
    }

    const ticket = await ContactMessage.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!ticket) {
      return errorResponse(res, 'Contact ticket not found.', null, 404);
    }

    const trimmedMsg = message.trim();

    // Append to ticket messages
    ticket.messages.push({
      sender: 'admin',
      senderName: 'Vista Holidays Support Team',
      message: trimmedMsg,
      createdAt: new Date()
    });

    // Append to timeline
    ticket.timeline.push({
      type: 'ADMIN_MESSAGE',
      message: 'Admin Message Sent',
      status: ticket.status,
      createdAt: new Date()
    });

    await ticket.save();
    logger.info(`Admin message added to ticket: ${ticket.ticketId}`);

    // Send email to ticket owner using Brevo SMTP
    let emailSent = false;
    try {
      await emailService.sendTicketAdminMessageEmail({
        toEmail: ticket.email,
        userName: ticket.name,
        ticketId: ticket.ticketId,
        status: ticket.status,
        adminMessage: trimmedMsg
      });
      emailSent = true;
    } catch (err) {
      logger.error(`Failed to send admin message notification to ${ticket.email}:`, err.message);
    }

    return successResponse(res, emailSent ? 'Message sent and user notified.' : 'Message recorded, but email delivery failed.', {
      ticket,
      emailSent
    });
  } catch (error) {
    logger.error('Send admin message error:', error.message);
    return errorResponse(res, 'Failed to send admin message.', error.message, 500);
  }
};

/**
 * Delete a single Contact message
 * DELETE /api/contact/:id
 */
export const deleteContactMessage = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;

    const result = await ContactMessage.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!result) {
      return errorResponse(res, 'Contact ticket not found.', null, 404);
    }

    logger.info(`Contact ticket deleted: ${result.ticketId}`);
    return successResponse(res, `Ticket ${result.ticketId} deleted successfully.`);
  } catch (error) {
    logger.error('Delete contact message error:', error.message);
    return errorResponse(res, 'Failed to delete contact ticket.', error.message, 500);
  }
};

/**
 * Delete All Contact messages (Admin bulk wipe)
 * DELETE /api/contact
 */
export const deleteAllContactMessages = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const deleteResult = await ContactMessage.deleteMany({});
    logger.warn(`All contact tickets deleted (${deleteResult.deletedCount} items).`);

    return successResponse(res, `All contact tickets have been deleted (${deleteResult.deletedCount} items).`);
  } catch (error) {
    logger.error('Delete all contact messages error:', error.message);
    return errorResponse(res, 'Failed to delete all contact tickets.', error.message, 500);
  }
};

export default {
  submitContact,
  getContactMessages,
  getContactMessageById,
  updateContactStatus,
  sendAdminMessage,
  deleteContactMessage,
  deleteAllContactMessages
};
