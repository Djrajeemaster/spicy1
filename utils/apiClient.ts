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
        console.log('🔧 ApiClient: Detected React Native platform, getting session from AsyncStorage');
        if (!AsyncStorage) {
          console.warn('🔧 ApiClient: AsyncStorage not available');
          return null;
        }
        const sessionData = await AsyncStorage.getItem('user_session');
        console.log('🔧 ApiClient: Retrieved session data from AsyncStorage:', sessionData ? 'Present' : 'Null');
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const sessionId = session.user_id || session.id;
          console.log('🔧 ApiClient: Extracted session ID:', sessionId);
          return sessionId;
        }
        console.log('🔧 ApiClient: No session data found in AsyncStorage');
        return null;
      }
      console.log('🔧 ApiClient: Web platform detected, using cookies');
      return null;
    } catch (error) {
      console.error('🔧 ApiClient: Error getting session ID:', error);
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
      console.log('🔧 ApiClient: DEV fallback to localhost API:', url);
    } else {
      console.log('🔧 ApiClient: Making request to URL:', url);
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

    console.log('🔧 ApiClient: Final headers:', JSON.stringify(defaultOptions.headers, null, 2));
    console.log('🔧 ApiClient: Platform:', Platform.OS);
    console.log('🔧 ApiClient: Session ID available:', !!sessionId);

    // For web, use credentials: 'include', for React Native, rely on session header
    if (Platform.OS === 'web') {
      defaultOptions.credentials = 'include';
    }

    const finalOptions = { ...defaultOptions, ...fetchOptions };

    try {
      console.log('🔧 ApiClient: Making request to:', url, 'with method:', finalOptions.method || 'GET');
      console.log('🔧 ApiClient: Session ID header:', sessionId && Platform.OS !== 'web' ? 'Present' : 'Not used');
      const response = await fetch(url, finalOptions);
      console.log('🔧 ApiClient: Response status:', response.status);
      console.log('🔧 ApiClient: Response URL:', response.url);
      console.log('🔧 ApiClient: Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const responseText = await response.text();
        console.log('🔧 ApiClient: Error response body:', responseText);
        
        let error;
        try {
          error = JSON.parse(responseText);
        } catch {
          error = { error: responseText.substring(0, 200) + '...' };
        }
        
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('🔧 ApiClient: Success response received');
      console.log('🔧 ApiClient: Response content type:', response.headers.get('content-type'));
      
      // Check if response is HTML instead of JSON
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('🔧 ApiClient: RECEIVED HTML INSTEAD OF JSON!');
        console.error('🔧 ApiClient: Full HTML response:', responseText);
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
    console.log('apiClient: DELETE request to endpoint:', endpoint);
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