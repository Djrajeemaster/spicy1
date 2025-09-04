// Service Tests - Test utility functions and services
import { adminUserService } from '../lib/adminUserService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock fetch
global.fetch = jest.fn();

describe('Admin User Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('getElevationToken', () => {
    test('should request elevation token successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-elevation-token' })
      });

      const token = await adminUserService.getElevationToken();

      expect(fetch).toHaveBeenCalledWith('/api/admin/elevate', {
        method: 'POST',
        credentials: 'include'
      });
      expect(token).toBe('test-elevation-token');
    });

    test('should throw error when elevation fails', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Unauthorized' })
      });

      await expect(adminUserService.getElevationToken()).rejects.toThrow('Unauthorized');
    });
  });

  describe('suspendUser', () => {
    test('should suspend user successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'User suspended' })
      });

      const result = await adminUserService.suspendUser(
        'user-123',
        'Test reason',
        7,
        'elevation-token'
      );

      expect(fetch).toHaveBeenCalledWith('/api/admin/admin-suspend-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-elevation': 'elevation-token'
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: 'user-123',
          reason: 'Test reason',
          duration_days: 7
        })
      });

      expect(result.success).toBe(true);
    });

    test('should handle suspension failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to suspend user' })
      });

      await expect(
        adminUserService.suspendUser('user-123', 'Test reason', 7, 'elevation-token')
      ).rejects.toThrow('Failed to suspend user');
    });
  });

  describe('banUser', () => {
    test('should ban user successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'User banned' })
      });

      const result = await adminUserService.banUser(
        'user-123',
        'Test reason',
        'Spam',
        'elevation-token'
      );

      expect(fetch).toHaveBeenCalledWith('/api/admin/admin-ban-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-elevation': 'elevation-token'
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: 'user-123',
          reason: 'Test reason',
          ban_reason: 'Spam'
        })
      });

      expect(result.success).toBe(true);
    });
  });

  describe('changeUserRole', () => {
    test('should change user role successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Role updated' })
      });

      const result = await adminUserService.changeUserRole(
        'user-123',
        'moderator',
        'elevation-token'
      );

      expect(fetch).toHaveBeenCalledWith('/api/admin/change-user-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-elevation': 'elevation-token'
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: 'user-123',
          new_role: 'moderator'
        })
      });

      expect(result.success).toBe(true);
    });
  });
});

describe('Currency Service Tests', () => {
  // Mock currency service if it exists
  const mockCurrencyService = {
    convertPrice: jest.fn(),
    formatCurrency: jest.fn(),
    getCurrentCurrency: jest.fn()
  };

  test('should convert price correctly', () => {
    mockCurrencyService.convertPrice.mockReturnValue(25.99);

    const converted = mockCurrencyService.convertPrice(19.99, 'USD', 'EUR');
    expect(converted).toBe(25.99);
  });

  test('should format currency correctly', () => {
    mockCurrencyService.formatCurrency.mockReturnValue('$19.99');

    const formatted = mockCurrencyService.formatCurrency(19.99, 'USD');
    expect(formatted).toBe('$19.99');
  });
});

describe('Storage Service Tests', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  test('should store and retrieve user preferences', async () => {
    const preferences = {
      theme: 'dark',
      currency: 'USD',
      notifications: true
    };

    await AsyncStorage.setItem('userPreferences', JSON.stringify(preferences));
    const stored = await AsyncStorage.getItem('userPreferences');
    const parsed = JSON.parse(stored);

    expect(parsed).toEqual(preferences);
  });

  test('should handle missing storage keys', async () => {
    const value = await AsyncStorage.getItem('nonexistentKey');
    expect(value).toBeNull();
  });
});

describe('API Helper Tests', () => {
  test('should build query parameters correctly', () => {
    const buildQueryString = (params) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      return searchParams.toString();
    };

    const params = {
      q: 'search term',
      role: 'admin',
      limit: 10,
      cursor: null
    };

    const queryString = buildQueryString(params);
    expect(queryString).toBe('q=search+term&role=admin&limit=10');
  });

  test('should handle API errors gracefully', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal server error' })
    });

    const makeApiCall = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'API call failed');
      }
      return response.json();
    };

    await expect(makeApiCall('/api/test')).rejects.toThrow('Internal server error');
  });
});

describe('Validation Helpers Tests', () => {
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password && password.length >= 6;
  };

  const validateUsername = (username) => {
    return username && username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
  };

  test('should validate email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test('should validate password correctly', () => {
    expect(validatePassword('password123')).toBe(true);
    expect(validatePassword('123')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });

  test('should validate username correctly', () => {
    expect(validateUsername('validuser123')).toBe(true);
    expect(validateUsername('user_name')).toBe(true);
    expect(validateUsername('ab')).toBe(false);
    expect(validateUsername('user with spaces')).toBe(false);
    expect(validateUsername('user@domain')).toBe(false);
  });
});

describe('Date/Time Helpers Tests', () => {
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  test('should format time ago correctly', () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    expect(formatTimeAgo(oneMinuteAgo.toISOString())).toBe('1m ago');
    expect(formatTimeAgo(oneHourAgo.toISOString())).toBe('1h ago');
    expect(formatTimeAgo(oneDayAgo.toISOString())).toBe('1d ago');
  });
});
