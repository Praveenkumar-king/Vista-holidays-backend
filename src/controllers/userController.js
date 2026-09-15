/**
 * userController.js
 * 
 * Handles authenticated user profile operations, Cloudinary profile photo
 * upload/replacement/removal, dashboard telemetry, and saved destinations.
 */

import User from '../models/User.js';
import Booking from '../models/Booking.js';
import { uploadImageBuffer, deleteImageByPublicId, isCloudinaryConfigured } from '../services/cloudinaryService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * 1. Get Current User Profile
 * GET /api/user/me
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }
    return successResponse(res, 'Profile retrieved successfully.', user.toSafeObject());
  } catch (error) {
    logger.error('Error fetching user profile:', error.message);
    return errorResponse(res, 'Unable to load profile.', error.message, 500);
  }
};

/**
 * 2. Update User Profile (Name, Mobile)
 * PUT /api/user/profile
 */
export const updateUserProfile = async (req, res) => {
  try {
    const { name, mobile } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length < 2) {
        return errorResponse(res, 'Name must be at least 2 characters long.', null, 400);
      }
      if (trimmedName.length > 100) {
        return errorResponse(res, 'Name cannot exceed 100 characters.', null, 400);
      }
      user.name = trimmedName;
    }

    if (mobile !== undefined) {
      const trimmedMobile = String(mobile).trim();
      const digitsOnly = trimmedMobile.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        return errorResponse(res, 'Please provide a valid mobile number (7-15 digits).', null, 400);
      }
      user.mobile = trimmedMobile;
    }

    // Log profile update in user's recent activities
    user.recentActivities.push({
      action: 'Profile Updated',
      details: 'Personal details updated successfully.',
      timestamp: new Date()
    });

    await user.save();
    logger.info(`User profile updated for: ${user.email}`);

    return successResponse(res, 'Profile updated successfully.', user.toSafeObject());
  } catch (error) {
    logger.error('Error updating user profile:', error.message);
    return errorResponse(res, 'Unable to update profile.', error.message, 500);
  }
};

/**
 * 3. Upload or Replace Profile Image via Cloudinary
 * POST /api/user/profile-image
 */
