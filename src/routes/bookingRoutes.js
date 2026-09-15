import { Router } from 'express';
import {
  createCheckoutOrder,
  verifyPayment,
  getMyBookings,
  getBookingById,
  handleRazorpayWebhook
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Public webhook endpoint for Razorpay server-to-server notifications
router.post('/webhook', handleRazorpayWebhook);

// All user booking operations require an authenticated user
router.use(authenticate);

// 1. Create checkout & Razorpay order
router.post('/checkout', createCheckoutOrder);

// 2. Verify Razorpay payment
router.post('/verify-payment', verifyPayment);

// 3. Get authenticated user's own bookings
router.get('/my', getMyBookings);

// 4. Get specific booking details
router.get('/:bookingId', getBookingById);

export default router;
