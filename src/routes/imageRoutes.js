import { Router } from 'express';
import imageController from '../controllers/imageController.js';

const router = Router();

// GET /api/images/search?query=...&perPage=...
router.get('/search', imageController.searchImages);

export default router;
