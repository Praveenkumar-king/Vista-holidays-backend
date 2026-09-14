import { Router } from 'express';
import {
  submitFeedback,
  getFeedbackMessages,
  getFeedbackMessageById,
  updateFeedbackStatus,
  sendFeedbackAdminMessage,
  deleteFeedbackMessage,
  deleteAllFeedbackMessages
} from '../controllers/feedbackController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

// Public submission
router.post('/', submitFeedback);

// Admin Directory & Detail APIs (Protected)
router.get('/', authenticate, requireAdmin, getFeedbackMessages);
router.get('/:id', authenticate, requireAdmin, getFeedbackMessageById);
router.patch('/:id/status', authenticate, requireAdmin, updateFeedbackStatus);
router.post('/:id/messages', authenticate, requireAdmin, sendFeedbackAdminMessage);
router.delete('/:id', authenticate, requireAdmin, deleteFeedbackMessage);
router.delete('/', authenticate, requireAdmin, deleteAllFeedbackMessages);

export default router;
