/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitizes HTML content by removing potentially dangerous elements and attributes
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ''); // Remove form tags
}

/**
 * Sanitizes text input for safe display
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim()
    .substring(0, 1000); // Limit length
}

/**
 * Validates and sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = email.toLowerCase().trim();
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitizes usernames to prevent injection
 */
export function sanitizeUsername(username: string): string {
  if (!username || typeof username !== 'string') return '';
  
  return username
    .replace(/[^a-zA-Z0-9_-]/g, '') // Only allow alphanumeric, underscore, hyphen
    .trim()
    .substring(0, 50); // Limit length
}

/**
 * Sanitizes search queries
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 200); // Limit length
}

/**
 * Validates and sanitizes URLs
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitizes log messages to prevent log injection
 */
export function sanitizeLogMessage(message: string): string {
  if (!message || typeof message !== 'string') return '';
  
  return message
    .replace(/[\r\n]/g, ' ') // Replace newlines with spaces
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .trim()
    .substring(0, 500); // Limit length
}