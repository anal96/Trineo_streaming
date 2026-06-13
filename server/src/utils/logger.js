import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.resolve('logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const auditLogPath = path.join(LOGS_DIR, 'audit.log');

export const logEvent = (category, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const logObj = {
    timestamp,
    category,
    message,
    metadata
  };

  const logStr = JSON.stringify(logObj);
  console.log(`[AUDIT - ${category.toUpperCase()}] ${message} | Metadata: ${JSON.stringify(metadata)}`);
  
  try {
    fs.appendFileSync(auditLogPath, logStr + '\n');
  } catch (err) {
    console.error('Failed to write audit logs:', err);
  }
};

export const logSecurity = (message, metadata = {}) => logEvent('security', message, metadata);
export const logStreaming = (message, metadata = {}) => logEvent('streaming', message, metadata);
export const logAuth = (message, metadata = {}) => logEvent('auth', message, metadata);
export const logPayment = (message, metadata = {}) => logEvent('payment', message, metadata);
