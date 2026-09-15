/**
 * adminTransactionController.js
 * 
 * Administrative endpoints for monitoring real transaction logs,
 * computing authorized revenue telemetry, and filtering booking transactions.
 */

import Transaction from '../models/Transaction.js';
import Booking from '../models/Booking.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * 1. Get All Transactions with Filters, Search, and Pagination
 * GET /api/admin/transactions
 */
export const getAdminTransactions = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const {
      search = '',
      status = 'all',
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    // Filter by payment status
    if (status && status.toLowerCase() !== 'all') {
      query.paymentStatus = status.toLowerCase();
    }

    // Search by User name, Email, Booking ID, Destination, Payment ID
    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      query.$or = [
        { userName: regex },
        { email: regex },
        { bookingId: regex },
        { destination: regex },
        { razorpayPaymentId: regex },
        { transactionId: regex }
      ];
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [transactions, totalCount] = await Promise.all([
      Transaction.find(query)
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      Transaction.countDocuments(query)
    ]);

    return successResponse(res, 'Transactions retrieved successfully.', {
      transactions,
      pagination: {
        total: totalCount,
        page: safePage,
        limit: safeLimit,
        pages: Math.ceil(totalCount / safeLimit) || 1
      }
    });
  } catch (error) {
    logger.error('Get admin transactions error:', error.message);
    return errorResponse(res, 'Failed to retrieve transactions.', error.message, 500);
  }
};

/**
 * 2. Get Transaction Summary & Financial Metrics
 * GET /api/admin/transactions/summary
 */
export const getTransactionSummary = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    // Aggregation for Total Revenue (MUST be calculated strictly from actual successful/paid transactions)
    const [revenueAgg, counts] = await Promise.all([
      Transaction.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    let successfulPayments = 0;
    let failedPayments = 0;
    let pendingPayments = 0;
    let refundedPayments = 0;
    let totalTransactions = 0;

    counts.forEach((item) => {
      totalTransactions += item.count;
      switch (item._id) {
        case 'paid':
          successfulPayments = item.count;
          break;
        case 'failed':
          failedPayments = item.count;
          break;
        case 'pending':
        case 'created':
          pendingPayments += item.count;
          break;
        case 'refunded':
          refundedPayments = item.count;
          break;
        default:
          break;
      }
    });

    return successResponse(res, 'Transaction summary computed successfully.', {
      totalRevenue,
      totalTransactions,
      successfulPayments,
      failedPayments,
      pendingPayments,
      refundedPayments,
      currency: 'INR'
    });
  } catch (error) {
    logger.error('Get transaction summary error:', error.message);
    return errorResponse(res, 'Failed to compute transaction summary.', error.message, 500);
  }
};

/**
 * 3. Get Single Transaction Detail
 * GET /api/admin/transactions/:id
 */
export const getAdminTransactionById = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { id } = req.params;

    const transaction = await Transaction.findOne({
      $or: [{ transactionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }]
    });

    if (!transaction) {
      return errorResponse(res, 'Transaction not found.', null, 404);
    }

    // Also fetch associated booking if available
    const booking = await Booking.findOne({ bookingId: transaction.bookingId });

    return successResponse(res, 'Transaction details retrieved.', {
      transaction,
      booking
    });
  } catch (error) {
    logger.error('Get admin transaction by ID error:', error.message);
    return errorResponse(res, 'Failed to retrieve transaction details.', error.message, 500);
  }
};

export default {
  getAdminTransactions,
  getTransactionSummary,
  getAdminTransactionById
};
