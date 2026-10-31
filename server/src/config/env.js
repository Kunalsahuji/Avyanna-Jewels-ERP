import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'rahul@tvishajewlz.com',
  seedPassword: process.env.SEED_DEFAULT_PASSWORD || 'Password@123',
  seedDomain: process.env.SEED_DOMAIN || 'tvishajewlz.com',
};
