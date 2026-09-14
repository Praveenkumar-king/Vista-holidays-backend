import { Router } from 'express';
import { trackTicket } from '../controllers/ticketController.js';

const router = Router();

// Public Ticket Status Tracking
router.post('/track', trackTicket);

export default router;
