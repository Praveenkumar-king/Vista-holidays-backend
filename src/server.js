import app from './app.js';
import config from './config/environment.js';
import logger from './utils/logger.js';
import { connectDB } from './config/database.js';

const PORT = config.port;

// Initialize database connection
connectDB()
  .catch((err) => {
    logger.error(`MongoDB initial connection error: ${err.message}`);
  })
  .finally(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on http://localhost:${PORT}`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
      logger.info(`Auth routes available at http://localhost:${PORT}/api/auth`);
    });
  });
