import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfileImageHandler,
  removeProfileImageHandler,
  getUserDashboardSummary,
  toggleSavedDestination,
  changePassword
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { uploadProfileImage } from '../middleware/uploadMiddleware.js';

const router = Router();

// All user profile and dashboard operations require authentication
router.use(authenticate);

// Profile
router.get('/me', getUserProfile);
router.put('/profile', updateUserProfile);

// Profile Image (Cloudinary)
router.post('/profile-image', uploadProfileImage, uploadProfileImageHandler);
router.delete('/profile-image', removeProfileImageHandler);

// Dashboard Summary & Telemetry
router.get('/dashboard-summary', getUserDashboardSummary);

// Saved Destinations (Wishlist)
router.post('/saved-destinations/toggle', toggleSavedDestination);

// Security
router.put('/change-password', changePassword);

export default router;
