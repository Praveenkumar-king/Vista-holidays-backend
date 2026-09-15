import { Router } from 'express';
import { getAnalytics } from '../controllers/adminAnalyticsController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getAnalytics);

export default router;
