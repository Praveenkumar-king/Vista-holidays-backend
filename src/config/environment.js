import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve explicit path to server/.env regardless of process.cwd()
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEnvPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: serverEnvPath });
dotenv.config(); // fallback

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173,https://vista-holidays-frontend.vercel.app',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vista_holidays',
  jwtSecret: process.env.JWT_SECRET || 'vista_holidays_secure_jwt_secret_dev_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@vistaholidays.com',
  brevo: {
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.BREVO_SMTP_PORT, 10) || 587,
    user: process.env.BREVO_SMTP_USER || '',
    password: process.env.BREVO_SMTP_PASSWORD || '',
    fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@vistaholidays.com',
    fromName: process.env.BREVO_FROM_NAME || 'Vista Holidays'
  },
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  pexelsApiKey: process.env.PEXELS_API_KEY || process.env.IMAGE_API_KEY || '',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'vista-holidays/product-updates'
  }
};

export default config;
