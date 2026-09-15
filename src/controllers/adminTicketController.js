import ContactMessage from '../models/ContactMessage.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get unified support tickets directory
 * GET /api/admin/tickets
 */
export const getAllTickets = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { search = '', status = 'All', category = 'All' } = req.query;

    const contactQuery = {};
    const feedbackQuery = {};

    if (search && search.trim()) {
      const regex = { $regex: search.trim(), $options: 'i' };
      contactQuery.$or = [
        { ticketId: regex },
        { name: regex },
        { email: regex },
        { queryType: regex },
        { message: regex }
      ];
      feedbackQuery.$or = [
        { ticketId: regex },
        { name: regex },
        { email: regex }
      ];
    }

    if (status && status !== 'All') {
      contactQuery.status = status;
      feedbackQuery.status = status;
    }

    const [contacts, feedbacks] = await Promise.all([
      ContactMessage.find(contactQuery).sort({ createdAt: -1 }).limit(100),
      FeedbackMessage.find(feedbackQuery).sort({ createdAt: -1 }).limit(100)
    ]);

    // Map contacts to unified ticket format
    const contactTickets = contacts.map(c => ({
      _id: c._id,
      ticketId: c.ticketId,
      createdAt: c.createdAt,
      userName: c.name,
      email: c.email,
      subject: c.message ? (c.message.length > 50 ? `${c.message.substring(0, 50)}...` : c.message) : c.queryType,
      category: c.queryType || 'General Inquiry',
      status: c.status,
      type: 'contact',
      detailUrl: `/admin/contact/${c._id}`
    }));

    // Map feedbacks to unified ticket format
    const feedbackTickets = feedbacks.map(f => ({
      _id: f._id,
      ticketId: f.ticketId,
      createdAt: f.createdAt,
      userName: f.name,
      email: f.email,
      subject: `Traveler Feedback (${f.rating || 5} Stars)`,
      category: 'Traveler Feedback',
      status: f.status,
      type: 'feedback',
      detailUrl: `/admin/feedback/${f._id}`
    }));

    // Filter by category if requested
    let combined = [...contactTickets, ...feedbackTickets];
    if (category && category !== 'All') {
      combined = combined.filter(t => t.category.toLowerCase().includes(category.toLowerCase()));
    }

    // Sort descending by date
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalOpen = combined.filter(t => ['Open', 'New', 'In Progress'].includes(t.status)).length;
    const totalClosed = combined.filter(t => ['Closed', 'Resolved'].includes(t.status)).length;

    return successResponse(res, 'Support tickets retrieved successfully', {
      tickets: combined,
      summary: {
        total: combined.length,
        open: totalOpen,
        closed: totalClosed
      }
    });
  } catch (error) {
    logger.error('Get unified support tickets error:', error.message);
    return errorResponse(res, 'Failed to fetch support tickets.', error.message, 500);
  }
};

export default {
  getAllTickets
};
