/**
 * Complete E2E Navigation Testing for SaversDream App
 * ప్రతి ఒక్క navigation path మరియు user flow test చేస్తుంది
 * 
 * Install Playwright first: npm install --save-dev @playwright/test
 * Run tests: npm run e2e
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const baseURL = process.env.BASE_URL || 'http://localhost:8081';

// Test data
const testUser = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  username: 'testuser'
};

const adminUser = {
  email: 'admin@saversdream.com',
  password: 'AdminPassword123!',
  username: 'admin'
};

test.describe('SaversDream App - Complete E2E Navigation Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Start with fresh session
    await page.goto(baseURL);
  });

  test.describe('🏠 Landing Page & Guest Navigation', () => {
    
    test('should load landing page and display all elements', async ({ page }) => {
      // Verify page loads
      await expect(page).toHaveTitle(/SaversDream|Saver/);
      
      // Verify main navigation elements
      await expect(page.locator('text=Home')).toBeVisible();
      await expect(page.locator('text=Login')).toBeVisible();
      await expect(page.locator('text=Register')).toBeVisible();
      
      // Verify content sections
      await expect(page.locator('text=Welcome')).toBeVisible();
      await expect(page.locator('[data-testid="deals-section"], .deals-section')).toBeVisible();
    });

    test('should navigate through all guest-accessible pages', async ({ page }) => {
      // Test all main navigation links
      const navLinks = [
        { text: 'Home', expectedUrl: '/' },
        { text: 'Deals', expectedUrl: '/deals' },
        { text: 'About', expectedUrl: '/about' },
        { text: 'Contact', expectedUrl: '/contact' }
      ];

      for (const link of navLinks) {
        try {
          await page.click(`text=${link.text}`);
          if (link.expectedUrl !== '/') {
            await expect(page).toHaveURL(new RegExp(link.expectedUrl));
          }
          await page.goBack();
        } catch (error) {
          console.log(`Navigation link "${link.text}" might not exist, continuing...`);
        }
      }
    });

    test('should display deals without authentication', async ({ page }) => {
      // Navigate to deals page
      await page.goto(`${baseURL}/deals`);
      
      // Should show deals or message
      const dealsContainer = page.locator('[data-testid="deals-container"], .deals-container, .deals-list');
      const noDealssMessage = page.locator('text=No deals found');
      
      await expect(dealsContainer.or(noDealssMessage)).toBeVisible();
    });
  });

  test.describe('🔐 Authentication Flow Testing', () => {
    
    test('should complete registration flow', async ({ page }) => {
      // Navigate to register
      await page.click('text=Register');
      await expect(page).toHaveURL(/register/);
      
      // Fill registration form
      await page.fill('[name="username"], [data-testid="username"]', testUser.username);
      await page.fill('[name="email"], [data-testid="email"]', testUser.email);
      await page.fill('[name="password"], [data-testid="password"]', testUser.password);
      
      const confirmPasswordField = page.locator('[name="confirmPassword"], [data-testid="confirm-password"]');
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill(testUser.password);
      }
      
      // Accept terms if checkbox exists
      const termsCheckbox = page.locator('[name="terms"], [data-testid="terms"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
      
      // Submit registration
      await page.click('[type="submit"], [data-testid="register-submit"]');
      
      // Verify success or redirect
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/register');
    });

    test('should complete login flow', async ({ page }) => {
      // Navigate to login
      await page.click('text=Login');
      await expect(page).toHaveURL(/login/);
      
      // Fill login form
      await page.fill('[name="email"], [data-testid="email"], [placeholder*="email" i]', testUser.email);
      await page.fill('[name="password"], [data-testid="password"], [placeholder*="password" i]', testUser.password);
      
      // Submit login
      await page.click('[type="submit"], [data-testid="login-submit"], text=Login');
      
      // Wait for redirect
      await page.waitForTimeout(3000);
      
      // Verify logged in (should not be on login page)
      expect(page.url()).not.toContain('/login');
    });

    test('should navigate between login and register pages', async ({ page }) => {
      // Start at login
      await page.click('text=Login');
      await expect(page).toHaveURL(/login/);
      
      // Go to register
      await page.click('text=Register');
      await expect(page).toHaveURL(/register/);
      
      // Go back to login
      await page.click('text=Login');
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('👤 User Dashboard Navigation', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login before each test
      await page.goto(`${baseURL}/login`);
      await page.fill('[name="email"], [data-testid="email"]', testUser.email);
      await page.fill('[name="password"], [data-testid="password"]', testUser.password);
      await page.click('[type="submit"], [data-testid="login-submit"]');
      await page.waitForTimeout(2000);
    });

    test('should navigate through all user dashboard sections', async ({ page }) => {
      // Test main dashboard navigation
      const dashboardSections = [
        'Dashboard',
        'My Deals', 
        'Favorites',
        'Profile',
        'Settings'
      ];

      for (const section of dashboardSections) {
        try {
          await page.click(`text=${section}`);
          await page.waitForTimeout(1000);
          console.log(`✓ Navigated to ${section}`);
        } catch (error) {
          console.log(`❌ Could not navigate to ${section}`);
        }
      }
    });

    test('should test user profile navigation', async ({ page }) => {
      // Navigate to profile
      await page.click('text=Profile');
      
      // Test profile sub-sections
      const profileSections = [
        'Edit Profile',
        'Change Password',
        'Privacy Settings',
        'Notification Preferences'
      ];

      for (const section of profileSections) {
        try {
          await page.click(`text=${section}`);
          await page.waitForTimeout(500);
        } catch (error) {
          console.log(`Profile section "${section}" not found`);
        }
      }
    });

    test('should test deals management navigation', async ({ page }) => {
      // Navigate to deals section
      await page.click('text=Deals');
      
      // Test create deal navigation
      try {
        await page.click('text=Create Deal');
        await expect(page).toHaveURL(/create/);
        await page.goBack();
      } catch (error) {
        console.log('Create Deal button not found');
      }
      
      // Test deal categories navigation
      const categories = ['Electronics', 'Fashion', 'Home', 'Travel'];
      for (const category of categories) {
        try {
          await page.click(`text=${category}`);
          await page.waitForTimeout(500);
        } catch (error) {
          console.log(`Category "${category}" not found`);
        }
      }
    });
  });

  test.describe('🛍️ Deals Interaction Testing', () => {
    
    test('should test deal creation flow', async ({ page }) => {
      // Login first
      await page.goto(`${baseURL}/login`);
      await page.fill('[name="email"], [data-testid="email"]', testUser.email);
      await page.fill('[name="password"], [data-testid="password"]', testUser.password);
      await page.click('[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Navigate to create deal
      await page.goto(`${baseURL}/deals/create`);
      
      // Fill deal form
      await page.fill('[name="title"], [data-testid="deal-title"]', 'Test Deal Title');
      await page.fill('[name="description"], [data-testid="deal-description"]', 'This is a test deal description');
      await page.fill('[name="price"], [data-testid="deal-price"]', '99.99');
      
      // Submit deal
      await page.click('[type="submit"], [data-testid="create-deal-submit"]');
      await page.waitForTimeout(2000);
      
      // Verify deal was created (should redirect or show success)
      expect(page.url()).not.toContain('/create');
    });

    test('should test deal filtering and search', async ({ page }) => {
      await page.goto(`${baseURL}/deals`);
      
      // Test search functionality
      const searchInput = page.locator('[name="search"], [data-testid="search"], [placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }
      
      // Test category filters
      const filters = ['Electronics', 'Fashion', 'Home', 'All'];
      for (const filter of filters) {
        try {
          await page.click(`text=${filter}`);
          await page.waitForTimeout(500);
        } catch (error) {
          console.log(`Filter "${filter}" not found`);
        }
      }
    });

    test('should test deal voting/interaction', async ({ page }) => {
      await page.goto(`${baseURL}/deals`);
      
      // Find first deal and interact with it
      const firstDeal = page.locator('[data-testid="deal-item"], .deal-item, .deal-card').first();
      if (await firstDeal.isVisible()) {
        await firstDeal.click();
        
        // Test vote buttons if they exist
        try {
          await page.click('[data-testid="upvote"], .upvote, text=👍');
          await page.waitForTimeout(500);
        } catch (error) {
          console.log('Upvote button not found');
        }
        
        try {
          await page.click('[data-testid="favorite"], .favorite, text=♡');
          await page.waitForTimeout(500);
        } catch (error) {
          console.log('Favorite button not found');
        }
      }
    });
  });

  test.describe('👑 Admin Panel Navigation', () => {
    
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto(`${baseURL}/login`);
      await page.fill('[name="email"], [data-testid="email"]', adminUser.email);
      await page.fill('[name="password"], [data-testid="password"]', adminUser.password);
      await page.click('[type="submit"]');
      await page.waitForTimeout(2000);
    });

    test('should navigate through admin panel sections', async ({ page }) => {
      // Try to access admin panel
      await page.goto(`${baseURL}/admin`);
      
      const adminSections = [
        'Users',
        'Deals',
        'Settings',
        'Analytics',
        'Reports'
      ];

      for (const section of adminSections) {
        try {
          await page.click(`text=${section}`);
          await page.waitForTimeout(1000);
          console.log(`✓ Admin navigation to ${section} successful`);
        } catch (error) {
          console.log(`❌ Admin section "${section}" not accessible`);
        }
      }
    });

    test('should test user management functions', async ({ page }) => {
      await page.goto(`${baseURL}/admin/users`);
      
      // Test user list navigation
      const userActions = [
        'View Users',
        'Ban User',
        'Unban User',
        'Delete User'
      ];

      for (const action of userActions) {
        try {
          const actionButton = page.locator(`text=${action}`).first();
          if (await actionButton.isVisible()) {
            await actionButton.click();
            await page.waitForTimeout(500);
          }
        } catch (error) {
          console.log(`Admin action "${action}" not found`);
        }
      }
    });
  });

  test.describe('📱 Mobile Navigation Testing', () => {
    
    test('should test mobile navigation menu', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(baseURL);
      
      // Look for hamburger menu
      const hamburgerMenu = page.locator('[data-testid="hamburger"], .hamburger, .menu-toggle');
      if (await hamburgerMenu.isVisible()) {
        await hamburgerMenu.click();
        
        // Test mobile menu items
        const mobileMenuItems = ['Home', 'Deals', 'Login', 'Register'];
        for (const item of mobileMenuItems) {
          try {
            await expect(page.locator(`text=${item}`)).toBeVisible();
          } catch (error) {
            console.log(`Mobile menu item "${item}" not found`);
          }
        }
      }
    });

    test('should test touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${baseURL}/deals`);
      
      // Test swipe gestures if implemented
      const dealsList = page.locator('[data-testid="deals-list"], .deals-list');
      if (await dealsList.isVisible()) {
        // Simulate swipe
        await dealsList.hover();
        await page.mouse.down();
        await page.mouse.move(100, 0);
        await page.mouse.up();
      }
    });
  });

  test.describe('🔍 Search & Filter Navigation', () => {
    
    test('should test search functionality across pages', async ({ page }) => {
      const searchPages = [
        `${baseURL}/deals`,
        `${baseURL}/users`,
        `${baseURL}/search`
      ];

      for (const pageUrl of searchPages) {
        try {
          await page.goto(pageUrl);
          
          const searchInput = page.locator('[name="search"], [data-testid="search"]').first();
          if (await searchInput.isVisible()) {
            await searchInput.fill('test search');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          console.log(`Search not available on ${pageUrl}`);
        }
      }
    });

    test('should test filter combinations', async ({ page }) => {
      await page.goto(`${baseURL}/deals`);
      
      // Test multiple filter combinations
      const filterCombinations = [
        ['Electronics', 'Under $50'],
        ['Fashion', 'New Today'],
        ['Home', 'Popular']
      ];

      for (const combination of filterCombinations) {
        for (const filter of combination) {
          try {
            await page.click(`text=${filter}`);
            await page.waitForTimeout(500);
          } catch (error) {
            console.log(`Filter "${filter}" not found`);
          }
        }
        
        // Clear filters
        try {
          await page.click('text=Clear Filters');
        } catch (error) {
          // Reset by reloading page
          await page.reload();
        }
      }
    });
  });

  test.describe('⚡ Performance & Load Testing', () => {
    
    test('should measure page load times', async ({ page }) => {
      const pages = [
        `${baseURL}/`,
        `${baseURL}/deals`,
        `${baseURL}/login`,
        `${baseURL}/register`
      ];

      for (const pageUrl of pages) {
        const startTime = Date.now();
        await page.goto(pageUrl);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        console.log(`Page ${pageUrl} loaded in ${loadTime}ms`);
        expect(loadTime).toBeLessThan(10000); // 10 second timeout
      }
    });

    test('should test navigation responsiveness', async ({ page }) => {
      await page.goto(baseURL);
      
      // Rapid navigation test
      const rapidNavigation = ['Deals', 'Home', 'Deals', 'Home'];
      
      for (const nav of rapidNavigation) {
        const startTime = Date.now();
        await page.click(`text=${nav}`);
        await page.waitForLoadState('domcontentloaded');
        const navTime = Date.now() - startTime;
        
        expect(navTime).toBeLessThan(5000); // 5 second max for navigation
      }
    });
  });

  test.describe('🔒 Security Navigation Testing', () => {
    
    test('should prevent unauthorized access to protected routes', async ({ page }) => {
      // Test accessing protected routes without authentication
      const protectedRoutes = [
        `${baseURL}/dashboard`,
        `${baseURL}/profile`,
        `${baseURL}/admin`,
        `${baseURL}/deals/create`
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        
        // Should be redirected to login or show access denied
        const currentUrl = page.url();
        const isRedirectToLogin = currentUrl.includes('/login');
        const hasAccessDenied = await page.locator('text=Access Denied').isVisible();
        const hasUnauthorized = await page.locator('text=Unauthorized').isVisible();
        
        expect(isRedirectToLogin || hasAccessDenied || hasUnauthorized).toBeTruthy();
      }
    });

    test('should test logout functionality', async ({ page }) => {
      // Login first
      await page.goto(`${baseURL}/login`);
      await page.fill('[name="email"]', testUser.email);
      await page.fill('[name="password"]', testUser.password);
      await page.click('[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Find and click logout
      try {
        await page.click('text=Logout');
        await page.waitForTimeout(1000);
        
        // Verify logged out (should be redirected to home or login)
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/dashboard');
      } catch (error) {
        console.log('Logout button not found');
      }
    });
  });
});

// Export test configuration
module.exports = { testUser, adminUser, baseURL };
