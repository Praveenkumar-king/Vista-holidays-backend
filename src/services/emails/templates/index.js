/**
 * index.js
 * 
 * Central export for all Vista Holidays email templates.
 */

export { renderBaseEmail } from './baseTemplate.js';
export { buildVerificationEmail } from './verificationTemplate.js';
export { buildWelcomeEmail } from './welcomeTemplate.js';
export { buildContactConfirmationEmail } from './contactConfirmationTemplate.js';
export { buildFeedbackConfirmationEmail } from './feedbackConfirmationTemplate.js';
export { buildTicketUpdateEmail } from './ticketUpdateTemplate.js';
export { buildTicketStatusChangeEmail } from './ticketStatusTemplate.js';
export {
  buildContactAdminNotification,
  buildFeedbackAdminNotification
} from './adminNotificationTemplate.js';
