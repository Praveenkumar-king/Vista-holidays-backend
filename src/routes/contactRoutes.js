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

const router = Router();

// Public submission
router.post('/', submitContact);

// Admin Directory & Detail APIs
router.get('/', getContactMessages);
router.get('/:id', getContactMessageById);
router.patch('/:id/status', updateContactStatus);
router.post('/:id/messages', sendAdminMessage);
router.delete('/:id', deleteContactMessage);
router.delete('/', deleteAllContactMessages);

export default router;
