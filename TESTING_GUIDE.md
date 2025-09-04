# Testing Documentation

## Automated Testing Setup for Saver's Dream App

This document outlines the comprehensive testing infrastructure implemented for the Saver's Dream App project.

### Test Structure

```
tests/
├── setup.js           # Global test setup and mocks
├── api.test.js        # API endpoint integration tests
├── components.test.js # React Native component tests
├── services.test.js   # Service layer and utility tests
└── integration.test.js # End-to-end workflow tests
```

### Test Categories

#### 1. API Integration Tests (`api.test.js`)
Tests all server endpoints and API functionality:

- **Authentication Endpoints**
  - User signup
  - User signin  
  - Session management

- **User Management Endpoints**
  - User filtering and search
  - Admin user actions (ban, suspend)
  - Role management

- **Site Settings Endpoints**
  - Settings retrieval
  - Settings updates
  - Permission validation

- **Role Management**
  - Role requests
  - Role approvals

#### 2. Component Tests (`components.test.js`)
Tests React Native UI components:

- **Admin Components**
  - UserDetailModal validation and actions
  - Input validation with visual feedback
  - Error handling and alerts

- **General Components**
  - SearchModal functionality
  - DealCard rendering and interactions
  - CategoryFilter selection

#### 3. Service Tests (`services.test.js`)
Tests utility functions and service layers:

- **Admin User Service**
  - Elevation token management
  - User suspension/banning
  - Role changes

- **Validation Helpers**
  - Email validation
  - Password validation
  - Username validation

- **Storage Services**
  - AsyncStorage operations
  - User preferences

- **API Helpers**
  - Query string building
  - Error handling

#### 4. Integration Tests (`integration.test.js`)
Tests complete user workflows:

- **Authentication Flow**
  - Complete signin process
  - Error handling for invalid credentials

- **Admin Workflows**
  - User management with validation
  - Role filtering and actions

- **Deal Management**
  - Deal browsing and searching

- **Settings Management**
  - Site configuration updates

### Running Tests

#### Quick Start
```bash
# Run all tests
node test-runner.js

# Install dependencies and run all tests
npm install
npm test
```

#### Individual Test Suites
```bash
# API endpoint tests
npm run test:api

# Component tests
npm run test:components

# Service tests  
npm run test:services

# Integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

#### Test Options
```bash
# Watch mode for development
npm run test:watch
node test-runner.js --watch

# Coverage only
node test-runner.js --coverage

# Help information
node test-runner.js --help
```

### Test Configuration

#### Jest Configuration (`jest.config.js`)
- Uses `jest-expo` preset for React Native/Expo compatibility
- Configured for component testing with React Native Testing Library
- Coverage collection from key directories
- Module name mapping for React Native modules

#### Test Setup (`tests/setup.js`)
- Comprehensive mocking for Expo modules
- React Native component mocks
- Global test utilities
- AsyncStorage and Alert mocking

### Mock Strategy

#### Expo Modules
- `expo-constants`: Mocked for app configuration
- `expo-router`: Mocked navigation functions
- `expo-linear-gradient`: Simplified gradient component
- `lucide-react-native`: Icon component mocks

#### React Native
- `Alert.alert`: Mocked for validation testing
- `AsyncStorage`: In-memory implementation
- Navigation: Mocked navigation functions

#### API Calls
- `fetch`: Comprehensive mocking for different scenarios
- Database queries: Mocked PostgreSQL pool

### Coverage Targets

The test suite covers:
- ✅ Authentication endpoints and flows
- ✅ Admin user management actions
- ✅ Validation systems and error handling
- ✅ Component rendering and interactions
- ✅ Service layer functionality
- ✅ Complete user workflows
- ✅ Error scenarios and edge cases

### Test Data

#### Mock Users
```javascript
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  is_banned: false,
  is_suspended: false
};
```

#### Mock Deals
```javascript
const mockDeal = {
  id: 'deal-123',
  title: 'Test Deal',
  price: 19.99,
  original_price: 29.99,
  store: 'Test Store'
};
```

### Continuous Integration

The test runner script (`test-runner.js`) provides:
- Automated dependency installation
- Sequential test execution
- Detailed progress reporting
- Coverage report generation
- Error handling and troubleshooting tips

### Troubleshooting

#### Common Issues
1. **Missing Dependencies**: Run `npm install` to install testing packages
2. **Port Conflicts**: Ensure server is not running during API tests
3. **Database Connections**: API tests use mocked database calls
4. **Module Resolution**: Check Jest configuration for module mapping

#### Debug Mode
For detailed test output:
```bash
npm test -- --verbose
```

### Future Enhancements

Potential testing improvements:
- Visual regression testing for UI components
- Performance testing for API endpoints
- Accessibility testing for React Native components
- End-to-end testing with Detox
- Automated browser testing for web version
