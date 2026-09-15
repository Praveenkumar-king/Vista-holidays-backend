import { Router } from 'express';
import { getActiveAnnouncements } from '../controllers/announcementController.js';
import { optionalAuthenticate } from '../middleware/authenticate.js';

const router = Router();

// Public route to fetch currently active announcements for top bar
router.get('/active', optionalAuthenticate, getActiveAnnouncements);

export default router;
