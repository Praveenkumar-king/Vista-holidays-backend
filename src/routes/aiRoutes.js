import { Router } from 'express';
import aiController from '../controllers/aiController.js';

const router = Router();

// POST /api/ai/chat
router.post('/chat', aiController.chat);

// POST /api/ai/itinerary
router.post('/itinerary', aiController.generateItinerary);

export default router;
