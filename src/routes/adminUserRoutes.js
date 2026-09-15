import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUserStatus,
  deleteUser
} from '../controllers/adminUserController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

// All routes require valid admin session
router.use(authenticate, requireAdmin);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.patch('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

export default router;
