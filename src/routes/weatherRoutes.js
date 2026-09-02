import { Router } from 'express';
import weatherController from '../controllers/weatherController.js';

const router = Router();

// GET /api/weather/current?lat=...&lon=...
router.get('/current', weatherController.getCurrentWeather);

export default router;
