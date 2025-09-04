// utils/api.ts
import { config, getApiUrl, getAssetUrl } from './config';

// Backward compatibility exports
export const getApiBaseUrl = (): string => {
  return config.API_BASE_URL;
};

export const apiUrl = (path: string): string => {
  return getApiUrl(path);
};

export const assetUrl = (filename: string): string => {
  return getAssetUrl(filename);
};

// New recommended exports
export { config, getApiUrl, getAssetUrl } from './config';

// Export for direct use
export const API_BASE_URL = config.API_BASE_URL;