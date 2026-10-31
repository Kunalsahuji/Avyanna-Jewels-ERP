import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export async function connectDB() {
  const dbName = env.mongoUri.split('/').pop()?.split('?')[0] || 'erp';
  logger.info(`Connecting to MongoDB database: [${dbName}]`);
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri);
    logger.info(`MongoDB successfully connected to [${dbName}]`);
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`, { stack: err.stack });
    throw err;
  }
}
