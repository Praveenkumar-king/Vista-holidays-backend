import { Router } from 'express';
import {
  getUnseenProductUpdate,
  markProductUpdateSeen
} from '../controllers/productUpdateController.js';
import { authenticate, optionalAuthenticate } from '../middleware/authenticate.js';

const router = Router();

// Check for unseen published update (evaluates authenticated user session if present)
router.get('/unseen', optionalAuthenticate, getUnseenProductUpdate);

// Mark update as seen (strictly requires authentication)
router.post('/:id/seen', authenticate, markProductUpdateSeen);

export default router;
