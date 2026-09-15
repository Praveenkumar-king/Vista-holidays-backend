import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import ProductUpdate from '../models/ProductUpdate.js';
import PlatformAnnouncement from '../models/PlatformAnnouncement.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get comprehensive Admin Dashboard overview metrics and live activity stream
 * GET /api/admin/dashboard/overview
 */
export const getDashboardOverview = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const [
      totalUsers,
      verifiedUsers,
      pendingUsers,
      contactOpen,
      contactTotal,
      feedbackOpen,
      feedbackTotal,
      productUpdatesTotal,
      productUpdatesPublished,
      activeAnnouncements,
      // Fetch recent DB events for Live Activity Stream
      recentUsers,
      recentContacts,
      recentFeedbacks,
      recentUpdates,
      recentAnnouncements
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ emailVerified: false }),
      ContactMessage.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
      ContactMessage.countDocuments({}),
      FeedbackMessage.countDocuments({ status: { $in: ['New', 'Reviewed'] } }),
      FeedbackMessage.countDocuments({}),
      ProductUpdate.countDocuments({}),
      ProductUpdate.countDocuments({ status: 'PUBLISHED' }),
      PlatformAnnouncement.countDocuments({ status: 'active' }),
      // Live activity sources
      User.find({}).sort({ createdAt: -1 }).limit(5).select('name email emailVerified createdAt'),
      ContactMessage.find({}).sort({ createdAt: -1 }).limit(6).select('ticketId name email queryType message status createdAt'),
      FeedbackMessage.find({}).sort({ createdAt: -1 }).limit(5).select('ticketId name email rating status createdAt'),
      ProductUpdate.find({}).sort({ createdAt: -1 }).limit(3).select('version title status createdAt publishedAt'),
      PlatformAnnouncement.find({}).sort({ createdAt: -1 }).limit(3).select('title targetAudience status createdAt')
    ]);

    // Build Live Activity Stream items
    const activities = [];

    // Map contact inquiries
    recentContacts.forEach(c => {
      activities.push({
        id: `contact-${c._id}`,
        type: 'contact',
        category: 'Contact Desk',
        title: `Support Ticket: ${c.ticketId}`,
        status: c.status,
        description: `${c.name} (${c.queryType}): "${c.message ? (c.message.length > 50 ? c.message.substring(0, 50) + '...' : c.message) : 'Inquiry submitted'}"`,
        timestamp: c.createdAt,
        link: `/admin/contact/${c._id}`
      });
    });

    // Map feedback submissions
    recentFeedbacks.forEach(f => {
      activities.push({
        id: `feedback-${f._id}`,
        type: 'feedback',
        category: 'Traveler Review',
        title: `Feedback: ${f.ticketId}`,
        status: f.status,
        description: `${f.name} submitted a ${f.rating || 5}-star survey review.`,
        timestamp: f.createdAt,
        link: `/admin/feedback/${f._id}`
      });
    });

    // Map user registrations
    recentUsers.forEach(u => {
      activities.push({
        id: `user-${u._id}`,
        type: 'user',
        category: 'User Registration',
        title: `New Traveler Joined: ${u.name}`,
        status: u.emailVerified ? 'Verified' : 'Pending',
        description: `Registered with email: ${u.email}`,
        timestamp: u.createdAt,
        link: `/admin/users/${u._id}`
      });
    });

    // Map product updates
    recentUpdates.forEach(p => {
      activities.push({
        id: `update-${p._id}`,
        type: 'update',
        category: 'Product Release',
        title: `Product Release: ${p.version}`,
        status: p.status,
        description: p.title,
        timestamp: p.publishedAt || p.createdAt,
        link: '/admin/whats-new'
      });
    });

    // Map announcements
    recentAnnouncements.forEach(a => {
      activities.push({
        id: `announcement-${a._id}`,
        type: 'announcement',
        category: 'Platform Broadcast',
        title: `Announcement: ${a.title}`,
        status: a.status,
        description: `Audience: ${a.targetAudience}`,
        timestamp: a.createdAt,
        link: '/admin/announcements'
      });
    });

    // Sort all activities by timestamp descending
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return successResponse(res, 'Dashboard overview retrieved', {
      kpis: {
        users: {
          total: totalUsers,
          verified: verifiedUsers,
          pending: pendingUsers
        },
        supportTickets: {
          active: contactOpen + feedbackOpen,
          total: contactTotal + feedbackTotal
        },
        contactMessages: {
          open: contactOpen,
          total: contactTotal
        },
        feedbackMessages: {
          pending: feedbackOpen,
          total: feedbackTotal
        },
        productUpdates: {
          total: productUpdatesTotal,
          published: productUpdatesPublished
        },
        announcements: {
          active: activeAnnouncements
        }
      },
      liveActivities: activities.slice(0, 10)
    });
  } catch (error) {
    logger.error('Dashboard overview error:', error.message);
    return errorResponse(res, 'Failed to retrieve dashboard overview.', error.message, 500);
  }
};

export default {
  getDashboardOverview
};
