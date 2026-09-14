import { Router } from 'express';
import {
  getAdminProductUpdates,
  getAdminProductUpdateById,
  createProductUpdate,
  updateProductUpdate,
  updateProductUpdateStatus,
  deleteProductUpdate,
  uploadSlideImageHandler,
  deleteSlideImageHandler
} from '../controllers/productUpdateController.js';
import { uploadSlideImage } from '../middleware/uploadMiddleware.js';

const router = Router();

// Admin Image Upload & Management (Cloudinary)
router.post('/upload-image', uploadSlideImage, uploadSlideImageHandler);
router.delete('/image', deleteSlideImageHandler);

// Admin Product Update CRUD
router.get('/', getAdminProductUpdates);
router.post('/', createProductUpdate);
router.get('/:id', getAdminProductUpdateById);
router.put('/:id', updateProductUpdate);
router.patch('/:id/status', updateProductUpdateStatus);
router.delete('/:id', deleteProductUpdate);

export default router;
