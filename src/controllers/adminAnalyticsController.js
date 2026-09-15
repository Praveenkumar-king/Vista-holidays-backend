import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import ProductUpdate from '../models/ProductUpdate.js';
import PlatformAnnouncement from '../models/PlatformAnnouncement.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get aggregated analytics across real database records
 * GET /api/admin/analytics?range=30d
 */
export const getAnalytics = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { range = '30d' } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(2020, 0, 1);
        break;
    }

    const dateFilter = { createdAt: { $gte: startDate } };

    const [
      newUsersInRange,
      totalUsers,
      verifiedUsers,
      contactMessagesInRange,
      allContactMessages,
      feedbackInRange,
      allFeedback,
      productUpdatesCount,
      announcementsCount
    ] = await Promise.all([
      User.countDocuments(dateFilter),
      User.countDocuments({}),
      User.countDocuments({ emailVerified: true }),
      ContactMessage.find(dateFilter),
      ContactMessage.find({}),
      FeedbackMessage.find(dateFilter),
      FeedbackMessage.find({}),
      ProductUpdate.countDocuments({ status: 'PUBLISHED' }),
      PlatformAnnouncement.countDocuments({ status: 'active' })
    ]);

    // Compute average feedback rating
    const ratingsArray = allFeedback.map(f => f.rating || 5);
    const avgRating = ratingsArray.length > 0
      ? (ratingsArray.reduce((acc, r) => acc + r, 0) / ratingsArray.length).toFixed(1)
      : '5.0';

    // Rating distribution (5 down to 1 star)
    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allFeedback.forEach(f => {
      const r = Math.round(f.rating) || 5;
      if (ratingBreakdown[r] !== undefined) {
        ratingBreakdown[r] += 1;
      }
    });

    // Query Type Distribution for Contact messages
    const queryTypeCounts = {};
    allContactMessages.forEach(c => {
      const qType = c.queryType || 'General Inquiry';
      queryTypeCounts[qType] = (queryTypeCounts[qType] || 0) + 1;
    });

    const queryTypeDistribution = Object.entries(queryTypeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: allContactMessages.length > 0 ? Math.round((count / allContactMessages.length) * 100) : 0
    })).sort((a, b) => b.count - a.count);

    // Support ticket status breakdown (combining Contact + Feedback)
    const statusCounts = {
      Open: 0,
      'In Progress': 0,
      Resolved: 0,
      Closed: 0
    };

    allContactMessages.forEach(c => {
      const s = c.status || 'Open';
      if (statusCounts[s] !== undefined) statusCounts[s] += 1;
      else statusCounts.Open += 1;
    });

    allFeedback.forEach(f => {
      const s = f.status === 'New' ? 'Open' : f.status === 'Reviewed' ? 'In Progress' : f.status;
      if (statusCounts[s] !== undefined) statusCounts[s] += 1;
      else statusCounts.Open += 1;
    });

    const totalTicketsCombined = allContactMessages.length + allFeedback.length;
    const ticketStatusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: totalTicketsCombined > 0 ? Math.round((count / totalTicketsCombined) * 100) : 0
    }));

    return successResponse(res, 'Analytics calculated successfully', {
      range,
      kpis: {
        newUsersInRange,
        totalUsers,
        verifiedUsers,
        pendingVerification: totalUsers - verifiedUsers,
        totalSupportTickets: totalTicketsCombined,
        supportTicketsInRange: contactMessagesInRange.length + feedbackInRange.length,
        avgFeedbackRating: avgRating,
        totalFeedback: allFeedback.length,
        productUpdatesCount,
        announcementsCount
      },
      distributions: {
        queryTypes: queryTypeDistribution,
        ticketStatuses: ticketStatusBreakdown,
        ratings: ratingBreakdown
      }
    });
  } catch (error) {
    logger.error('Get analytics error:', error.message);
    return errorResponse(res, 'Failed to calculate analytics.', error.message, 500);
  }
};

export default {
  getAnalytics
};
