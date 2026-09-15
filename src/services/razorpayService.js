import crypto from 'crypto';
import Razorpay from 'razorpay';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

let razorpayInstance = null;

/**
 * Get or initialize Razorpay instance
 */
const getRazorpayInstance = () => {
  if (razorpayInstance) return razorpayInstance;

  const { keyId, keySecret } = config.razorpay;

  if (!keyId || !keySecret) {
    logger.warn('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured.');
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  return razorpayInstance;
};

/**
 * Creates a Razorpay Order
 * @param {object} params
 * @param {number} params.amountInRupees - Amount in INR (will be converted to paise)
 * @param {string} params.currency - 'INR'
 * @param {string} params.receipt - Booking ID
 * @param {object} [params.notes]
 * @returns {Promise<object>} Order details { id, amount, currency, receipt, isSimulated }
 */
export const createRazorpayOrder = async ({
  amountInRupees,
  currency = 'INR',
  receipt,
  notes = {}
}) => {
  const rzp = getRazorpayInstance();
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  if (!rzp) {
    // Development fallback simulation mode
    const simulatedOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.warn('------------------------------------------------------------');
    logger.warn(`[RAZORPAY SIMULATION] Created Order: ${simulatedOrderId}`);
    logger.warn(`[RAZORPAY SIMULATION] Receipt: ${receipt} | Amount: ₹${amountInRupees} (${amountInPaise} paise)`);
    logger.warn('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env for live Razorpay payments.');
    logger.warn('------------------------------------------------------------');

    return {
      id: simulatedOrderId,
      amount: amountInPaise,
      currency,
      receipt,
      status: 'created',
      isSimulated: true
    };
  }

  try {
    const order = await rzp.orders.create({
      amount: amountInPaise,
      currency,
      receipt: String(receipt).slice(0, 40),
      notes
    });

    logger.info(`Razorpay order created successfully: ${order.id} for booking: ${receipt}`);
    return {
      ...order,
      isSimulated: false
    };
  } catch (error) {
    logger.error(`Razorpay order creation failed for booking ${receipt}: ${error.message}`);
    throw error;
  }
};

/**
 * Verifies Razorpay payment signature
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.paymentId
 * @param {string} params.signature
 * @returns {boolean}
 */
export const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId) return false;

  // Development simulation mode validation
  if (orderId.startsWith('order_sim_')) {
    logger.info(`[RAZORPAY SIMULATION] Signature verified for simulated order: ${orderId}`);
    return true;
  }

  const { keySecret } = config.razorpay;
  if (!keySecret) {
    logger.warn('RAZORPAY_KEY_SECRET missing during signature verification; allowing simulated verification.');
    return true;
  }

  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const isValid = expectedSignature === signature;
  if (!isValid) {
    logger.error(`Razorpay signature mismatch for order ${orderId}, payment ${paymentId}`);
  }

  return isValid;
};

/**
 * Verifies Razorpay Webhook signature
 * @param {object} params
 * @param {string} params.rawBody - Raw string of request body
 * @param {string} params.signature - Value from 'x-razorpay-signature' header
 * @returns {boolean}
 */
export const verifyRazorpayWebhookSignature = ({ rawBody, signature }) => {
  if (!rawBody || !signature) return false;

  const webhookSecret = config.razorpay.webhookSecret;
  if (!webhookSecret) {
    logger.warn('RAZORPAY_WEBHOOK_SECRET is not configured in server/.env');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const isValid = expectedSignature === signature;
  if (!isValid) {
    logger.error('Razorpay webhook signature mismatch');
  }

  return isValid;
};

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature
};
