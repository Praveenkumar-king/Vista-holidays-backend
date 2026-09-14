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

const router = Router();

// Health check route
router.use('/health', healthRoutes);

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

// Weather API routes
router.use('/weather', weatherRoutes);

// Image API routes
router.use('/images', imageRoutes);

// AI Travel Assistant routes
router.use('/ai', aiRoutes);

export default router;
