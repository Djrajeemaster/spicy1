/**
 * Centralized error handling utility
 */

import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  static handle(error: any, context?: string): AppError {
    const timestamp = new Date();
    
    // Sanitize error for logging
    let sanitizedError: AppError;
    
    if (error instanceof Error) {
      sanitizedError = {
        code: error.name || 'UnknownError',
        message: error.message || 'An unknown error occurred',
        details: error.stack ? { stack: error.stack.substring(0, 500) } : undefined,
        timestamp
      };
    } else if (typeof error === 'object' && error !== null) {
      sanitizedError = {
        code: error.code || error.name || 'UnknownError',
        message: error.message || 'An unknown error occurred',
        details: error.details || undefined,
        timestamp
      };
    } else {
      sanitizedError = {
        code: 'UnknownError',
        message: String(error) || 'An unknown error occurred',
        timestamp
      };
    }

    // Log the error
    if (context) {
      logger.error(`Error in ${context}`, sanitizedError);
    } else {
      logger.error('Application error', sanitizedError);
    }

    return sanitizedError;
  }

  static handleAsync<T>(
    promise: Promise<T>,
    context?: string
  ): Promise<[AppError | null, T | null]> {
    return promise
      .then<[null, T]>((data: T) => [null, data])
      .catch<[AppError, null]>((error: any) => [
        ErrorHandler.handle(error, context),
        null
      ]);
  }

  static getUserFriendlyMessage(error: AppError): string {
    switch (error.code) {
      case 'NetworkError':
      case 'TypeError':
        return 'Connection error. Please check your internet connection and try again.';
      
      case 'ValidationError':
        return 'Please check your input and try again.';
      
      case 'AuthenticationError':
      case 'Unauthorized':
        return 'Please sign in to continue.';
      
      case 'PermissionError':
      case 'Forbidden':
        return 'You do not have permission to perform this action.';
      
      case 'NotFoundError':
        return 'The requested resource was not found.';
      
      case 'RateLimitError':
        return 'Too many requests. Please wait a moment and try again.';
      
      case 'ServerError':
      case 'InternalServerError':
        return 'Server error. Please try again later.';
      
      default:
        return error.message || 'An unexpected error occurred. Please try again.';
    }
  }

  static isRetryableError(error: AppError): boolean {
    const retryableCodes = [
      'NetworkError',
      'TimeoutError',
      'ServerError',
      'InternalServerError',
      'ServiceUnavailable',
      'BadGateway',
      'GatewayTimeout'
    ];
    
    return retryableCodes.includes(error.code);
  }

  static shouldShowToUser(error: AppError): boolean {
    const hiddenCodes = [
      'SecurityError',
      'CSRFError',
      'ValidationError' // These should be handled specifically
    ];
    
    return !hiddenCodes.includes(error.code);
  }
}

// Utility function for wrapping async operations
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: string
): Promise<[AppError | null, T | null]> {
  try {
    const result = await operation();
    return [null, result];
  } catch (error) {
    return [ErrorHandler.handle(error, context), null];
  }
}

// Utility function for wrapping sync operations
export function safeSync<T>(
  operation: () => T,
  context?: string
): [AppError | null, T | null] {
  try {
    const result = operation();
    return [null, result];
  } catch (error) {
    return [ErrorHandler.handle(error, context), null];
  }
}