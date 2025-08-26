/**
 * Secure logging utility to prevent log injection attacks
 */

import { sanitizeLogMessage } from './sanitization';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.INFO;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const sanitizedMessage = sanitizeLogMessage(message);
    
    // Sanitize additional arguments
    const sanitizedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return sanitizeLogMessage(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return '[Circular Object]';
        }
      }
      return String(arg);
    });

    const levelName = LogLevel[level];
    const logEntry = `[${timestamp}] ${levelName}: ${sanitizedMessage}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logEntry, ...sanitizedArgs);
        break;
      case LogLevel.INFO:
        console.info(logEntry, ...sanitizedArgs);
        break;
      case LogLevel.WARN:
        console.warn(logEntry, ...sanitizedArgs);
        break;
      case LogLevel.ERROR:
        console.error(logEntry, ...sanitizedArgs);
        break;
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  // Security-focused logging methods
  securityEvent(event: string, details?: Record<string, any>) {
    const sanitizedEvent = sanitizeLogMessage(event);
    const sanitizedDetails = details ? JSON.stringify(details) : '';
    this.error(`SECURITY_EVENT: ${sanitizedEvent} ${sanitizedDetails}`);
  }

  authEvent(event: string, userId?: string, details?: Record<string, any>) {
    const sanitizedEvent = sanitizeLogMessage(event);
    const sanitizedUserId = userId ? sanitizeLogMessage(userId) : 'unknown';
    const sanitizedDetails = details ? JSON.stringify(details) : '';
    this.info(`AUTH_EVENT: ${sanitizedEvent} User: ${sanitizedUserId} ${sanitizedDetails}`);
  }
}

export const logger = new Logger();