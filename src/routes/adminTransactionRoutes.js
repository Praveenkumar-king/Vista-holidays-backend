import { Router } from 'express';
import {
  getAdminTransactions,
  getTransactionSummary,
  getAdminTransactionById
} from '../controllers/adminTransactionController.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';

const router = Router();

// Protect all transaction routes: Require authenticated admin
router.use(authenticate, requireAdmin);

// 1. Transaction Summary & Metrics
router.get('/summary', getTransactionSummary);

// 2. All Transactions with Search & Filtering
router.get('/', getAdminTransactions);

// 3. Single Transaction Detail
router.get('/:id', getAdminTransactionById);

export default router;
