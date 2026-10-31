import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';

await connectDB();
const server = app.listen(env.port, () => {
  logger.info(`Tvisha ERP API server listening on port ${env.port} [Environment: ${env.nodeEnv}]`);
});

const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
