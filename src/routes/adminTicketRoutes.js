import { Router } from 'express';
import { getAllTickets } from '../controllers/adminTicketController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getAllTickets);

export default router;
