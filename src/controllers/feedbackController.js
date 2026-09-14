import FeedbackMessage from '../models/FeedbackMessage.js';
import TicketCounter from '../models/TicketCounter.js';
import emailService from '../services/emailService.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

const VALID_FEEDBACK_STATUSES = ['New', 'Reviewed', 'Resolved', 'Closed'];

/**
 * Submit Feedback Form
 * POST /api/feedback
 */
export const submitFeedback = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is temporarily unavailable. Please try again shortly.', null, 503);
    }

    const {
      name,
      email,
      mobile = '',
      rating = 5,
      answers = {},
      termsAccepted = true
    } = req.body;

    if (!name || !email) {
      return errorResponse(res, 'Name and email address are required.', null, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return errorResponse(res, 'Please provide a valid email address.', null, 400);
    }

    const trimmedName = name.trim();

    // Generate unique daily feedback ticket ID on the server (format: Vista-FEED-YYYYMMDD-001)
    const ticketId = await TicketCounter.getNextTicketId('FEED');

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';

    // Initial timeline events
    const initialTimeline = [
      {
        type: 'SUBMISSION',
        message: 'Feedback Submitted',
        status: 'New',
        createdAt: new Date()
      },
      {
        type: 'SYSTEM',
        message: 'Received by Vista Holidays',
        status: 'New',
        createdAt: new Date(Date.now() + 1000)
      }
    ];

    const feedbackTicket = new FeedbackMessage({
      ticketId,
      name: trimmedName,
      email: normalizedEmail,
      mobile: String(mobile || '').trim(),
      rating: Number(rating) || 5,
      answers: answers && typeof answers === 'object' ? answers : {},
      termsAccepted: Boolean(termsAccepted),
      ipAddress,
      status: 'New',
      messages: [],
      timeline: initialTimeline
    });

    await feedbackTicket.save();
    logger.info(`New Feedback Ticket created: ${ticketId} (${normalizedEmail})`);

    // Dispatch user confirmation and admin alert emails asynchronously
    let emailSent = false;
    try {
      await emailService.sendFeedbackConfirmationEmail({
        toEmail: normalizedEmail,
        userName: trimmedName,
        ticketId,
        rating: feedbackTicket.rating,
        answers: feedbackTicket.answers,
        submittedAt: feedbackTicket.createdAt
      });
      emailSent = true;
    } catch (err) {
      logger.error(`Failed to send user feedback confirmation email for ${ticketId}:`, err.message);
    }

    try {
      await emailService.sendFeedbackAdminNotification({
        ticketId,
        name: trimmedName,
        email: normalizedEmail,
        mobile: feedbackTicket.mobile,
        rating: feedbackTicket.rating,
        answers: feedbackTicket.answers,
        submittedAt: feedbackTicket.createdAt
      });
    } catch (err) {
      logger.error(`Failed to send admin feedback notification for ${ticketId}:`, err.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Thank you for helping us improve Vista Holidays.'
        : 'Feedback received successfully, but confirmation email could not be sent right now.',
      emailWarning: !emailSent,
      data: {
        ticketId,
        email: normalizedEmail,
        name: trimmedName,
        status: 'New',
        createdAt: feedbackTicket.createdAt
      }
    });
  } catch (error) {
    logger.error('Submit feedback error:', error.message);
    return errorResponse(res, 'Failed to submit feedback. Please try again.', error.message, 500);
  }
};

/**
 * Get all Feedback Messages (Admin directory)
 * GET /api/feedback
 */
export const getFeedbackMessages = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { search = '', status = 'All' } = req.query;
    const query = {};

    if (status && status !== 'All' && VALID_FEEDBACK_STATUSES.includes(status)) {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { ticketId: regex },
        { name: regex },
        { email: regex },
        { mobile: regex }
      ];
    }

    const [tickets, totalCount, newCount, reviewedCount, resolvedCount, closedCount] = await Promise.all([
      FeedbackMessage.find(query).sort({ createdAt: -1 }),
      FeedbackMessage.countDocuments({}),
      FeedbackMessage.countDocuments({ status: 'New' }),
      FeedbackMessage.countDocuments({ status: 'Reviewed' }),
      FeedbackMessage.countDocuments({ status: 'Resolved' }),
      FeedbackMessage.countDocuments({ status: 'Closed' })
    ]);

    return successResponse(res, 'Feedback messages retrieved.', {
      tickets,
      summary: {
        total: totalCount,
        new: newCount,
        reviewed: reviewedCount,
        resolved: resolvedCount,
        closed: closedCount
      }
    });
  } catch (error) {
    logger.error('Get feedback messages error:', error.message);
    return errorResponse(res, 'Failed to fetch feedback messages.', error.message, 500);
  }
};

/**
 * Get single Feedback Ticket by ID or Ticket ID
 * GET /api/feedback/:id
 */
