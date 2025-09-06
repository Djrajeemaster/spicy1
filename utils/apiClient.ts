// utils/apiClient.ts
import { getApiUrl, config } from './config';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    
    // FORCE the correct API URL for development
    let url;
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Force localhost:3000 for development
      const apiPath = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
      url = `http://localhost:3000${apiPath}`;
      console.log('🔧 ApiClient: FORCED URL for development:', url);
    } else {
      url = getApiUrl(endpoint);
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

    const defaultOptions: RequestInit = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    };

    const finalOptions = { ...defaultOptions, ...fetchOptions };

    try {
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
      console.log('🔧 ApiClient: Success response body (first 500 chars):', responseText.substring(0, 500));
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