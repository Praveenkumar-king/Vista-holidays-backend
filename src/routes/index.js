import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import imageRoutes from './imageRoutes.js';
import aiRoutes from './aiRoutes.js';
import authRoutes from './authRoutes.js';
import contactRoutes from './contactRoutes.js';
import feedbackRoutes from './feedbackRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import adminProductUpdateRoutes from './adminProductUpdateRoutes.js';
import productUpdateRoutes from './productUpdateRoutes.js';
import adminUserRoutes from './adminUserRoutes.js';
import adminTicketRoutes from './adminTicketRoutes.js';
import adminAnnouncementRoutes from './adminAnnouncementRoutes.js';
import announcementRoutes from './announcementRoutes.js';
import adminSettingsRoutes from './adminSettingsRoutes.js';
import platformPublicRoutes from './platformPublicRoutes.js';
import adminAnalyticsRoutes from './adminAnalyticsRoutes.js';
import adminDashboardRoutes from './adminDashboardRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import adminTransactionRoutes from './adminTransactionRoutes.js';

const router = Router();

// Health check route
router.use('/health', healthRoutes);

// Public Platform Status (maintenance mode & brand info)
router.use('/platform', platformPublicRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Support Ticket System: Contact & Feedback routes
router.use('/contact', contactRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/tickets', ticketRoutes);

// What's New / Product Updates routes
router.use('/admin/product-updates', adminProductUpdateRoutes);
router.use('/admin/whats-new', adminProductUpdateRoutes);
router.use('/product-updates', productUpdateRoutes);

// Bookings & Reservation API
router.use('/bookings', bookingRoutes);

// Admin Control Center modules
router.use('/admin/dashboard', adminDashboardRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/tickets', adminTicketRoutes);
router.use('/admin/announcements', adminAnnouncementRoutes);
router.use('/admin/settings', adminSettingsRoutes);
router.use('/admin/maintenance', adminSettingsRoutes);
router.use('/admin/analytics', adminAnalyticsRoutes);
router.use('/admin/transactions', adminTransactionRoutes);

// Public Announcements
router.use('/announcements', announcementRoutes);

// Weather API routes
router.use('/weather', weatherRoutes);

// Image API routes
router.use('/images', imageRoutes);

// AI Travel Assistant routes
router.use('/ai', aiRoutes);

export default router;
