import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getMaintenance,
  toggleMaintenance,
  updateMaintenanceCopy
} from '../controllers/platformSettingsController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate, requireAdmin);

// Platform Settings
router.get('/', getSettings);
router.put('/', updateSettings);

// Maintenance Mode
router.get('/maintenance', getMaintenance);
router.post('/maintenance/toggle', toggleMaintenance);
router.put('/maintenance/copy', updateMaintenanceCopy);

export default router;
