// lib/logger.ts
import pino from 'pino';
import path from 'path';
import fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Synchronous file logger – no worker threads
const logger = pino(
  {
    level: 'info',
  },
  pino.destination({
    dest: path.join(logDir, 'app.log'),
    sync: true, // critical for Next.js hot reload
  })
);

export { logger };

export function logApiRequest(endpoint: string, method: string, params: any) {
  const logParams = { ...params, signature: '[REDACTED]' };
  logger.info({ type: 'API_REQUEST', endpoint, method, params: logParams });
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] ${method} ${endpoint}`, logParams);
  }
}

export function logApiResponse(endpoint: string, response: any) {
  logger.info({ type: 'API_RESPONSE', endpoint, response });
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API] Response from ${endpoint}`, response);
  }
}

export function logApiError(endpoint: string, error: any) {
  const errMsg = error.response?.data?.msg || error.message || error;
  logger.error({ type: 'API_ERROR', endpoint, error: errMsg });
  if (process.env.NODE_ENV === 'development') {
    console.error(`[API] Error from ${endpoint}:`, errMsg);
  }
}


