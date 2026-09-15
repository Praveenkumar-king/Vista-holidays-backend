import User from '../models/User.js';
import ContactMessage from '../models/ContactMessage.js';
import FeedbackMessage from '../models/FeedbackMessage.js';
import { isDatabaseConnected } from '../config/database.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * Get users directory with filtering and search
 * GET /api/admin/users
 */
export const getUsers = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { search = '', role = 'All', verification = 'All', status = 'All' } = req.query;

    const query = {};

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { mobile: { $regex: term, $options: 'i' } }
      ];
    }

    if (role && role !== 'All') {
      query.role = role.toLowerCase();
    }

    if (verification && verification !== 'All') {
      query.emailVerified = verification.toLowerCase() === 'verified';
    }

    if (status && status !== 'All') {
      query.accountStatus = status.toLowerCase();
    }

    const [users, total, verifiedCount, pendingCount, adminCount] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .select('-passwordHash -emailVerificationTokenHash'),
      User.countDocuments({}),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ emailVerified: false }),
      User.countDocuments({ role: 'admin' })
    ]);

    return successResponse(res, 'Users retrieved successfully', {
      users,
      summary: {
        total,
        verified: verifiedCount,
        pending: pendingCount,
        admins: adminCount
      }
    });
  } catch (error) {
    logger.error('Get admin users error:', error.message);
    return errorResponse(res, 'Failed to fetch users list.', error.message, 500);
  }
};

/**
 * Get individual user detail with activity & ticket metrics
 * GET /api/admin/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const user = await User.findById(id).select('-passwordHash -emailVerificationTokenHash');

    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    // Retrieve user's support and feedback history
    const [contactTickets, feedbackTickets] = await Promise.all([
      ContactMessage.find({ email: user.email.toLowerCase() }).sort({ createdAt: -1 }).limit(10),
      FeedbackMessage.find({ email: user.email.toLowerCase() }).sort({ createdAt: -1 }).limit(10)
    ]);

    return successResponse(res, 'User details retrieved successfully', {
      user,
      activity: {
        supportTicketsCount: contactTickets.length,
        feedbackCount: feedbackTickets.length,
        contactTickets,
        feedbackTickets
      }
    });
  } catch (error) {
    logger.error('Get user by ID error:', error.message);
    return errorResponse(res, 'Failed to fetch user details.', error.message, 500);
  }
};

/**
 * Update user account status (active / suspended)
 * PATCH /api/admin/users/:id/status
 */
export const updateUserStatus = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!['active', 'suspended', 'inactive'].includes(accountStatus)) {
      return errorResponse(res, 'Invalid account status.', null, 400);
    }

    const user = await User.findById(id);
    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    // Prevent suspending the currently logged-in admin
    if (req.user && req.user._id.toString() === user._id.toString() && accountStatus !== 'active') {
      return errorResponse(res, 'You cannot suspend your own administrative account.', null, 400);
    }

    user.accountStatus = accountStatus;
    await user.save();

    logger.info(`User ${user.email} status changed to ${accountStatus} by admin ${req.user?.email}`);

    return successResponse(res, `User status updated to ${accountStatus}.`, {
      user: user.toSafeObject()
    });
  } catch (error) {
    logger.error('Update user status error:', error.message);
    return errorResponse(res, 'Failed to update user status.', error.message, 500);
  }
};

/**
 * Delete user account
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database unavailable', null, 503);
    }

    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return errorResponse(res, 'User not found.', null, 404);
    }

    // Prevent admin from deleting their own account
    if (req.user && req.user._id.toString() === user._id.toString()) {
      return errorResponse(res, 'You cannot delete your own administrative account.', null, 400);
    }

    // If target user is an admin, check that at least one other admin exists
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return errorResponse(res, 'Cannot delete the only administrator account.', null, 400);
      }
    }

    await User.findByIdAndDelete(id);
    logger.info(`User ${user.email} permanently deleted by admin ${req.user?.email}`);

    return successResponse(res, `User ${user.name} (${user.email}) has been permanently deleted.`);
  } catch (error) {
    logger.error('Delete user error:', error.message);
    return errorResponse(res, 'Failed to delete user account.', error.message, 500);
  }
};

export default {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
};
