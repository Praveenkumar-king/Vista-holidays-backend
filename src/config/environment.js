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
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || 'https://vista-holidays-frontend.vercel.app',
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '',
  pexelsApiKey: process.env.PEXELS_API_KEY || process.env.IMAGE_API_KEY || ''
};

export default config;