export const uploadProfileImageHandler = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'Please select a valid image file to upload.', null, 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    let uploadResult;
    if (isCloudinaryConfigured()) {
      // Stream buffer directly to Cloudinary
      uploadResult = await uploadImageBuffer(req.file.buffer, 'vista-holidays/user-profiles');
    } else {
      // Safe development fallback simulation if Cloudinary keys are omitted in dev
      logger.warn('[Cloudinary Profile] Cloudinary credentials not configured; generating simulated secure asset.');
      const simPublicId = `sim_profile_${user._id}_${Date.now()}`;
      uploadResult = {
        secureUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80`,
        publicId: simPublicId
      };
    }

    // Capture old publicId to clean up previous Cloudinary asset
    const oldPublicId = user.profileImage?.publicId;

    // Save new Cloudinary URL and publicId in MongoDB
    user.profileImage = {
      url: uploadResult.secureUrl,
      publicId: uploadResult.publicId
    };

    user.recentActivities.push({
      action: 'Profile Picture Updated',
      details: 'Uploaded new profile photo.',
      timestamp: new Date()
    });

    await user.save();
    logger.info(`Profile image updated for ${user.email}: ${uploadResult.secureUrl}`);

    // Asynchronously destroy old asset from Cloudinary (failsafe)
    if (oldPublicId && oldPublicId !== uploadResult.publicId && !oldPublicId.startsWith('sim_')) {
      deleteImageByPublicId(oldPublicId).catch((cleanupErr) => {
        logger.warn(`Failed to clean up old Cloudinary asset ${oldPublicId}:`, cleanupErr.message);
      });
    }

    return successResponse(res, 'Profile image uploaded successfully.', {
      profileImage: user.profileImage,
      user: user.toSafeObject()
    });
  } catch (error) {
    logger.error('Profile image upload error:', error.message);
    return errorResponse(res, error.message || 'Failed to upload profile image.', null, 500);
  }
};

/**
 * 4. Remove Profile Image
 * DELETE /api/user/profile-image
 */
export const removeProfileImageHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    const publicId = user.profileImage?.publicId;

    // Delete asset from Cloudinary
    if (publicId && !publicId.startsWith('sim_')) {
      try {
        await deleteImageByPublicId(publicId);
      } catch (delErr) {
        logger.warn(`Cloudinary asset deletion error for ${publicId}:`, delErr.message);
      }
    }

    user.profileImage = {
      url: null,
      publicId: null
    };

    user.recentActivities.push({
      action: 'Profile Picture Removed',
      details: 'Switched back to default avatar initials.',
      timestamp: new Date()
    });

    await user.save();
    logger.info(`Profile image removed for: ${user.email}`);

    return successResponse(res, 'Profile image removed successfully.', {
      user: user.toSafeObject()
    });
  } catch (error) {
    logger.error('Error removing profile image:', error.message);
    return errorResponse(res, 'Unable to remove profile image.', error.message, 500);
  }
};

/**
 * 5. Get User Dashboard Summary (Real counts, bookings, stats, activities)
 * GET /api/user/dashboard-summary
 */
export const getUserDashboardSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    // Fetch user's real bookings
    const bookings = await Booking.find({ userId: user._id }).sort({ createdAt: -1 });

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter((b) => b.bookingStatus === 'confirmed').length;
    const completedBookings = bookings.filter((b) => b.bookingStatus === 'completed').length;
    const upcomingBookings = bookings.filter((b) => {
      if (b.bookingStatus === 'confirmed') {
        const start = new Date(b.startDate || b.createdAt);
        return start >= new Date();
      }
      return false;
    }).length;

    // Profile completion calculation based on actual fields
    let filledFields = 0;
    const missingFields = [];

    if (user.name && user.name.trim()) filledFields += 1;
    else missingFields.push('Full Name');

    if (user.email && user.email.trim()) filledFields += 1;
    else missingFields.push('Email Address');

    if (user.mobile && user.mobile.trim()) filledFields += 1;
    else missingFields.push('Mobile Number');

    if (user.profileImage?.url) filledFields += 1;
    else missingFields.push('Profile Picture');

    const completionPercentage = Math.round((filledFields / 4) * 100);

    // Build real notifications
    const notifications = [];
    if (user.emailVerified) {
      notifications.push({
        id: 'notif-email-verified',
        title: 'Account Verified',
        message: 'Your email address has been verified successfully.',
        type: 'success',
        date: user.updatedAt
      });
    }

    if (bookings.length > 0) {
      const latest = bookings[0];
      notifications.push({
        id: `notif-booking-${latest.bookingId}`,
        title: `Booking ${latest.bookingStatus.toUpperCase()}`,
        message: `Your trip to ${latest.destinationName} (${latest.bookingId}) is ${latest.bookingStatus}.`,
        type: latest.bookingStatus === 'confirmed' ? 'success' : 'info',
        date: latest.updatedAt || latest.createdAt
      });
    }

    notifications.push({
      id: 'notif-welcome',
      title: 'Welcome to Vista Holidays',
      message: 'Explore hand-crafted destinations and personalize your itinerary with AI.',
      type: 'info',
      date: user.createdAt
    });

    // Recent activities (reverse chronological)
    const activities = [...(user.recentActivities || [])].reverse().slice(0, 8);

    // If user has bookings, add them into activity list
    bookings.slice(0, 3).forEach((b) => {
      activities.push({
        action: 'Booking Created',
        details: `${b.destinationName} (${b.packageName}) - ₹${b.totalAmount.toLocaleString('en-IN')}`,
        timestamp: b.createdAt
      });
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return successResponse(res, 'Dashboard summary retrieved.', {
      user: user.toSafeObject(),
      stats: {
        totalBookings,
        confirmedBookings,
        upcomingBookings,
        completedBookings,
        savedDestinationsCount: user.savedDestinations?.length || 0,
        memberSince: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      completion: {
        percentage: completionPercentage,
        missingFields
      },
      recentBookings: bookings.slice(0, 3),
      savedDestinations: user.savedDestinations || [],
      notifications: notifications.slice(0, 5),
      recentActivities: activities.slice(0, 6)
    });
  } catch (error) {
    logger.error('Error fetching dashboard summary:', error.message);
    return errorResponse(res, 'Unable to load dashboard summary.', error.message, 500);
  }
};

/**
 * 6. Toggle Saved Destination (Bookmark/Wishlist)
 * POST /api/user/saved-destinations/toggle
 */
export const toggleSavedDestination = async (req, res) => {
  try {
    const { destinationId } = req.body;
    if (!destinationId) {
      return errorResponse(res, 'Destination ID is required.', null, 400);
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    const index = user.savedDestinations.indexOf(destinationId);
    let isSaved = false;

    if (index === -1) {
      user.savedDestinations.push(destinationId);
      isSaved = true;
      user.recentActivities.push({
        action: 'Destination Saved',
        details: `Saved ${destinationId} to your wishlist.`,
        timestamp: new Date()
      });
    } else {
      user.savedDestinations.splice(index, 1);
      isSaved = false;
    }

    await user.save();

    return successResponse(res, isSaved ? 'Destination saved to wishlist.' : 'Destination removed from wishlist.', {
      savedDestinations: user.savedDestinations,
      isSaved
    });
  } catch (error) {
    logger.error('Toggle saved destination error:', error.message);
    return errorResponse(res, 'Unable to update wishlist.', error.message, 500);
  }
};

/**
 * 7. Change Password
 * PUT /api/user/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return errorResponse(res, 'Please provide both current and new password.', null, 400);
    }

    if (newPassword.length < 6) {
      return errorResponse(res, 'New password must be at least 6 characters long.', null, 400);
    }

    const user = await User.findById(req.user._id).select('+passwordHash');
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return errorResponse(res, 'Current password is incorrect.', null, 400);
    }

    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(10);
    user.passwordHash = await bcrypt.default.hash(newPassword, salt);

    user.recentActivities.push({
      action: 'Password Changed',
      details: 'Account security password updated.',
      timestamp: new Date()
    });

    await user.save();
    logger.info(`Password changed for user: ${user.email}`);

    return successResponse(res, 'Password changed successfully.');
  } catch (error) {
    logger.error('Change password error:', error.message);
    return errorResponse(res, 'Unable to change password.', error.message, 500);
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  uploadProfileImageHandler,
  removeProfileImageHandler,
  getUserDashboardSummary,
  toggleSavedDestination,
  changePassword
};
