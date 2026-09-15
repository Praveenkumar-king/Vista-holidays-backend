import mongoose from 'mongoose';
import PlatformSetting from '../models/PlatformSetting.js';
import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import { isDatabaseConnected } from '../config/database.js';
import { isCloudinaryConfigured } from '../services/cloudinaryService.js';
import config from '../config/environment.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get Platform and Infrastructure Settings
 * GET /api/admin/settings
 */
export const getSettings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const settings = await PlatformSetting.getSettings();

    // Check Brevo SMTP configuration
    const isBrevoConfigured = Boolean(
      config.brevo.host &&
      config.brevo.user &&
      config.brevo.password
    );

    // Check Gemini AI configuration
    const isGeminiConfigured = Boolean(config.geminiApiKey);

    // Check Cloudinary
    const isCloudinaryActive = isCloudinaryConfigured();

    // Check MongoDB
    const isMongoConnected = mongoose.connection.readyState === 1;
    const mongoHost = mongoose.connection.host || '127.0.0.1';

    // Security Overview Counts
    const [totalUsers, verifiedUsers, adminUsers, totalContacts, totalFeedback] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ role: 'admin' }),
      ContactMessage.countDocuments({}),
      FeedbackMessage.countDocuments({})
    ]);

    return successResponse(res, 'Settings retrieved', {
      settings: {
        brandName: settings.brandName,
        supportEmail: settings.supportEmail,
        tagline: settings.tagline,
        maintenanceMode: settings.maintenanceMode,
        maintenanceHeadline: settings.maintenanceHeadline,
        maintenanceMessage: settings.maintenanceMessage,
        maintenanceStartedAt: settings.maintenanceStartedAt,
        updatedAt: settings.updatedAt
      },
      integrations: {
        brevo: {
          configured: isBrevoConfigured,
          relay: `${config.brevo.host}:${config.brevo.port}`,
          fromEmail: `${config.brevo.fromName} <${config.brevo.fromEmail}>`
        },
        gemini: {
          configured: isGeminiConfigured,
          model: config.geminiModel || 'gemini-3.5-flash-lite',
          latency: 'Low-latency AI'
        },
        cloudinary: {
          configured: isCloudinaryActive,
          folder: config.cloudinary.folder || 'vista-holidays/product-updates',
          delivery: 'Global Secure CDN'
        },
        mongodb: {
          connected: isMongoConnected,
          host: mongoHost,
          databaseName: mongoose.connection.name || 'vista_holidays'
        }
      },
      security: {
        totalUsers,
        verifiedUsers,
        adminUsers,
        totalContacts,
        totalFeedback
      }
    });
  } catch (error) {
    logger.error('Get platform settings error:', error.message);
    return errorResponse(res, 'Failed to fetch platform settings.', error.message, 500);
  }
};

/**
 * Update Platform Branding Settings
 * PUT /api/admin/settings
 */
export const updateSettings = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { brandName, supportEmail, tagline } = req.body;
    const settings = await PlatformSetting.getSettings();

    if (brandName && brandName.trim()) settings.brandName = brandName.trim();
    if (supportEmail && supportEmail.trim()) settings.supportEmail = supportEmail.trim().toLowerCase();
    if (tagline && tagline.trim()) settings.tagline = tagline.trim();

    settings.updatedBy = req.user?.name || 'Super Admin';
    await settings.save();

    logger.info(`Platform settings updated by ${req.user?.email}`);

    return successResponse(res, 'Platform settings saved successfully.', { settings });
  } catch (error) {
    logger.error('Update platform settings error:', error.message);
    return errorResponse(res, 'Failed to update platform settings.', error.message, 500);
  }
};

/**
 * Get Maintenance Control details
 * GET /api/admin/maintenance
 */
export const getMaintenance = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const settings = await PlatformSetting.getSettings();

    return successResponse(res, 'Maintenance status retrieved', {
      maintenanceMode: settings.maintenanceMode,
      maintenanceHeadline: settings.maintenanceHeadline,
      maintenanceMessage: settings.maintenanceMessage,
      maintenanceStartedAt: settings.maintenanceStartedAt,
      adminBypassActive: true
    });
  } catch (error) {
    logger.error('Get maintenance status error:', error.message);
    return errorResponse(res, 'Failed to fetch maintenance status.', error.message, 500);
  }
};

/**
 * Toggle Maintenance Mode
 * POST /api/admin/maintenance/toggle
 */
export const toggleMaintenance = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { enabled } = req.body;
    const settings = await PlatformSetting.getSettings();

    const newStatus = typeof enabled === 'boolean' ? enabled : !settings.maintenanceMode;
    settings.maintenanceMode = newStatus;

    if (newStatus) {
      settings.maintenanceStartedAt = new Date();
    } else {
      settings.maintenanceStartedAt = null;
    }

    settings.updatedBy = req.user?.name || 'Super Admin';
    await settings.save();

    logger.warn(`MAINTENANCE MODE ${newStatus ? 'ENABLED' : 'DISABLED'} by admin ${req.user?.email}`);

    return successResponse(res, `Maintenance mode has been ${newStatus ? 'enabled' : 'disabled'}.`, {
      maintenanceMode: settings.maintenanceMode,
      maintenanceStartedAt: settings.maintenanceStartedAt,
      adminBypassActive: true
    });
  } catch (error) {
    logger.error('Toggle maintenance mode error:', error.message);
    return errorResponse(res, 'Failed to toggle maintenance mode.', error.message, 500);
  }
};

/**
 * Update Maintenance Notice Copy (Headline & Message)
 * PUT /api/admin/maintenance/copy
 */
export const updateMaintenanceCopy = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { headline, message } = req.body;
    const settings = await PlatformSetting.getSettings();

    if (headline && headline.trim()) {
      settings.maintenanceHeadline = headline.trim();
    }
    if (message && message.trim()) {
      settings.maintenanceMessage = message.trim();
    }

    settings.updatedBy = req.user?.name || 'Super Admin';
    await settings.save();

    logger.info(`Maintenance copy updated by ${req.user?.email}`);

    return successResponse(res, 'Maintenance notice text saved successfully.', {
      maintenanceHeadline: settings.maintenanceHeadline,
      maintenanceMessage: settings.maintenanceMessage
    });
  } catch (error) {
    logger.error('Update maintenance copy error:', error.message);
    return errorResponse(res, 'Failed to save maintenance notice copy.', error.message, 500);
  }
};

/**
 * Public Platform Status (for frontend top banner & auth guard checks)
 * GET /api/platform/status
 */
export const getPublicPlatformStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return successResponse(res, 'OK', {
        maintenanceMode: false,
        brandName: 'Vista Holidays'
      });
    }

    const settings = await PlatformSetting.getSettings();

    return successResponse(res, 'Platform status retrieved', {
      maintenanceMode: settings.maintenanceMode,
      maintenanceHeadline: settings.maintenanceHeadline,
      maintenanceMessage: settings.maintenanceMessage,
      maintenanceStartedAt: settings.maintenanceStartedAt,
      brandName: settings.brandName,
      supportEmail: settings.supportEmail,
      tagline: settings.tagline
    });
  } catch (error) {
    logger.error('Get public platform status error:', error.message);
    return successResponse(res, 'OK', {
      maintenanceMode: false,
      brandName: 'Vista Holidays'
    });
  }
};

export default {
  getSettings,
  updateSettings,
  getMaintenance,
  toggleMaintenance,
  updateMaintenanceCopy,
  getPublicPlatformStatus
};
