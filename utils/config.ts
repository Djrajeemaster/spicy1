// utils/config.ts
export interface AppConfig {
  API_BASE_URL: string;
  WS_BASE_URL?: string;
  ENVIRONMENT: 'development' | 'production' | 'staging';
  IS_LOCAL: boolean;
}

// Environment detection
const getEnvironment = (): 'development' | 'production' | 'staging' => {
  if (typeof window === 'undefined') {
    // Server-side
    return (process.env.NODE_ENV as any) || 'development';
  }
  
  // Client-side environment detection
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
    return 'development';
  }
  
  // You can add staging detection here based on your VPS staging domain
  if (hostname.includes('staging') || hostname.includes('dev')) {
    return 'staging';
  }
  
  return 'production';
};

const isLocal = (): boolean => {
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.NODE_ENV !== 'production';
  }
  
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
};

const getApiBaseUrl = (): string => {
  const environment = getEnvironment();
  const local = isLocal();
  
  // Priority order: Environment variable -> Default based on environment
  if (typeof window === 'undefined') {
    // Server-side
    return process.env.API_BASE_URL || (local ? 'http://localhost:3000' : '');
  }
  
  // Client-side
  if (local) {
    // Development: Explicit localhost with port
    return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  }
  
  // Production/VPS: Use relative URLs (no domain)
  return '';
};

// Create the configuration object
export const config: AppConfig = {
  API_BASE_URL: getApiBaseUrl(),
  WS_BASE_URL: getApiBaseUrl().replace('http', 'ws'),
  ENVIRONMENT: getEnvironment(),
  IS_LOCAL: isLocal(),
};

// Helper functions
export const getApiUrl = (path: string): string => {
  const baseUrl = config.API_BASE_URL;
  // Ensure path starts with /api if it doesn't already
  const apiPath = path.startsWith('/api') ? path : `/api${path}`;
  return `${baseUrl}${apiPath}`;
};

export const getAssetUrl = (filename: string): string => {
  const baseUrl = config.API_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  // Remove /api from base URL for assets
  const assetBaseUrl = baseUrl.replace(/\/api$/, '');
  // Remove leading slashes from filename
  let cleanFilename = filename.replace(/^\/+/, '');
  // Prevent double assets in path - remove assets/ prefix if it exists
  if (cleanFilename.startsWith('assets/')) {
    cleanFilename = cleanFilename.replace(/^assets\//, '');
  }
  return `${assetBaseUrl}/assets/${cleanFilename}`;
};

// Get the full domain URL for sharing and external links
export const getDomainUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.DOMAIN_URL || process.env.API_BASE_URL || 'http://localhost:3000';
  }
  
  // Client-side: use current origin
  return window.location.origin;
};

// Get full URL for sharing deals, routes, etc.
export const getShareUrl = (path: string): string => {
  const domain = getDomainUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${domain}${cleanPath}`;
};

// For backward compatibility
export const API_BASE_URL = config.API_BASE_URL;

// Debug helper (remove in production)
export const logConfig = () => {
  console.log('🔧 App Configuration:', {
    API_BASE_URL: config.API_BASE_URL,
    DOMAIN_URL: getDomainUrl(),
    ENVIRONMENT: config.ENVIRONMENT,
    IS_LOCAL: config.IS_LOCAL,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  });
};