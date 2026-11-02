import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger, morganStream } from './config/logger.js';
import routes from './routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet());
const configuredOrigins = (env.clientUrl || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like health checks, mobile, curl)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, '');
      // Allow explicitly configured origins, local development, or Vercel domains
      if (
        configuredOrigins.includes(cleanOrigin) ||
        configuredOrigins.includes('*') ||
        env.nodeEnv === 'development' ||
        /\.vercel\.app$/.test(cleanOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));

if (env.nodeEnv !== 'test') {
  // Uses 'dev' format in development and 'tiny' format in production to log method, URL path, status, and response time
  const format = env.nodeEnv === 'production' ? 'tiny' : 'dev';
  app.use(morgan(format, { stream: morganStream }));
}

app.use(
  '/api/auth/login',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })
);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
