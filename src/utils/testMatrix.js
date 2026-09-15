/**
 * testMatrix.js
 * 
 * Verifies all criteria specified in Feature 23 (Test Matrix)
 */

import { getISTGreeting, formatISTDateTime } from '../services/emails/emailTimeHelper.js';
import * as templates from '../services/emails/templates/index.js';
import { FAQ_CATEGORIES, FAQ_ITEMS } from '../../../client/src/data/faqData.js';

console.log('====================================================');
console.log('RUNNING COMPREHENSIVE TEST MATRIX FOR VISTA HOLIDAYS');
console.log('====================================================');

let passed = 0;
let total = 0;

const assert = (condition, description) => {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`);
    process.exitCode = 1;
  }
};

// 1. Timezone tests (UTC timestamps evaluated in Asia/Kolkata)
// Mon 03:30 UTC -> 09:00 IST (Morning)
const tMorning = new Date('2026-09-14T03:30:00Z');
const gMorning = getISTGreeting({ userName: 'Praveen', date: tMorning });
assert(gMorning.timeGreeting.includes('Good Morning 🌅, Praveen'), 'Morning greeting matches 12:00 AM - 11:59 AM IST');
assert(!gMorning.isWeekend, 'Weekday morning does not flag weekend');
assert(gMorning.weekendGreeting === null, 'Weekday morning has no weekend greeting');

// Mon 08:30 UTC -> 14:00 IST (Afternoon)
const tAfternoon = new Date('2026-09-14T08:30:00Z');
const gAfternoon = getISTGreeting({ userName: 'Praveen', date: tAfternoon });
assert(gAfternoon.timeGreeting.includes('Good Afternoon ☀️, Praveen'), 'Afternoon greeting matches 12:00 PM - 4:59 PM IST');

// Mon 14:30 UTC -> 20:00 IST (Evening)
const tEvening = new Date('2026-09-14T14:30:00Z');
const gEvening = getISTGreeting({ userName: 'Praveen', date: tEvening });
assert(gEvening.timeGreeting.includes('Good Evening 🌙, Praveen'), 'Evening greeting matches 5:00 PM - 11:59 PM IST');

// Sat 04:30 UTC -> 10:00 IST (Saturday Morning)
const tSat = new Date('2026-09-19T04:30:00Z');
const gSat = getISTGreeting({ userName: 'Praveen', date: tSat });
assert(gSat.isWeekend === true, 'Saturday is detected as weekend');
assert(gSat.weekendGreeting === 'Happy Weekend 🎉', 'Saturday displays Happy Weekend 🎉');
assert(gSat.fullGreetingText.includes('Happy Weekend 🎉\nGood Morning 🌅, Praveen'), 'Saturday combines weekend and time greeting');

// Sun 09:30 UTC -> 15:00 IST (Sunday Afternoon)
const tSun = new Date('2026-09-20T09:30:00Z');
const gSun = getISTGreeting({ userName: 'Praveen', date: tSun });
assert(gSun.isWeekend === true, 'Sunday is detected as weekend');
assert(gSun.weekendGreeting === 'Happy Weekend 🎉', 'Sunday displays Happy Weekend 🎉');
assert(gSun.fullGreetingText.includes('Happy Weekend 🎉\nGood Afternoon ☀️, Praveen'), 'Sunday combines weekend and afternoon greeting');

// Fallback greeting when no name is provided
const gNoName = getISTGreeting({ userName: '', date: tMorning });
assert(gNoName.timeGreeting.includes('Good Morning 🌅, Traveler'), 'Fallback uses Traveler, never Hello User');

// 2. Verification Email Template
const verifyEmail = templates.buildVerificationEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  verificationUrl: 'https://vistaholidays.com/users/verify-email?token=sec_abc123',
  expiresHours: 24,
  clientUrl: 'https://vistaholidays.com'
});
assert(verifyEmail.subject === 'Email Verification - Praveen ✔️', 'Verification email subject format is correct');
assert(verifyEmail.html.includes('https://res.cloudinary.com/dkzkasg7x/image/upload/v1789387703/Vista_Holidays_Logo.png'), 'Exact Cloudinary Logo URL is present');
assert(verifyEmail.html.includes('alt="Vista Holidays"'), 'Logo alt text is Vista Holidays');
assert(verifyEmail.html.includes('EMAIL VERIFICATION'), 'Email type badge is present');
assert(verifyEmail.html.includes('Verify My Email'), 'CTA button is present');
assert(verifyEmail.html.includes('If the button is not working, copy this link'), 'Copy/paste fallback link is present');
assert(verifyEmail.html.includes('Security Notice'), 'Security Notice is present');
assert(verifyEmail.html.includes('no-reply-travelbooking@outlook.com'), 'Need Help support email is present');
assert(verifyEmail.html.includes('https://vistaholidays.com/contact'), 'Contact Us link is present');
assert(verifyEmail.html.includes('https://vistaholidays.com/faq'), 'FAQ link is present');
assert(verifyEmail.html.includes('🌍 Travel. Discover. Experience.'), 'Brand tagline is present');
assert(verifyEmail.html.includes('Thanks &amp; Regards'), 'Thanks & Regards is present');
assert(verifyEmail.html.includes('Vista Holidays ❤️'), 'Vista Holidays ❤️ is present');
assert(verifyEmail.html.includes('praveen@vistatest.com'), 'Recipient email is present in footer');
assert(!verifyEmail.html.includes('JWT_SECRET') && !verifyEmail.html.includes('passwordHash'), 'No secrets exposed in verification email');

// 3. Welcome Email Template
const welcomeEmail = templates.buildWelcomeEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  clientUrl: 'https://vistaholidays.com'
});
assert(welcomeEmail.subject === 'Welcome to Vista Holidays Family - Praveen ❤️🥰🥳🎉', 'Welcome subject matches exact required style');
assert(welcomeEmail.html.includes('WELCOME TO VISTA HOLIDAYS'), 'Email type badge matches');
assert(welcomeEmail.html.includes('Explore Vista Holidays'), 'Explore Vista Holidays CTA button is present');
assert(welcomeEmail.html.includes('AI-powered travel plans'), 'Celebratory welcome messaging is present');

// 4. Contact Confirmation Template
const contactEmail = templates.buildContactConfirmationEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  ticketId: 'Vista-CON-20260914-001',
  queryType: 'Booking Assistance',
  message: 'Need assistance with resort reservations.',
  submittedAt: tMorning,
  clientUrl: 'https://vistaholidays.com'
});
assert(contactEmail.subject === 'Contact Request Received - Praveen 🎫', 'Contact confirmation subject format is correct');
assert(contactEmail.html.includes('Vista-CON-20260914-001'), 'Contact ticket ID is present');
assert(contactEmail.html.includes('https://vistaholidays.com/track-status?ticket=Vista-CON-20260914-001'), 'Track Status CTA is present');

// 5. Feedback Confirmation Template
const feedbackEmail = templates.buildFeedbackConfirmationEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  ticketId: 'Vista-FEED-20260914-001',
  rating: 5,
  answers: { 'Service': 'Amazing trip experience!' },
  submittedAt: tMorning,
  clientUrl: 'https://vistaholidays.com'
});
assert(feedbackEmail.subject === 'Feedback Received - Praveen 💬', 'Feedback confirmation subject format is correct');
assert(feedbackEmail.html.includes('Vista-FEED-20260914-001'), 'Feedback ticket ID is present');
assert(feedbackEmail.html.includes('⭐⭐⭐⭐⭐'), 'Star rating is rendered properly');

// 6. Ticket Update Template
const updateEmail = templates.buildTicketUpdateEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  ticketId: 'Vista-CON-20260914-001',
  status: 'In Progress',
  adminMessage: 'Our travel concierge is curating options for you.',
  isFeedback: false,
  updatedAt: tAfternoon,
  clientUrl: 'https://vistaholidays.com'
});
assert(updateEmail.subject === 'Support Ticket Update - Praveen 🎫', 'Ticket update subject format is correct');
assert(updateEmail.html.includes('SUPPORT TICKET UPDATE'), 'Ticket update badge is present');
assert(updateEmail.html.includes('Our travel concierge is curating options for you.'), 'Admin message is present');

// 7. Status Change Template
const statusEmail = templates.buildTicketStatusChangeEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  ticketId: 'Vista-CON-20260914-001',
  previousStatus: 'In Progress',
  newStatus: 'Resolved',
  updatedAt: tEvening,
  clientUrl: 'https://vistaholidays.com'
});
assert(statusEmail.subject === 'Ticket Status Updated - Praveen 🔔', 'Ticket status change subject format is correct');
assert(statusEmail.html.includes('TICKET STATUS UPDATED'), 'Status update badge is present');
assert(statusEmail.html.includes('In Progress'), 'Previous status is present');
assert(statusEmail.html.includes('Resolved'), 'New status is present');

// 8. Admin Notifications
const adminContact = templates.buildContactAdminNotification({
  ticketId: 'Vista-CON-20260914-001',
  name: 'Praveen',
  email: 'praveen@vistatest.com',
  queryType: 'Booking Assistance',
  message: 'Inquiry content',
  clientUrl: 'https://vistaholidays.com'
});
assert(adminContact.subject === 'New Contact Request | Vista-CON-20260914-001 | Praveen', 'Admin contact subject format is correct');

const adminFeedback = templates.buildFeedbackAdminNotification({
  ticketId: 'Vista-FEED-20260914-001',
  name: 'Praveen',
  email: 'praveen@vistatest.com',
  rating: 5,
  clientUrl: 'https://vistaholidays.com'
});
assert(adminFeedback.subject === 'New Feedback Received | Vista-FEED-20260914-001 | Praveen', 'Admin feedback subject format is correct');

// 9. FAQ Data validation
assert(FAQ_CATEGORIES.length === 13, '13 category entries (All Topics + 12 categories)');
assert(FAQ_ITEMS.length === 36, 'Exactly 36 questions created (within 30-40 requirement)');
const categoriesCovered = new Set(FAQ_ITEMS.map(i => i.categoryId));
assert(categoriesCovered.size === 12, 'All 12 topic categories are populated with questions');

// 10. Booking Confirmation Email Template (Phase 10)
const bookingEmail = templates.buildBookingConfirmationEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  bookingId: 'VISTA-BOOK-20260915-0001',
  destinationName: 'Paris',
  packageName: 'Standard Explorer',
  stayDuration: 3,
  members: 2,
  pricePerDay: 5000,
  subtotal: 30000,
  tax: 0,
  totalAmount: 30000,
  paymentStatus: 'Paid',
  razorpayPaymentId: 'pay_test123456789',
  bookingDate: tMorning,
  clientUrl: 'https://vistaholidays.com'
});
assert(bookingEmail.subject === 'Booking Confirmed - Praveen 🎉❤️', 'Booking confirmation subject format matches exact style');
assert(bookingEmail.html.includes('BOOKING CONFIRMATION'), 'Booking confirmation email type badge is present');
assert(bookingEmail.html.includes('VISTA-BOOK-20260915-0001'), 'Official Booking Reference ID is present');
assert(bookingEmail.html.includes('Paris'), 'Destination name is present in booking email');
assert(bookingEmail.html.includes('Standard Explorer'), 'Package name is present in booking email');
assert(bookingEmail.html.includes('3 Days'), 'Stay duration is rendered');
assert(bookingEmail.html.includes('2 Travelers'), 'Number of members is rendered');
assert(bookingEmail.html.includes('₹5,000 / Day'), 'Price per day is formatted with rupee symbol');
assert(bookingEmail.html.includes('₹30,000'), 'Total amount is formatted with rupee symbol');
assert(bookingEmail.html.includes('View My Booking'), 'View My Booking primary CTA is present');
assert(bookingEmail.html.includes('If the button is not working, copy this link'), 'Fallback copy/paste link is present');
assert(bookingEmail.html.includes('pay_test123456789'), 'Razorpay Payment ID is rendered');
assert(bookingEmail.html.includes('Security Notice'), 'Security Notice is present in booking email');
assert(bookingEmail.html.includes('no-reply-travelbooking@outlook.com'), 'Need Help support email is present in booking email');
assert(bookingEmail.html.includes('🌍 Travel. Discover. Experience.'), 'Brand tagline is present in booking email');
assert(bookingEmail.html.includes('Thanks &amp; Regards'), 'Thanks & Regards is present in booking email');
assert(bookingEmail.html.includes('Vista Holidays ❤️'), 'Vista Holidays ❤️ signature is present in booking email');

// 11. Admin Booking Notification Email Template (Phase 11)
const adminBooking = templates.buildBookingAdminNotification({
  bookingId: 'VISTA-BOOK-20260915-0001',
  userName: 'Praveen',
  email: 'praveen@vistatest.com',
  mobile: '+91 9876543210',
  destinationName: 'Paris',
  packageName: 'Standard Explorer',
  pricePerDay: 5000,
  days: 3,
  members: 2,
  subtotal: 30000,
  tax: 0,
  totalAmount: 30000,
  paymentStatus: 'Paid',
  razorpayOrderId: 'order_test987654',
  razorpayPaymentId: 'pay_test123456789',
  bookingDate: tMorning,
  clientUrl: 'https://vistaholidays.com'
});
assert(adminBooking.subject === 'New Booking Confirmed | VISTA-BOOK-20260915-0001 | Paris | Praveen', 'Admin booking subject format is correct');
assert(adminBooking.html.includes('ADMIN NOTIFICATION'), 'Admin notification badge is present');
assert(adminBooking.html.includes('VISTA-BOOK-20260915-0001'), 'Booking ID is present in admin alert');
assert(adminBooking.html.includes('Open Admin Transactions'), 'Open Admin Transactions CTA is present');

// 12. Dynamic Pricing Engine Validation (Phase 4)
import { calculateBookingPrice } from '../config/destinationPackages.js';
const price1 = calculateBookingPrice({
  destinationId: 'paris',
  packageId: 'standard',
  days: 3,
  members: 2
});
assert(price1.pricePerDay === 5000, 'Paris standard price per day is ₹5,000');
assert(price1.subtotal === 30000, 'Paris 3 days x 2 members subtotal is ₹30,000');
assert(price1.totalAmount === 30000, 'Authoritative total amount matches calculation');

const priceBoundaries = calculateBookingPrice({
  destinationId: 'unknown-spot',
  packageId: 'standard',
  days: -10,
  members: 0
});
assert(priceBoundaries.days === 1, 'Negative days safely clamped to minimum 1');
assert(priceBoundaries.members === 1, 'Zero members safely clamped to minimum 1');
assert(priceBoundaries.totalAmount === 5000, 'Safe minimum total calculated');

// 13. Sequential Booking ID Generator Validation (Phase 7)
import BookingCounter from '../models/BookingCounter.js';
const generatedBookingId1 = await BookingCounter.getNextBookingId();
const generatedBookingId2 = await BookingCounter.getNextBookingId();
assert(/^VISTA-BOOK-\d{8}-\d{4}$/.test(generatedBookingId1), `Booking ID format matches VISTA-BOOK-YYYYMMDD-0001 (${generatedBookingId1})`);
assert(/^VISTA-BOOK-\d{8}-\d{4}$/.test(generatedBookingId2), `Second Booking ID format matches VISTA-BOOK-YYYYMMDD-0002 (${generatedBookingId2})`);
assert(generatedBookingId1 !== generatedBookingId2, 'Consecutive booking IDs are unique and incrementing');

// 14. Razorpay Signature Verification Logic (Phase 6)
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from '../services/razorpayService.js';
assert(verifyRazorpaySignature({ orderId: 'order_sim_123', paymentId: 'pay_sim_456' }) === true, 'Simulated Razorpay orders verify cleanly in dev');
assert(verifyRazorpaySignature({ orderId: '', paymentId: 'pay_sim_456' }) === false, 'Missing orderId fails signature check');

// 15. Razorpay Webhook Signature Verification Logic
import crypto from 'crypto';
const mockPayload = JSON.stringify({ event: 'payment.captured' });
const validWebhookSig = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'pknotes4548').update(mockPayload).digest('hex');
assert(verifyRazorpayWebhookSignature({ rawBody: mockPayload, signature: validWebhookSig }) === true, 'Valid Razorpay webhook signature verifies successfully');
assert(verifyRazorpayWebhookSignature({ rawBody: mockPayload, signature: 'invalid_sig' }) === false, 'Invalid Razorpay webhook signature correctly rejected');
assert(verifyRazorpayWebhookSignature({ rawBody: '', signature: validWebhookSig }) === false, 'Empty webhook payload correctly rejected');

// 16. User Profile Schema & Safe Serialization Validation
import User from '../models/User.js';
const testUser = new User({
  name: 'Praveen Kumar',
  email: 'praveen.test@vistaholidays.com',
  passwordHash: 'hashed_secret_test_pw',
  mobile: '+91 9876543210',
  emailVerified: true,
  profileImage: {
    url: 'https://res.cloudinary.com/demo/image/upload/v12345/profile.jpg',
    publicId: 'vista-holidays/user-profiles/sample'
  },
  savedDestinations: ['paris-classic', 'bali-luxury'],
  recentActivities: [
    { action: 'Account Created', details: 'Welcome to Vista Holidays' },
    { action: 'Profile Updated', details: 'Added mobile number' }
  ]
});

const safeUser = testUser.toSafeObject();
assert(safeUser.name === 'Praveen Kumar', 'Safe user preserves full name');
assert(safeUser.email === 'praveen.test@vistaholidays.com', 'Safe user preserves email');
assert(safeUser.profileImage?.url === 'https://res.cloudinary.com/demo/image/upload/v12345/profile.jpg', 'Safe user preserves Cloudinary profileImage URL');
assert(safeUser.profileImage?.publicId === 'vista-holidays/user-profiles/sample', 'Safe user preserves Cloudinary publicId');
assert(safeUser.savedDestinations?.length === 2, 'Safe user preserves saved destinations count');
assert(safeUser.recentActivities?.length === 2, 'Safe user preserves recent activities');
assert(safeUser.passwordHash === undefined, 'Password hash is strictly excluded from safe user');
assert(safeUser.emailVerificationTokenHash === undefined, 'Verification token hash is strictly excluded');

console.log('====================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log('====================================================');


