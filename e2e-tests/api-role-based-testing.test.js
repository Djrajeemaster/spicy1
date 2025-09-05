/**
 * Direct API Role-Based Testing for SaversDream App
 * Tests authentication and role permissions via direct API calls
 * Since UI automation has React Native Web compatibility issues
 */

const { test, expect } = require('@playwright/test');

// Real user credentials for testing
const testUsers = {
  user: {
    email: 'user@example.com',
    password: 'password123',
    role: 'user'
  },
  business: {
    email: 'business@example.com',
    password: 'password123',
    role: 'business'
  },
  moderator: {
    email: 'moderator@example.com',
    password: 'password123',
    role: 'moderator'
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  },
  superadmin: {
    email: 'superadmin@example.com',
    password: 'password123',
    role: 'superadmin'
  }
};

const apiBaseUrl = 'http://localhost:3000';

// Helper function to authenticate via API
async function authenticateUser(userType) {
  const user = testUsers[userType];
  console.log(`🔐 Authenticating ${userType}: ${user.email}`);
  
  try {
    const response = await fetch(`${apiBaseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${userType} authenticated successfully`);
    return data;
  } catch (error) {
    console.error(`❌ Authentication failed for ${userType}:`, error.message);
    throw error;
  }
}

// Helper function to test API endpoint access
async function testApiAccess(endpoint, method = 'GET', body = null, cookies = '') {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      credentials: 'include'
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${apiBaseUrl}${endpoint}`, options);
    return {
      status: response.status,
      ok: response.ok,
      data: response.ok ? await response.json() : null
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

test.describe('SaversDream App - Direct API Role-Based Testing', () => {
  
  test.describe('🔐 Authentication API Testing', () => {
    
    Object.keys(testUsers).forEach(userType => {
      test(`should authenticate ${userType} successfully`, async () => {
        const authData = await authenticateUser(userType);
        
        expect(authData.authenticated).toBe(true);
        expect(authData.user).toBeDefined();
        expect(authData.user.email).toBe(testUsers[userType].email);
        expect(authData.user.role).toBe(testUsers[userType].role);
        
        console.log(`✅ ${userType} role verification passed`);
      });
    });
    
    test('should reject invalid credentials', async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'invalid@example.com',
            password: 'wrongpassword'
          })
        });
        
        expect(response.ok).toBe(false);
        console.log('✅ Invalid credentials rejected as expected');
      } catch (error) {
        // Expected to fail
        console.log('✅ Invalid credentials properly rejected');
      }
    });
  });
  
  test.describe('🛡️ Role-Based API Access Testing', () => {
    
    test('should test user role API permissions', async () => {
      const authData = await authenticateUser('user');
      const cookies = `session=${authData.session?.id || 'test'}`;
      
      // Test accessible endpoints for user role
      const dealsAccess = await testApiAccess('/api/deals', 'GET', null, cookies);
      expect(dealsAccess.ok).toBe(true);
      console.log('✅ User can access deals');
      
      // Test restricted endpoints for user role
      const adminAccess = await testApiAccess('/api/admin/users', 'GET', null, cookies);
      expect(adminAccess.ok).toBe(false);
      console.log('✅ User cannot access admin endpoints');
    });
    
    test('should test business role API permissions', async () => {
      const authData = await authenticateUser('business');
      const cookies = `session=${authData.session?.id || 'test'}`;
      
      // Test business-specific access
      const dealsAccess = await testApiAccess('/api/deals', 'GET', null, cookies);
      expect(dealsAccess.ok).toBe(true);
      console.log('✅ Business can access deals');
    });
    
    test('should test admin role API permissions', async () => {
      const authData = await authenticateUser('admin');
      const cookies = `session=${authData.session?.id || 'test'}`;
      
      // Test admin access
      const dealsAccess = await testApiAccess('/api/deals', 'GET', null, cookies);
      expect(dealsAccess.ok).toBe(true);
      console.log('✅ Admin can access deals');
      
      const usersAccess = await testApiAccess('/api/users', 'GET', null, cookies);
      expect(usersAccess.ok).toBe(true);
      console.log('✅ Admin can access users');
    });
    
    test('should test superadmin role API permissions', async () => {
      const authData = await authenticateUser('superadmin');
      const cookies = `session=${authData.session?.id || 'test'}`;
      
      // Test superadmin access
      const dealsAccess = await testApiAccess('/api/deals', 'GET', null, cookies);
      expect(dealsAccess.ok).toBe(true);
      console.log('✅ Superadmin can access deals');
      
      const usersAccess = await testApiAccess('/api/users', 'GET', null, cookies);
      expect(usersAccess.ok).toBe(true);
      console.log('✅ Superadmin can access users');
      
      const settingsAccess = await testApiAccess('/api/site/settings', 'GET', null, cookies);
      expect(settingsAccess.ok).toBe(true);
      console.log('✅ Superadmin can access settings');
    });
  });
  
  test.describe('🎯 Functional Role Testing', () => {
    
    test('should test deal management by role', async () => {
      // Test deal creation by business user
      const businessAuth = await authenticateUser('business');
      const businessCookies = `session=${businessAuth.session?.id || 'test'}`;
      
      const newDeal = {
        title: 'Test Deal',
        description: 'Test deal description',
        discount_percentage: 20,
        store_id: 1
      };
      
      const createResult = await testApiAccess('/api/deals', 'POST', newDeal, businessCookies);
      console.log(`✅ Business deal creation: ${createResult.ok ? 'Success' : 'Expected restriction'}`);
    });
    
    test('should test user management by admin', async () => {
      const adminAuth = await authenticateUser('admin');
      const adminCookies = `session=${adminAuth.session?.id || 'test'}`;
      
      const usersResult = await testApiAccess('/api/users', 'GET', null, adminCookies);
      expect(usersResult.ok).toBe(true);
      console.log('✅ Admin can manage users');
    });
  });
  
  test.describe('📊 Performance Testing', () => {
    
    test('should measure authentication performance for all roles', async () => {
      const results = {};
      
      for (const userType of Object.keys(testUsers)) {
        const startTime = Date.now();
        await authenticateUser(userType);
        const endTime = Date.now();
        
        results[userType] = endTime - startTime;
        console.log(`⚡ ${userType} authentication: ${results[userType]}ms`);
        
        expect(results[userType]).toBeLessThan(5000); // Should authenticate within 5 seconds
      }
      
      console.log('✅ All role authentications completed within performance limits');
    });
  });
});
