import ContactMessage from '../models/ContactMessage.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Secure Public Ticket Tracking
 * POST /api/tickets/track
 */
export const trackTicket = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is temporarily unavailable. Please try again shortly.', null, 503);
    }

    const { ticketId, email } = req.body;

    if (!ticketId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Both Ticket ID and Email Address are required to track status.'
      });
    }

    const trimmedTicketId = String(ticketId).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    // Validate format (Vista-CON-YYYYMMDD-001 or Vista-FEED-YYYYMMDD-001)
    const ticketFormatRegex = /^Vista-(CON|FEED)-\d{8}-\d{3,}$/i;
    if (!ticketFormatRegex.test(trimmedTicketId)) {
      return res.status(404).json({
        success: false,
        message: 'Ticket ID or email address is incorrect.'
      });
    }

    const isContact = /^Vista-CON/i.test(trimmedTicketId);
    let ticket = null;

    if (isContact) {
      ticket = await ContactMessage.findOne({ ticketId: new RegExp(`^${trimmedTicketId}$`, 'i') });
    } else {
      ticket = await FeedbackMessage.findOne({ ticketId: new RegExp(`^${trimmedTicketId}$`, 'i') });
    }

    // Consistent security response: do NOT reveal if ticket exists if email does not match
    if (!ticket || ticket.email.toLowerCase() !== normalizedEmail) {
      return res.status(404).json({
        success: false,
        message: 'Ticket ID or email address is incorrect.'
      });
    }

    logger.info(`Public track status verified for ${ticket.ticketId} by ${normalizedEmail}`);

    return successResponse(res, 'Ticket status verified.', {
      ticket: ticket.toPublicTrackObject()
    });
  } catch (error) {
    logger.error('Track ticket error:', error.message);
    return errorResponse(res, 'Failed to track ticket. Please try again.', error.message, 500);
  }
};

export default {
  trackTicket
};
