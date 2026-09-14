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

console.log('====================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log('====================================================');
