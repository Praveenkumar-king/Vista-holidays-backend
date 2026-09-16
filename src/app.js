import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import config from './config/environment.js';
import routes from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Strict allowlist: ONLY exact approved frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://vista-holidays-frontend.vercel.app'
];

// CORS configuration with credentials support for cookies
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, health probes)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/+$/, '');

    // Allow strictly approved origins only (exact match)
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy: Access denied for origin '${origin}'.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Cookie parser middleware for reading HttpOnly auth session cookies
app.use(cookieParser());

// Body parsing middleware
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP request logger
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', routes);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