export const getFeedbackMessageById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;

    const ticket = await FeedbackMessage.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!ticket) {
      return errorResponse(res, 'Feedback ticket not found.', null, 404);
    }

    return successResponse(res, 'Feedback ticket retrieved.', { ticket });
  } catch (error) {
    logger.error('Get feedback message by id error:', error.message);
    return errorResponse(res, 'Failed to fetch feedback ticket details.', error.message, 500);
  }
};

/**
 * Update Feedback Ticket Status
 * PATCH /api/feedback/:id/status
 */
export const updateFeedbackStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_FEEDBACK_STATUSES.includes(status)) {
      return errorResponse(res, `Invalid status. Must be one of: ${VALID_FEEDBACK_STATUSES.join(', ')}`, null, 400);
    }

    const ticket = await FeedbackMessage.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!ticket) {
      return errorResponse(res, 'Feedback ticket not found.', null, 404);
    }

    const previousStatus = ticket.status;

    if (previousStatus !== status) {
      ticket.status = status;

      ticket.timeline.push({
        type: 'STATUS_CHANGE',
        message: `Status changed: ${previousStatus} → ${status}`,
        status,
        createdAt: new Date()
      });

      await ticket.save();
      logger.info(`Feedback Ticket ${ticket.ticketId} status updated: ${previousStatus} -> ${status}`);

      try {
        await emailService.sendTicketStatusChangeEmail({
          toEmail: ticket.email,
          userName: ticket.name,
          ticketId: ticket.ticketId,
          previousStatus,
          newStatus: status,
          isFeedback: true
        });
      } catch (err) {
        logger.error(`Failed to send feedback status update email for ${ticket.ticketId}:`, err.message);
      }
    }

    return successResponse(res, `Status updated to ${status}.`, { ticket });
  } catch (error) {
    logger.error('Update feedback status error:', error.message);
    return errorResponse(res, 'Failed to update feedback status.', error.message, 500);
  }
};

/**
 * Send admin message on a specific Feedback ticket
 * POST /api/feedback/:id/messages
 */
export const sendFeedbackAdminMessage = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return errorResponse(res, 'Message content cannot be empty.', null, 400);
    }

    const ticket = await FeedbackMessage.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!ticket) {
      return errorResponse(res, 'Feedback ticket not found.', null, 404);
    }

    const trimmedMsg = message.trim();

    ticket.messages.push({
      sender: 'admin',
      senderName: 'Vista Holidays Support Team',
      message: trimmedMsg,
      createdAt: new Date()
    });

    ticket.timeline.push({
      type: 'ADMIN_MESSAGE',
      message: 'Admin Message Sent',
      status: ticket.status,
      createdAt: new Date()
    });

    await ticket.save();
    logger.info(`Admin message added to feedback ticket: ${ticket.ticketId}`);

    let emailSent = false;
    try {
      await emailService.sendTicketAdminMessageEmail({
        toEmail: ticket.email,
        userName: ticket.name,
        ticketId: ticket.ticketId,
        status: ticket.status,
        adminMessage: trimmedMsg,
        isFeedback: true
      });
      emailSent = true;
    } catch (err) {
      logger.error(`Failed to send feedback admin message email to ${ticket.email}:`, err.message);
    }

    return successResponse(res, emailSent ? 'Message sent and user notified.' : 'Message saved, but email failed.', {
      ticket,
      emailSent
    });
  } catch (error) {
    logger.error('Send feedback admin message error:', error.message);
    return errorResponse(res, 'Failed to send admin message.', error.message, 500);
  }
};

/**
 * Delete single feedback message
 * DELETE /api/feedback/:id
 */
export const deleteFeedbackMessage = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;

    const result = await FeedbackMessage.findOneAndDelete({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { ticketId: id }]
    });

    if (!result) {
      return errorResponse(res, 'Feedback ticket not found.', null, 404);
    }

    logger.info(`Feedback ticket deleted: ${result.ticketId}`);
    return successResponse(res, `Ticket ${result.ticketId} deleted successfully.`);
  } catch (error) {
    logger.error('Delete feedback message error:', error.message);
    return errorResponse(res, 'Failed to delete feedback ticket.', error.message, 500);
  }
};

/**
 * Delete all feedback messages (Admin bulk wipe)
 * DELETE /api/feedback
 */
export const deleteAllFeedbackMessages = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const deleteResult = await FeedbackMessage.deleteMany({});
    logger.warn(`All feedback tickets deleted (${deleteResult.deletedCount} items).`);

    return successResponse(res, `All feedback tickets have been deleted (${deleteResult.deletedCount} items).`);
  } catch (error) {
    logger.error('Delete all feedback messages error:', error.message);
    return errorResponse(res, 'Failed to delete all feedback tickets.', error.message, 500);
  }
};

export default {
  submitFeedback,
  getFeedbackMessages,
  getFeedbackMessageById,
  updateFeedbackStatus,
  sendFeedbackAdminMessage,
  deleteFeedbackMessage,
  deleteAllFeedbackMessages
};
