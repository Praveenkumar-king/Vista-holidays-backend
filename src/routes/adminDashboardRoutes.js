import { Router } from 'express';
import { getDashboardOverview } from '../controllers/adminDashboardController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/overview', getDashboardOverview);

export default router;
