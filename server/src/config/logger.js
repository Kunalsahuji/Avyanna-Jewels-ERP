import path from 'path';
import { fileURLToPath } from 'url';
import winston from 'winston';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, '../../logs');

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Regex to strip ANSI escape codes for file transports
const stripAnsi = (str) => (typeof str === 'string' ? str.replace(/\x1b\[[0-9;]*m/g, '') : str);

// Custom format to strip ANSI codes before writing to disk
const cleanFileFormat = winston.format((info) => {
  if (info.message) info.message = stripAnsi(info.message);
  return info;
});

// Human-readable dev console format
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaClean = { ...meta };
  delete metaClean.service;
  const metaStr = Object.keys(metaClean).length ? ` ${JSON.stringify(metaClean)}` : '';
  const errStack = stack ? `\n${stack}` : '';
  return `[${timestamp}] ${level}: ${message}${metaStr}${errStack}`;
});

export const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'http' : 'debug',
  format: combine(
    cleanFileFormat(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'avyanna-erp-api' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      level: 'http',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
    }),
  ],
});

// Console logging
if (env.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      level: 'debug',
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      level: 'http',
      format: combine(timestamp(), json()),
    })
  );
}

// Morgan HTTP stream interface
export const morganStream = {
  write: (message) => {
    const trimmed = message.trim();
    if (trimmed) {
      logger.http(trimmed);
    }
  },
};
