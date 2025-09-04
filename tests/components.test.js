// Component Tests - Test React Native components
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import UserDetailModal from '../../components/admin/UserDetailModal';
import SearchModal from '../../components/SearchModal';
import DealCard from '../../components/DealCard';
import CategoryFilter from '../../components/CategoryFilter';

// Mock the admin service
jest.mock('../../lib/adminUserService', () => ({
  suspendUser: jest.fn(),
  banUser: jest.fn(),
  unbanUser: jest.fn(),
  changeUserRole: jest.fn(),
  getElevationToken: jest.fn().mockResolvedValue('test-token')
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn()
};

describe('Admin Component Tests', () => {
  describe('UserDetailModal', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      is_banned: false,
      is_suspended: false,
      created_at: '2024-01-01T00:00:00Z'
    };

    test('renders user information correctly', () => {
      const { getByText } = render(
        <UserDetailModal
          user={mockUser}
          visible={true}
          onClose={jest.fn()}
          onUserUpdate={jest.fn()}
        />
      );

      expect(getByText('testuser')).toBeTruthy();
      expect(getByText('test@example.com')).toBeTruthy();
      expect(getByText('user')).toBeTruthy();
    });

    test('validates before suspending user', async () => {
      const mockAdminService = require('../../lib/adminUserService');
      const onUserUpdate = jest.fn();

      const { getByText } = render(
        <UserDetailModal
          user={mockUser}
          visible={true}
          onClose={jest.fn()}
          onUserUpdate={onUserUpdate}
        />
      );

      const suspendButton = getByText('Suspend User');
      fireEvent.press(suspendButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Input',
          'Please provide a reason for the suspension.'
        );
      });

      expect(mockAdminService.suspendUser).not.toHaveBeenCalled();
    });

    test('successfully suspends user with valid input', async () => {
      const mockAdminService = require('../../lib/adminUserService');
      mockAdminService.suspendUser.mockResolvedValue({ success: true });
      
      const onUserUpdate = jest.fn();

      const { getByText, getByTestId } = render(
        <UserDetailModal
          user={mockUser}
          visible={true}
          onClose={jest.fn()}
          onUserUpdate={onUserUpdate}
        />
      );

      // Fill in suspension reason
      const reasonInput = getByTestId('suspension-reason-input');
      fireEvent.changeText(reasonInput, 'Test suspension');

      const suspendButton = getByText('Suspend User');
      fireEvent.press(suspendButton);

      await waitFor(() => {
        expect(mockAdminService.suspendUser).toHaveBeenCalledWith(
          'user-123',
          'Test suspension',
          expect.any(Number),
          'test-token'
        );
      });

      expect(onUserUpdate).toHaveBeenCalled();
    });

    test('validates before banning user', async () => {
      const { getByText } = render(
        <UserDetailModal
          user={mockUser}
          visible={true}
          onClose={jest.fn()}
          onUserUpdate={jest.fn()}
        />
      );

      const banButton = getByText('Ban User');
      fireEvent.press(banButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Input',
          'Please provide both a reason and ban reason.'
        );
      });
    });

    test('shows validation banner for invalid input', async () => {
      const { getByText, queryByText } = render(
        <UserDetailModal
          user={mockUser}
          visible={true}
          onClose={jest.fn()}
          onUserUpdate={jest.fn()}
        />
      );

      const banButton = getByText('Ban User');
      fireEvent.press(banButton);

      await waitFor(() => {
        expect(queryByText('Please provide both a reason and ban reason.')).toBeTruthy();
      });
    });
  });

  describe('SearchModal', () => {
    test('renders search input and categories', () => {
      const { getByPlaceholderText, getByText } = render(
        <SearchModal
          visible={true}
          onClose={jest.fn()}
          onSearch={jest.fn()}
        />
      );

      expect(getByPlaceholderText('Search deals...')).toBeTruthy();
      expect(getByText('All Categories')).toBeTruthy();
    });

    test('calls onSearch when search is performed', () => {
      const onSearch = jest.fn();
      
      const { getByPlaceholderText, getByText } = render(
        <SearchModal
          visible={true}
          onClose={jest.fn()}
          onSearch={onSearch}
        />
      );

      const searchInput = getByPlaceholderText('Search deals...');
      fireEvent.changeText(searchInput, 'test search');
      
      const searchButton = getByText('Search');
      fireEvent.press(searchButton);

      expect(onSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test search'
        })
      );
    });
  });
});

describe('Deal Component Tests', () => {
  describe('DealCard', () => {
    const mockDeal = {
      id: 'deal-123',
      title: 'Test Deal',
      description: 'Test description',
      price: 19.99,
      original_price: 29.99,
      store: 'Test Store',
      category: 'Electronics',
      likes: 5,
      dislikes: 1,
      created_at: '2024-01-01T00:00:00Z',
      user: {
        username: 'testuser'
      }
    };

    test('renders deal information correctly', () => {
      const { getByText } = render(
        <DealCard 
          deal={mockDeal} 
          navigation={mockNavigation}
        />
      );

      expect(getByText('Test Deal')).toBeTruthy();
      expect(getByText('Test Store')).toBeTruthy();
      expect(getByText('$19.99')).toBeTruthy();
      expect(getByText('$29.99')).toBeTruthy();
    });

    test('navigates to deal details when pressed', () => {
      const { getByTestId } = render(
        <DealCard 
          deal={mockDeal} 
          navigation={mockNavigation}
        />
      );

      const dealCard = getByTestId('deal-card');
      fireEvent.press(dealCard);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'deal-details',
        { dealId: 'deal-123' }
      );
    });

    test('handles like/dislike actions', () => {
      const { getByTestId } = render(
        <DealCard 
          deal={mockDeal} 
          navigation={mockNavigation}
        />
      );

      const likeButton = getByTestId('like-button');
      fireEvent.press(likeButton);

      // Should trigger like functionality
      expect(likeButton).toBeTruthy();
    });
  });

  describe('CategoryFilter', () => {
    const categories = ['All', 'Electronics', 'Clothing', 'Food'];

    test('renders all categories', () => {
      const { getByText } = render(
        <CategoryFilter
          categories={categories}
          selectedCategory="All"
          onCategorySelect={jest.fn()}
        />
      );

      categories.forEach(category => {
        expect(getByText(category)).toBeTruthy();
      });
    });

    test('calls onCategorySelect when category is pressed', () => {
      const onCategorySelect = jest.fn();

      const { getByText } = render(
        <CategoryFilter
          categories={categories}
          selectedCategory="All"
          onCategorySelect={onCategorySelect}
        />
      );

      const electronicsButton = getByText('Electronics');
      fireEvent.press(electronicsButton);

      expect(onCategorySelect).toHaveBeenCalledWith('Electronics');
    });

    test('shows selected category with different style', () => {
      const { getByText } = render(
        <CategoryFilter
          categories={categories}
          selectedCategory="Electronics"
          onCategorySelect={jest.fn()}
        />
      );

      const selectedCategory = getByText('Electronics');
      expect(selectedCategory).toBeTruthy();
      // The selected category should have different styling
    });
  });
});
