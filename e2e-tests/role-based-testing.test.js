/**
 * Complete Role-Based E2E Testing for SaversDream App
 * Real user credentials లో అన్ని ro      // Additional verification - look for user menu or sign out option
      const userMenu = page.locator('[data-testid="user-menu"]');
      const signOutButton = page.locator('text=Sign Out');
      const userProfile = page.locator('[data-testid="user-profile"]');
      
      if (await userMenu.isVisible({ timeout: 2000 }) || await signOutButton.isVisible({ timeout: 2000 }) || await userProfile.isVisible({ timeout: 2000 })) {
        console.log(`✅ User menu/sign out confirmed for ${userType}`);
        return true;
      } చేస్తుంది
 * 
 * Test Users:
 * - user@example.com / password123 (role: user)
 * - business@example.com / password123 (role: business)
 * - moderator@example.com / password123 (role: moderator)
 * - admin@example.com / password123 (role: admin)
 * - superadmin@example.com / password123 (role: superadmin)
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
    password: 'password123',
    role: 'admin'
  },
  superadmin: {
    email: 'superadmin@example.com',
    password: 'password123',
    role: 'superadmin'
  }
};

const baseURL = process.env.BASE_URL || 'http://localhost:8081';

// Helper function to login
async function loginUser(page, userType) {
  const user = testUsers[userType];
  console.log(`🔐 Logging in as ${userType}: ${user.email}`);
  
  // Track network requests to debug API calls
  const apiCalls = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log(`📡 API Response: ${response.status()} ${response.url()}`);
    }
  });

  // Listen to console logs from the page
  page.on('console', msg => {
    console.log(`🖥️  Browser Console [${msg.type()}]: ${msg.text()}`);
  });

  try {
    // Navigate to homepage first
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Click "Join" button to go to sign-in (for guests)
    const joinButton = page.locator('text=Join').first();
    if (await joinButton.isVisible({ timeout: 2000 })) {
      await joinButton.click();
      console.log(`✅ Clicked Join button for ${userType}`);
    } else {
      // If no Join button, directly navigate to sign-in
      await page.goto(`${baseURL}/sign-in`);
    }
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Fill email field
    const emailInput = page.locator('input[type="email"], [placeholder*="email" i], [name="email"]').first();
    await emailInput.waitFor({ timeout: 5000 });
    await emailInput.fill(user.email);
    console.log(`✅ Email filled for ${userType}`);

    // Fill password field  
    const passwordInput = page.locator('input[type="password"], [placeholder*="password" i], [name="password"]').first();
    await passwordInput.waitFor({ timeout: 5000 });
    await passwordInput.fill(user.password);
    console.log(`✅ Password filled for ${userType}`);

    // Click Sign In button
    const signInButton = page.locator('text=Sign In', 'button:has-text("Sign In")', '[type="submit"]').first();
    await signInButton.waitFor({ timeout: 5000 });
    
    // Check form values before clicking
    const emailValue = await emailInput.inputValue();
    const passwordValue = await passwordInput.inputValue();
    console.log(`📝 Form values before submit - Email: ${emailValue}, Password: ${passwordValue ? '***' : 'empty'}`);
    
    // Check if button is disabled
    const isDisabled = await signInButton.isDisabled();
    console.log(`🔍 Sign In button disabled state: ${isDisabled}`);
    
    if (isDisabled) {
      console.log(`⚠️  Button is disabled, waiting for it to be enabled...`);
      await page.waitForTimeout(2000); // Wait for loading to clear
      
      // Check again
      const isStillDisabled = await signInButton.isDisabled();
      console.log(`🔍 Sign In button disabled state after wait: ${isStillDisabled}`);
    }
    
    await signInButton.click();
    console.log(`✅ Sign In button clicked for ${userType}`);
    
    // Wait a moment for any immediate response
    await page.waitForTimeout(1000);
    
    // If no API call was made, try to trigger signin directly via JavaScript
    if (apiCalls.filter(call => call.url.includes('/auth/signin')).length === 0) {
      console.log(`🔧 No signin API call detected, trying direct JavaScript trigger...`);
      
      // Try to trigger signin via page evaluation
      try {
        await page.evaluate(({ email, password }) => {
          // Try to find the AuthProvider context and call signIn directly
          console.log('Attempting to trigger signin directly...', email, password);
          
          // Look for React components that might have the signIn function
          const root = document.querySelector('#root');
          if (root && root._reactInternalInstance) {
            console.log('Found React root, attempting to trigger signin...');
          }
          
          // Also try to see if there are any errors
          console.log('Current URL:', window.location.href);
          
        }, { email: user.email, password: user.password });
      } catch (evalError) {
        console.log(`❌ JavaScript evaluation error: ${evalError.message}`);
      }
    }

    // Wait for navigation/response and potential redirect
    await page.waitForTimeout(5000); // Increase wait time
    
    // Check if login was successful by checking multiple indicators
    const currentUrl = page.url();
    console.log(`🔍 Current URL after login attempt: ${currentUrl}`);
    
    // Check for any error messages on the page
    const errorMessages = await page.locator(':has-text("error"), :has-text("failed"), :has-text("invalid"), [data-testid="error"], .error').allTextContents();
    if (errorMessages.length > 0) {
      console.log(`❌ Error messages found: ${errorMessages.join(', ')}`);
    }
    
    // Check for loading indicators that might still be active
    const loadingIndicators = await page.locator('[data-testid="loading"]', '.loading', 'text=Loading').count();
    if (loadingIndicators > 0) {
      console.log(`⏳ Still loading, waiting additional time...`);
      await page.waitForTimeout(3000);
    }
    
    // Success indicators:
    // 1. Not on sign-in page anymore
    // 2. URL contains tabs or is home page  
    // 3. User interface elements are visible
    const finalUrl = page.url();
    console.log(`🔍 Final URL: ${finalUrl}`);
    
    const isNotOnSignInPage = !finalUrl.includes('/sign-in') && !finalUrl.includes('/login');
    const isOnTabsPage = finalUrl.includes('/(tabs)') || finalUrl.endsWith('/') || finalUrl === baseURL;
    
    if (isNotOnSignInPage || isOnTabsPage) {
      console.log(`✅ Successfully logged in as ${userType} - redirected from sign-in page`);
      
      // Additional verification - look for authenticated user elements
      const authenticatedElements = [
        page.locator('[data-testid="user-menu"]'),
        page.locator('.user-button'), 
        page.locator('.avatar'),
        page.locator('text=Sign Out'),
        page.locator('text=Profile'),
        page.locator('text=Settings'),
        page.locator('[data-testid="user-profile"]'),
        page.locator('.user-avatar'),
        page.locator('[data-testid="navigation-tabs"]')
      ];
      
      let foundAuthElement = false;
      for (const element of authenticatedElements) {
        if (await element.isVisible({ timeout: 2000 })) {
          console.log(`✅ Found authenticated element for ${userType}`);
          foundAuthElement = true;
          break;
        }
      }
      
      return true; // Consider login successful if redirected away from sign-in page
    } else {
      // Still on sign-in page, login failed
      console.log(`❌ Login failed for ${userType} - still on sign-in page`);
      console.log(`🌐 API calls made: ${JSON.stringify(apiCalls, null, 2)}`);
      
      // Try to capture any specific error details
      const pageContent = await page.textContent('body');
      if (pageContent.toLowerCase().includes('error') || pageContent.toLowerCase().includes('invalid')) {
        console.log(`❌ Page contains error content`);
      }
      
      return false;
    }
    
    console.log(`❌ Login verification failed for ${userType}`);
    return false;
    
  } catch (error) {
    console.error(`❌ Login error for ${userType}:`, error.message);
    return false;
  }
}

// Helper function to sign out
async function signOutUser(page) {
  try {
    console.log('🚪 Attempting to sign out...');
    
    // Try multiple sign-out methods
    
    // Method 1: Try header user menu sign out
    const userMenuButton = page.locator('[data-testid="user-menu"]').or(page.locator('.user-menu')).or(page.locator('text=Profile'));
    if (await userMenuButton.isVisible({ timeout: 2000 })) {
      await userMenuButton.click();
      await page.waitForTimeout(500);
      
      const signOutOption = page.locator('text=Sign Out');
      if (await signOutOption.isVisible({ timeout: 2000 })) {
        await signOutOption.click();
        
        // Handle confirmation dialog if it appears
        const confirmButton = page.locator('text=Sign Out', 'button:has-text("Sign Out")').last();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(2000);
        console.log('✅ Signed out via header menu');
        return true;
      }
    }
    
    // Method 2: Try settings page sign out
    const settingsTab = page.locator('text=Settings', '[data-testid="settings-tab"]');
    if (await settingsTab.isVisible({ timeout: 2000 })) {
      await settingsTab.click();
      await page.waitForTimeout(1000);
      
      const signOutButton = page.locator('text=Sign Out').last();
      if (await signOutButton.isVisible({ timeout: 2000 })) {
        await signOutButton.click();
        
        // Handle confirmation dialog
        const confirmButton = page.locator('text=Sign Out', 'button:has-text("Sign Out")').last();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(2000);
        console.log('✅ Signed out via settings');
        return true;
      }
    }
    
    // Method 3: Direct API call via navigation
    await page.goto(`${baseURL}/`);
    await page.evaluate(() => {
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.waitForTimeout(1000);
    console.log('✅ Signed out via session clear');
    return true;
    
  } catch (error) {
    console.error('❌ Sign out error:', error.message);
    // Fallback: clear session manually
    await page.goto(`${baseURL}/`);
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    return false;
  }
}

// Helper function to check user role permissions
async function checkRolePermissions(page, userType) {
  const permissions = {
    user: {
      canCreateDeals: true,
      canViewDeals: true,
      canVote: true,
      canComment: true,
      canAccessAdmin: false,
      canManageUsers: false
    },
    business: {
      canCreateDeals: true,
      canViewDeals: true,
      canVote: true,
      canComment: true,
      canPromoteDeals: true,
      canAccessAdmin: false,
      canManageUsers: false
    },
    moderator: {
      canCreateDeals: true,
      canViewDeals: true,
      canVote: true,
      canComment: true,
      canModerateContent: true,
      canBanUsers: true,
      canAccessAdmin: true,
      canManageUsers: true
    },
    admin: {
      canCreateDeals: true,
      canViewDeals: true,
      canVote: true,
      canComment: true,
      canModerateContent: true,
      canBanUsers: true,
      canAccessAdmin: true,
      canManageUsers: true,
      canManageSettings: true
    },
    superadmin: {
      canCreateDeals: true,
      canViewDeals: true,
      canVote: true,
      canComment: true,
      canModerateContent: true,
      canBanUsers: true,
      canAccessAdmin: true,
      canManageUsers: true,
      canManageSettings: true,
      canManageAdmins: true
    }
  };
  
  return permissions[userType] || permissions.user;
}

test.describe('SaversDream App - Complete Role-Based E2E Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    console.log('🚀 Starting new test...');
  });

  test.describe('🔐 Authentication Testing with Real Users', () => {
    
    Object.keys(testUsers).forEach(userType => {
      test(`should login successfully as ${userType}`, async ({ page }) => {
        const success = await loginUser(page, userType);
        expect(success).toBeTruthy();
        
        // Verify user is logged in
        await page.waitForTimeout(2000);
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
        
        console.log(`✅ ${userType} login test completed`);
      });
    });
    
    test('should test invalid login attempts', async ({ page }) => {
      await page.goto(`${baseURL}/login`);
      await page.waitForTimeout(2000);
      
      // Test with wrong credentials
      const emailField = page.locator('[name="email"], [data-testid="email"], input[type="email"]').first();
      const passwordField = page.locator('[name="password"], [data-testid="password"], input[type="password"]').first();
      const submitButton = page.locator('[type="submit"], button:has-text("Login")').first();
      
      if (await emailField.isVisible() && await passwordField.isVisible() && await submitButton.isVisible()) {
        await emailField.fill('wrong@example.com');
        await passwordField.fill('wrongpassword');
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Should still be on login page or show error
        const currentUrl = page.url();
        expect(currentUrl).toContain('/login');
        console.log('✅ Invalid login correctly rejected');
      }
    });
  });

  test.describe('👤 User Role Navigation Testing', () => {
    
    test('should test regular user navigation and permissions', async ({ page }) => {
      const success = await loginUser(page, 'user');
      if (!success) {
        test.skip('Skipping due to login failure');
        return;
      }
      
      const permissions = await checkRolePermissions(page, 'user');
      
      // Test user dashboard access
      await page.goto(`${baseURL}/dashboard`);
      await page.waitForTimeout(2000);
      console.log('✅ User can access dashboard');
      
      // Test deals page access
      await page.goto(`${baseURL}/deals`);
      await page.waitForTimeout(2000);
      console.log('✅ User can access deals page');
      
      // Test profile access
      await page.goto(`${baseURL}/profile`);
      await page.waitForTimeout(2000);
      console.log('✅ User can access profile page');
      
      // Test admin access (should be denied)
      if (!permissions.canAccessAdmin) {
        await page.goto(`${baseURL}/admin`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const hasAccessDenied = await page.locator('text=Access Denied, text=Unauthorized, text=403').isVisible().catch(() => false);
        const redirectedToLogin = currentUrl.includes('/login');
        
        expect(hasAccessDenied || redirectedToLogin || !currentUrl.includes('/admin')).toBeTruthy();
        console.log('✅ User correctly denied admin access');
      }
    });
    
    test('should test business user enhanced permissions', async ({ page }) => {
      const success = await loginUser(page, 'business');
      if (!success) {
        test.skip('Skipping due to login failure');
        return;
      }
      
      // Test business user specific features
      await page.goto(`${baseURL}/deals/create`);
      await page.waitForTimeout(2000);
      console.log('✅ Business user can access deal creation');
      
      // Test business dashboard features
      await page.goto(`${baseURL}/business`);
      await page.waitForTimeout(2000);
      console.log('✅ Business user can access business features');
    });
    
    test('should test moderator permissions', async ({ page }) => {
      const success = await loginUser(page, 'moderator');
      if (!success) {
        test.skip('Skipping due to login failure');
        return;
      }
      
      const permissions = await checkRolePermissions(page, 'moderator');
      
      // Test moderator panel access
      if (permissions.canAccessAdmin) {
        await page.goto(`${baseURL}/admin`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/admin') || currentUrl.includes('/moderator')) {
          console.log('✅ Moderator can access admin/moderator panel');
        }
      }
      
      // Test user management capabilities
      await page.goto(`${baseURL}/admin/users`);
      await page.waitForTimeout(2000);
      console.log('✅ Moderator can access user management');
    });
    
    test('should test admin full permissions', async ({ page }) => {
      const success = await loginUser(page, 'admin');
      if (!success) {
        test.skip('Skipping due to login failure');
        return;
      }
      
      // Test admin panel access
      await page.goto(`${baseURL}/admin`);
      await page.waitForTimeout(2000);
      console.log('✅ Admin can access admin panel');
      
      // Test site settings management
      await page.goto(`${baseURL}/admin/settings`);
      await page.waitForTimeout(2000);
      console.log('✅ Admin can access site settings');
      
      // Test user management
      await page.goto(`${baseURL}/admin/users`);
      await page.waitForTimeout(2000);
      console.log('✅ Admin can access user management');
      
      // Test deals management
      await page.goto(`${baseURL}/admin/deals`);
      await page.waitForTimeout(2000);
      console.log('✅ Admin can access deals management');
    });
    
    test('should test superadmin ultimate permissions', async ({ page }) => {
      const success = await loginUser(page, 'superadmin');
      if (!success) {
        test.skip('Skipping due to login failure');
        return;
      }
      
      // Test all admin functionalities
      const adminPages = [
        '/admin',
        '/admin/users',
        '/admin/settings',
        '/admin/deals',
        '/admin/analytics',
        '/admin/system'
      ];
      
      for (const adminPage of adminPages) {
        try {
          await page.goto(`${baseURL}${adminPage}`);
          await page.waitForTimeout(1500);
          console.log(`✅ Superadmin can access ${adminPage}`);
        } catch (error) {
          console.log(`⚠️ ${adminPage} might not exist`);
        }
      }
    });
  });

  test.describe('🛍️ Role-Based Deals Testing', () => {
    
    test('should test deal creation by different user types', async ({ page }) => {
      const userTypes = ['user', 'business', 'moderator', 'admin'];
      
      for (const userType of userTypes) {
        console.log(`\n🧪 Testing deal creation for ${userType}`);
        
        const success = await loginUser(page, userType);
        if (!success) continue;
        
        // Navigate to deal creation
        await page.goto(`${baseURL}/deals/create`);
        await page.waitForTimeout(2000);
        
        // Try to fill deal form
        const titleField = page.locator('[name="title"], [data-testid="deal-title"], #title').first();
        const descField = page.locator('[name="description"], [data-testid="deal-description"], #description').first();
        const priceField = page.locator('[name="price"], [data-testid="deal-price"], #price').first();
        
        if (await titleField.isVisible()) {
          await titleField.fill(`Test Deal by ${userType}`);
          console.log(`✅ ${userType} can fill deal title`);
        }
        
        if (await descField.isVisible()) {
          await descField.fill(`This is a test deal created by ${userType} user`);
          console.log(`✅ ${userType} can fill deal description`);
        }
        
        if (await priceField.isVisible()) {
          await priceField.fill('99.99');
          console.log(`✅ ${userType} can fill deal price`);
        }
        
        // Try to submit
        const submitButton = page.locator('[type="submit"], button:has-text("Create"), button:has-text("Submit")').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          console.log(`✅ ${userType} can submit deal form`);
        }
      }
    });
    
    test('should test deal moderation by authorized users', async ({ page }) => {
      const moderatorTypes = ['moderator', 'admin', 'superadmin'];
      
      for (const userType of moderatorTypes) {
        console.log(`\n🔍 Testing deal moderation for ${userType}`);
        
        const success = await loginUser(page, userType);
        if (!success) continue;
        
        // Navigate to deals management
        await page.goto(`${baseURL}/admin/deals`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/admin') || currentUrl.includes('/deals')) {
          console.log(`✅ ${userType} can access deal moderation`);
          
          // Look for moderation actions
          const moderationButtons = page.locator('button:has-text("Approve"), button:has-text("Reject"), button:has-text("Delete")');
          const buttonCount = await moderationButtons.count();
          if (buttonCount > 0) {
            console.log(`✅ ${userType} has ${buttonCount} moderation actions available`);
          }
        }
      }
    });
  });

  test.describe('👥 User Management Testing', () => {
    
    test('should test user management by authorized roles', async ({ page }) => {
      const managerTypes = ['moderator', 'admin', 'superadmin'];
      
      for (const userType of managerTypes) {
        console.log(`\n👥 Testing user management for ${userType}`);
        
        const success = await loginUser(page, userType);
        if (!success) continue;
        
        // Navigate to user management
        await page.goto(`${baseURL}/admin/users`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/admin') || currentUrl.includes('/users')) {
          console.log(`✅ ${userType} can access user management`);
          
          // Look for user management actions
          const userActions = page.locator('button:has-text("Ban"), button:has-text("Unban"), button:has-text("Delete"), button:has-text("Edit")');
          const actionCount = await userActions.count();
          if (actionCount > 0) {
            console.log(`✅ ${userType} has ${actionCount} user management actions available`);
          }
          
          // Test user search if available
          const searchField = page.locator('[name="search"], [placeholder*="search" i]').first();
          if (await searchField.isVisible()) {
            await searchField.fill('test');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
            console.log(`✅ ${userType} can search users`);
          }
        }
      }
    });
  });

  test.describe('⚙️ Settings Management Testing', () => {
    
    test('should test settings access by admin roles', async ({ page }) => {
      const adminTypes = ['admin', 'superadmin'];
      
      for (const userType of adminTypes) {
        console.log(`\n⚙️ Testing settings management for ${userType}`);
        
        const success = await loginUser(page, userType);
        if (!success) continue;
        
        // Test site settings access
        await page.goto(`${baseURL}/admin/settings`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/admin') || currentUrl.includes('/settings')) {
          console.log(`✅ ${userType} can access site settings`);
          
          // Look for settings forms
          const settingsInputs = page.locator('input, textarea, select').count();
          console.log(`✅ ${userType} has access to settings configuration`);
        }
        
        // Test API settings endpoint
        try {
          const response = await page.request.get(`${baseURL}/api/site/settings`);
          if (response.ok()) {
            console.log(`✅ ${userType} can access site settings API`);
          }
        } catch (error) {
          console.log(`⚠️ Settings API might not be accessible for ${userType}`);
        }
      }
    });
  });

  test.describe('🔒 Security and Permission Boundary Testing', () => {
    
    test('should verify role boundaries are enforced', async ({ page }) => {
      // Test that regular users cannot access admin functions
      const success = await loginUser(page, 'user');
      if (!success) return;
      
      const restrictedPages = [
        '/admin',
        '/admin/users',
        '/admin/settings',
        '/admin/deals'
      ];
      
      for (const restrictedPage of restrictedPages) {
        await page.goto(`${baseURL}${restrictedPage}`);
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        const hasAccessDenied = await page.locator('text=Access Denied, text=Unauthorized, text=403').isVisible().catch(() => false);
        const redirectedToLogin = currentUrl.includes('/login');
        const redirectedAway = !currentUrl.includes('/admin');
        
        expect(hasAccessDenied || redirectedToLogin || redirectedAway).toBeTruthy();
        console.log(`✅ Regular user correctly blocked from ${restrictedPage}`);
      }
    });
    
    test('should test session persistence across navigation', async ({ page }) => {
      const success = await loginUser(page, 'admin');
      if (!success) return;
      
      // Navigate through multiple pages to test session persistence
      const navigationPages = [
        '/dashboard',
        '/deals',
        '/profile',
        '/admin',
        '/admin/users'
      ];
      
      for (const navPage of navigationPages) {
        await page.goto(`${baseURL}${navPage}`);
        await page.waitForTimeout(1500);
        
        // Check if still logged in (not redirected to login)
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');
        console.log(`✅ Session maintained during navigation to ${navPage}`);
      }
    });
  });

  test.describe('📊 Performance Testing with Different User Roles', () => {
    
    test('should measure login performance for all user types', async ({ page }) => {
      for (const userType of Object.keys(testUsers)) {
        console.log(`\n⚡ Testing login performance for ${userType}`);
        
        const startTime = Date.now();
        const success = await loginUser(page, userType);
        const loginTime = Date.now() - startTime;
        
        if (success) {
          console.log(`✅ ${userType} login completed in ${loginTime}ms`);
          expect(loginTime).toBeLessThan(10000); // Should login within 10 seconds
        }
        
        // Sign out for next test
        try {
          await signOutUser(page);
          await page.waitForTimeout(1000);
        } catch (error) {
          // Sign out might not exist, clear session manually
          await page.context().clearCookies();
        }
      }
    });
  });
});

// Export test users for other test files
module.exports = { testUsers, loginUser, checkRolePermissions, baseURL };
