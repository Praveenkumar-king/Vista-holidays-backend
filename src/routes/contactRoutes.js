import { Router } from 'express';
import {
  submitContact,
  getContactMessages,
  getContactMessageById,
  updateContactStatus,
  sendAdminMessage,
  deleteContactMessage,
  deleteAllContactMessages
} from '../controllers/contactController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

// Public submission
router.post('/', submitContact);

// Admin Directory & Detail APIs (Protected)
router.get('/', authenticate, requireAdmin, getContactMessages);
router.get('/:id', authenticate, requireAdmin, getContactMessageById);
router.patch('/:id/status', authenticate, requireAdmin, updateContactStatus);
router.post('/:id/messages', authenticate, requireAdmin, sendAdminMessage);
router.delete('/:id', authenticate, requireAdmin, deleteContactMessage);
router.delete('/', authenticate, requireAdmin, deleteAllContactMessages);

export default router;
