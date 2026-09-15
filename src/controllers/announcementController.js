import PlatformAnnouncement from '../models/PlatformAnnouncement.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get all announcements for Admin
 * GET /api/admin/announcements
 */
export const getAdminAnnouncements = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { search = '', status = 'All', audience = 'All' } = req.query;

    const query = {};

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { message: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (status && status !== 'All') {
      query.status = status.toLowerCase();
    }

    if (audience && audience !== 'All') {
      query.targetAudience = audience.toLowerCase();
    }

    // Auto-expire announcements whose expiresAt has passed
    const now = new Date();
    await PlatformAnnouncement.updateMany(
      {
        status: 'active',
        expiresAt: { $ne: null, $lt: now }
      },
      { status: 'expired' }
    );

    const [announcements, total, active, draft, expired] = await Promise.all([
      PlatformAnnouncement.find(query).sort({ createdAt: -1 }),
      PlatformAnnouncement.countDocuments({}),
      PlatformAnnouncement.countDocuments({ status: 'active' }),
      PlatformAnnouncement.countDocuments({ status: 'draft' }),
      PlatformAnnouncement.countDocuments({ status: 'expired' })
    ]);

    return successResponse(res, 'Announcements retrieved', {
      announcements,
      summary: {
        total,
        active,
        draft,
        expired
      }
    });
  } catch (error) {
    logger.error('Get admin announcements error:', error.message);
    return errorResponse(res, 'Failed to fetch announcements.', error.message, 500);
  }
};

/**
 * Create announcement
 * POST /api/admin/announcements
 */
export const createAnnouncement = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const {
      title,
      message,
      targetAudience = 'everyone',
      expirationDuration = 'never',
      status = 'active'
    } = req.body;

    if (!title || !title.trim()) {
      return errorResponse(res, 'Announcement title is required.', null, 400);
    }

    if (!message || !message.trim()) {
      return errorResponse(res, 'Announcement message is required.', null, 400);
    }

    const startDate = new Date();
    const expiresAt = PlatformAnnouncement.calculateExpiresAt(expirationDuration, startDate);

    const announcement = new PlatformAnnouncement({
      title: title.trim(),
      message: message.trim(),
      targetAudience,
      expirationDuration,
      startDate,
      expiresAt,
      status: status || 'active',
      createdBy: req.user?.name || 'Super Admin'
    });

    await announcement.save();
    logger.info(`Platform Announcement created: "${announcement.title}" by ${req.user?.email}`);

    return successResponse(res, 'Platform Announcement created successfully.', {
      announcement
    }, 201);
  } catch (error) {
    logger.error('Create announcement error:', error.message);
    return errorResponse(res, 'Failed to create announcement.', error.message, 500);
  }
};

/**
 * Get single announcement by ID
 * GET /api/admin/announcements/:id
 */
export const getAnnouncementById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const announcement = await PlatformAnnouncement.findById(id);

    if (!announcement) {
      return errorResponse(res, 'Announcement not found.', null, 404);
    }

    return successResponse(res, 'Announcement retrieved', { announcement });
  } catch (error) {
    logger.error('Get announcement error:', error.message);
    return errorResponse(res, 'Failed to fetch announcement.', error.message, 500);
  }
};

/**
 * Update announcement
 * PUT /api/admin/announcements/:id
 */
export const updateAnnouncement = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const {
      title,
      message,
      targetAudience,
      expirationDuration,
      status
    } = req.body;

    const announcement = await PlatformAnnouncement.findById(id);
    if (!announcement) {
      return errorResponse(res, 'Announcement not found.', null, 404);
    }

    if (title && title.trim()) announcement.title = title.trim();
    if (message && message.trim()) announcement.message = message.trim();
    if (targetAudience) announcement.targetAudience = targetAudience;

    if (expirationDuration !== undefined) {
      announcement.expirationDuration = expirationDuration;
      announcement.expiresAt = PlatformAnnouncement.calculateExpiresAt(
        expirationDuration,
        announcement.startDate || new Date()
      );
    }

    if (status) {
      announcement.status = status;
    }

    await announcement.save();
    logger.info(`Platform Announcement updated: "${announcement.title}"`);

    return successResponse(res, 'Announcement updated successfully.', { announcement });
  } catch (error) {
    logger.error('Update announcement error:', error.message);
    return errorResponse(res, 'Failed to update announcement.', error.message, 500);
  }
};

/**
 * Toggle announcement status (Activate or Stop)
 * PATCH /api/admin/announcements/:id/status
 */
export const toggleAnnouncementStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const { status } = req.body;

    const announcement = await PlatformAnnouncement.findById(id);
    if (!announcement) {
      return errorResponse(res, 'Announcement not found.', null, 404);
    }

    // Toggle: if no explicit status passed, flip active <-> closed
    const newStatus = status || (announcement.status === 'active' ? 'closed' : 'active');
    announcement.status = newStatus;

    // If activating, reset startDate and compute fresh expiry
    if (newStatus === 'active') {
      announcement.startDate = new Date();
      announcement.expiresAt = PlatformAnnouncement.calculateExpiresAt(
        announcement.expirationDuration,
        announcement.startDate
      );
    }

    await announcement.save();
    logger.info(`Announcement "${announcement.title}" status changed to ${newStatus}`);

    return successResponse(res, `Announcement is now ${newStatus}.`, { announcement });
  } catch (error) {
    logger.error('Toggle announcement status error:', error.message);
    return errorResponse(res, 'Failed to update announcement status.', error.message, 500);
  }
};

/**
 * Delete announcement
 * DELETE /api/admin/announcements/:id
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const announcement = await PlatformAnnouncement.findByIdAndDelete(id);

    if (!announcement) {
      return errorResponse(res, 'Announcement not found.', null, 404);
    }

    logger.info(`Announcement "${announcement.title}" deleted by ${req.user?.email}`);
    return successResponse(res, `Announcement "${announcement.title}" deleted.`);
  } catch (error) {
    logger.error('Delete announcement error:', error.message);
    return errorResponse(res, 'Failed to delete announcement.', error.message, 500);
  }
};

/**
 * Public endpoint: Get active announcements for top notification bar
 * GET /api/announcements/active
 */
export const getActiveAnnouncements = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return successResponse(res, 'OK', { announcements: [] });
    }

    const now = new Date();

    // Base query: active and not expired
    const query = {
      status: 'active',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    };

    // Audience filtering based on request user context (if provided by optionalAuthenticate)
    const user = req.user;
    if (user) {
      if (user.role === 'admin') {
        query.targetAudience = { $in: ['everyone', 'admins'] };
      } else {
        query.targetAudience = { $in: ['everyone', 'users'] };
      }
    } else {
      query.targetAudience = 'everyone';
    }

    const announcements = await PlatformAnnouncement.find(query)
      .sort({ createdAt: -1 })
      .limit(5);

    return successResponse(res, 'Active announcements retrieved', {
      announcements
    });
  } catch (error) {
    logger.error('Get active announcements error:', error.message);
    return successResponse(res, 'OK', { announcements: [] });
  }
};

export default {
  getAdminAnnouncements,
  createAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement,
  getActiveAnnouncements
};
