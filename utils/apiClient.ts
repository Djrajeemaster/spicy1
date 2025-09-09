// utils/apiClient.ts
import { getApiUrl, config } from './config';
import { Platform } from 'react-native';

// Conditionally import AsyncStorage for React Native
let AsyncStorage: any = null;
if (Platform.OS !== 'web') {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
  } catch (e) {
    console.warn('AsyncStorage not available:', e);
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
  }

  private async getSessionId(): Promise<string | null> {
    try {
      // For React Native, get session from AsyncStorage
      if (Platform.OS !== 'web') {
        if (!AsyncStorage) {
          return null;
        }
        const sessionData = await AsyncStorage.getItem('user_session');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const sessionId = session.user_id || session.id;
          return sessionId;
        }
        return null;
      }
      return null;
    } catch (error) {
      console.error('Error getting session ID:', error);
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    
    // Build URL using getApiUrl which respects API_BASE_URL and production relative paths
    let url = getApiUrl(endpoint);
    // If on web and running on localhost and no API_BASE_URL was provided, allow localhost dev server
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && !config.API_BASE_URL) {
      const apiPath = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      url = `http://localhost:3000${apiPath}`;
    } else {
      url = `${config.API_BASE_URL}${endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`}`;
    }
    
    // Add query parameters if provided
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += `?${searchParams.toString()}`;
    }

    // Get session ID for React Native
    const sessionId = await this.getSessionId();
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId && Platform.OS !== 'web' ? { 'x-session-id': sessionId } : {}),
        ...fetchOptions.headers,
      },
    };

    // For web, use credentials: 'include', for React Native, rely on session header
    if (Platform.OS === 'web') {
      defaultOptions.credentials = 'include';
    }

    const finalOptions = { ...defaultOptions, ...fetchOptions };

    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        const responseText = await response.text();
        
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { error: responseText.substring(0, 200) + '...' };
        }
        
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      
      // Check if response is HTML instead of JSON
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        throw new Error('Server returned HTML instead of JSON. This usually means an error page was served.');
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('🔧 ApiClient: Failed to parse JSON:', parseError);
        console.error('🔧 ApiClient: Raw response:', responseText);
        throw new Error('Response is not valid JSON: ' + responseText.substring(0, 100));
      }
    } catch (error) {
      console.error(`🔧 API request failed for ${endpoint} (${url}):`, error);
      throw error;
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Upload file
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = getApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `Upload failed: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export for convenience
export default apiClient;