import app from './app.js';
import config from './config/environment.js';
import logger from './utils/logger.js';

const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info(`Health check available at http://localhost:${PORT}/api/health`);
});
