// utils/api.ts
export const getApiBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or default
    return process.env.API_BASE_URL || 'http://localhost:3000';
  }
  
  // Client-side: check if running in development mode
  if (window.location.port === '8081') {
    // Expo dev server running on 8081, API on 3000
    return 'http://localhost:3000';
  }
  
  // Production or same-origin requests
  return '';
};

export const apiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
};

export const assetUrl = (filename: string): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/${filename}`;
};
