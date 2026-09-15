import { Router } from 'express';
import { getPublicPlatformStatus } from '../controllers/platformSettingsController.js';

const router = Router();

// Public platform health & maintenance status check
router.get('/status', getPublicPlatformStatus);

export default router;
