/** Winston structured JSON logger. Console in dev, JSON files in prod. */
import winston from 'winston';
import { env, isProd } from './env';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(errors({ stack: true }), timestamp()),
  defaultMeta: { service: 'wattsstore-api' },
  transports: [
    new winston.transports.Console({
      format: isProd ? json() : combine(colorize(), devFormat),
    }),
  ],
});

if (isProd) {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error', format: json() }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log', format: json() }));
}

void env; // ensure env validated before logging starts
