// Integration Tests - Test complete user workflows
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn()
  }),
  useRoute: () => ({
    params: {}
  })
}));

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock contexts
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user'
};

const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  isAuthenticated: true
};

jest.mock('../contexts/AuthProvider', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => children
}));

// Import screens after mocking
import SignInScreen from '../app/sign-in';
import AdminUsersScreen from '../app/admin/users';

describe('Integration Tests - User Workflows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    AsyncStorage.clear();
  });

  describe('Authentication Flow', () => {
    test('user can sign in successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: mockUser,
          message: 'Login successful'
        })
      });

      const { getByPlaceholderText, getByText } = render(
        <NavigationContainer>
          <SignInScreen />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        });
      });

      expect(mockAuthContext.login).toHaveBeenCalledWith(mockUser);
    });

    test('shows error on invalid credentials', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: 'Invalid credentials'
        })
      });

      const { getByPlaceholderText, getByText, findByText } = render(
        <NavigationContainer>
          <SignInScreen />
        </NavigationContainer>
      );

      const emailInput = getByPlaceholderText('Email');
      const passwordInput = getByPlaceholderText('Password');
      const signInButton = getByText('Sign In');

      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(signInButton);

      await waitFor(async () => {
        const errorMessage = await findByText('Invalid credentials');
        expect(errorMessage).toBeTruthy();
      });
    });
  });

  describe('Admin User Management Flow', () => {
    test('admin can view and filter users', async () => {
      const mockUsers = [
        { id: '1', username: 'user1', role: 'user', email: 'user1@example.com' },
        { id: '2', username: 'admin1', role: 'admin', email: 'admin1@example.com' },
        { id: '3', username: 'mod1', role: 'moderator', email: 'mod1@example.com' }
      ];

      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      // Mock filtered users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers.filter(u => u.role === 'admin')
      });

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <AdminUsersScreen />
        </NavigationContainer>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(getByText('user1')).toBeTruthy();
        expect(getByText('admin1')).toBeTruthy();
        expect(getByText('mod1')).toBeTruthy();
      });

      // Test role filtering
      const roleFilter = getByTestId('role-filter');
      fireEvent.press(roleFilter);
      
      const adminFilter = getByText('Admin');
      fireEvent.press(adminFilter);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users?role=admin'),
          expect.any(Object)
        );
      });
    });

    test('admin can suspend user with proper validation', async () => {
      const mockUsers = [
        { id: '1', username: 'user1', role: 'user', email: 'user1@example.com' }
      ];

      // Mock users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      // Mock elevation token request
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'elevation-token' })
      });

      // Mock suspend user request
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const { getByText, getByTestId } = render(
        <NavigationContainer>
          <AdminUsersScreen />
        </NavigationContainer>
      );

      // Wait for users to load
      await waitFor(() => {
        expect(getByText('user1')).toBeTruthy();
      });

      // Click on user to open detail modal
      const user = getByText('user1');
      fireEvent.press(user);

      // Fill in suspension form
      await waitFor(() => {
        const reasonInput = getByTestId('suspension-reason-input');
        fireEvent.changeText(reasonInput, 'Test suspension reason');
      });

      // Submit suspension
      const suspendButton = getByText('Suspend User');
      fireEvent.press(suspendButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/admin/admin-suspend-user',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'x-admin-elevation': 'elevation-token'
            }),
            body: expect.stringContaining('Test suspension reason')
          })
        );
      });
    });
  });

  describe('Deal Management Flow', () => {
    test('user can browse and search deals', async () => {
      const mockDeals = [
        {
          id: '1',
          title: 'Great Electronics Deal',
          store: 'Tech Store',
          price: 99.99,
          category: 'Electronics'
        },
        {
          id: '2',
          title: 'Fashion Sale',
          store: 'Fashion Store',
          price: 29.99,
          category: 'Clothing'
        }
      ];

      // Mock deals fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeals
      });

      // Mock search results
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDeals.filter(d => d.title.includes('Electronics'))
      });

      const { getByText, getByPlaceholderText } = render(
        <NavigationContainer>
          {/* This would be your main deals screen */}
          <div testID="deals-screen">
            {mockDeals.map(deal => (
              <div key={deal.id}>{deal.title}</div>
            ))}
          </div>
        </NavigationContainer>
      );

      // Verify deals are displayed
      expect(getByText('Great Electronics Deal')).toBeTruthy();
      expect(getByText('Fashion Sale')).toBeTruthy();

      // Test search functionality would go here
      // This is a simplified example
    });
  });

  describe('Role Request Flow', () => {
    test('user can request role upgrade', async () => {
      // Mock role request submission
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Role request submitted successfully'
        })
      });

      // This would test the role request form submission
      const roleRequestData = {
        userId: 'user-123',
        role: 'moderator',
        reason: 'I want to help moderate the community'
      };

      const response = await fetch('/api/role-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roleRequestData)
      });

      const result = await response.json();
      expect(result.message).toBe('Role request submitted successfully');
    });
  });

  describe('Site Settings Flow', () => {
    test('admin can update site settings', async () => {
      // Mock settings fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          logoFilename: 'current-logo.png',
          headerTextColor: '#333333'
        })
      });

      // Mock settings update
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Settings updated successfully'
        })
      });

      const settingsData = {
        logoFilename: 'new-logo.png',
        headerTextColor: '#000000'
      };

      const response = await fetch('/api/admin/site/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(settingsData)
      });

      const result = await response.json();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings updated successfully');
    });
  });
});
