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

const router = Router();

// Public submission
router.post('/', submitFeedback);

// Admin Directory & Detail APIs
router.get('/', getFeedbackMessages);
router.get('/:id', getFeedbackMessageById);
router.patch('/:id/status', updateFeedbackStatus);
router.post('/:id/messages', sendFeedbackAdminMessage);
router.delete('/:id', deleteFeedbackMessage);
router.delete('/', deleteAllFeedbackMessages);

export default router;
