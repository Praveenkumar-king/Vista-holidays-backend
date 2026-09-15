import { Router } from 'express';
import {
  getAdminAnnouncements,
  createAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
  toggleAnnouncementStatus,
  deleteAnnouncement
} from '../controllers/announcementController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', getAdminAnnouncements);
router.post('/', createAnnouncement);
router.get('/:id', getAnnouncementById);
router.put('/:id', updateAnnouncement);
router.patch('/:id/status', toggleAnnouncementStatus);
router.delete('/:id', deleteAnnouncement);

export default router;
