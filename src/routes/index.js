import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import weatherRoutes from './weatherRoutes.js';
import imageRoutes from './imageRoutes.js';
import aiRoutes from './aiRoutes.js';

const router = Router();

// Health check route
router.use('/health', healthRoutes);

// Weather API routes
router.use('/weather', weatherRoutes);

// Image API routes
router.use('/images', imageRoutes);

// AI Travel Assistant routes
router.use('/ai', aiRoutes);

export default router;
