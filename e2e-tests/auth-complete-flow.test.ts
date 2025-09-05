import { test, expect } from '../fixtures/test-base';

/**
 * Complete Authentication Flow Testing
 * ప్రతి ఒక్క authentication scenario test చేస్తుంది
 */

test.describe('Complete Authentication Flow Tests', () => {
  
  test.describe('User Registration Journey', () => {
    test('should complete full registration flow', async ({ authPage, testUser }) => {
      // Navigate to registration
      await authPage.goToRegister();
      
      // Fill registration form
      await authPage.register(
        testUser.username, 
        testUser.email, 
        testUser.password
      );
      
      // Verify success message
      await expect(authPage.successMessage).toBeVisible();
      
      // Verify email verification message (if applicable)
      await expect(authPage.page.locator('text=Please check your email')).toBeVisible();
    });

    test('should validate registration form fields', async ({ authPage }) => {
      await authPage.testFormValidations();
    });

    test('should handle duplicate email registration', async ({ authPage, testUser }) => {
      // First registration
      await authPage.register(
        testUser.username, 
        testUser.email, 
        testUser.password
      );
      
      // Try to register with same email
      await authPage.register(
        'differentuser', 
        testUser.email, 
        'DifferentPassword123!'
      );
      
      // Verify error message for duplicate email
      await expect(authPage.errorMessage).toBeVisible();
      await expect(authPage.page.locator('text=Email already exists')).toBeVisible();
    });
  });

  test.describe('User Login Journey', () => {
    test.beforeEach(async ({ authPage, testUser }) => {
      // Ensure user is registered before login tests
      await authPage.register(testUser.username, testUser.email, testUser.password);
    });

    test('should login with valid credentials', async ({ authPage, testUser }) => {
      await authPage.login(testUser.email, testUser.password);
      await authPage.verifyLoggedIn();
    });

    test('should remember user when checkbox is checked', async ({ authPage, testUser, page }) => {
      await authPage.login(testUser.email, testUser.password, true);
      
      // Close browser and reopen
      await page.context().close();
      const newContext = await page.context().browser()?.newContext();
      const newPage = newContext ? await newContext.newPage() : page;
      
      // Navigate to protected page
      await newPage.goto('/dashboard');
      
      // Should still be logged in
      const userMenu = newPage.locator('[data-testid="user-menu"]');
      await expect(userMenu).toBeVisible();
    });

    test('should handle invalid login attempts', async ({ authPage }) => {
      // Test wrong email
      await authPage.attemptInvalidLogin('wrong@email.com', 'password123');
      
      // Test wrong password
      await authPage.attemptInvalidLogin('test@example.com', 'wrongpassword');
      
      // Test empty fields
      await authPage.attemptInvalidLogin('', '');
    });

    test('should rate limit excessive login attempts', async ({ authPage }) => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await authPage.attemptInvalidLogin('test@email.com', 'wrongpassword');
      }
      
      // Should show rate limit message
      await expect(authPage.page.locator('text=Too many attempts')).toBeVisible();
    });
  });

  test.describe('Password Reset Journey', () => {
    test.beforeEach(async ({ authPage, testUser }) => {
      await authPage.register(testUser.username, testUser.email, testUser.password);
    });

    test('should complete forgot password flow', async ({ authPage, testUser }) => {
      await authPage.testForgotPassword(testUser.email);
    });

    test('should handle invalid email in forgot password', async ({ authPage }) => {
      await authPage.testForgotPassword('nonexistent@email.com');
      await expect(authPage.errorMessage).toBeVisible();
    });
  });

  test.describe('Navigation Between Auth Pages', () => {
    test('should navigate between login and register pages', async ({ authPage }) => {
      await authPage.testNavigationFlow();
    });

    test('should maintain form data during navigation', async ({ authPage, page }) => {
      // Fill login form partially
      await authPage.goToLogin();
      await authPage.loginEmailInput.fill('test@example.com');
      
      // Navigate to register and back
      await authPage.registerLink.click();
      await authPage.loginFromRegisterLink.click();
      
      // Check if email is still filled (browser behavior)
      const emailValue = await authPage.loginEmailInput.inputValue();
      expect(emailValue).toBe('test@example.com');
    });
  });

  test.describe('Social Authentication', () => {
    test('should display social login options', async ({ authPage }) => {
      await authPage.goToLogin();
      
      await expect(authPage.googleLoginButton).toBeVisible();
      await expect(authPage.facebookLoginButton).toBeVisible();
    });

    test('should handle social login button clicks', async ({ authPage, page }) => {
      await authPage.goToLogin();
      
      // Mock the social login popup
      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        authPage.googleLoginButton.click()
      ]);
      
      expect(popup.url()).toContain('google.com');
      await popup.close();
    });
  });

  test.describe('Session Management', () => {
    test('should automatically logout on token expiration', async ({ authPage, testUser, page }) => {
      await authPage.login(testUser.email, testUser.password);
      
      // Mock token expiration by clearing localStorage
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
      });
      
      // Navigate to protected page
      await page.goto('/dashboard');
      
      // Should be redirected to login
      await expect(page).toHaveURL('/login');
    });

    test('should handle concurrent sessions', async ({ authPage, testUser, browser }) => {
      // Login in first browser context
      await authPage.login(testUser.email, testUser.password);
      
      // Create second browser context
      const secondContext = await browser.newContext();
      const secondPage = await secondContext.newPage();
      const secondAuthPage = new (authPage.constructor as any)(secondPage);
      
      // Login in second context
      await secondAuthPage.login(testUser.email, testUser.password);
      
      // Both sessions should be valid
      await authPage.verifyLoggedIn();
      await secondAuthPage.verifyLoggedIn();
      
      await secondContext.close();
    });
  });

  test.describe('Security Testing', () => {
    test('should prevent XSS in login form', async ({ authPage, page }) => {
      await authPage.goToLogin();
      
      const xssPayload = '<script>alert("XSS")</script>';
      await authPage.loginEmailInput.fill(xssPayload);
      await authPage.loginPasswordInput.fill('password123');
      await authPage.loginButton.click();
      
      // Verify no alert was triggered
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      expect(dialog).toBeNull();
    });

    test('should sanitize input data', async ({ authPage }) => {
      await authPage.goToRegister();
      
      const maliciousInput = `'; DROP TABLE users; --`;
      await authPage.registerUsernameInput.fill(maliciousInput);
      await authPage.registerEmailInput.fill('test@example.com');
      await authPage.registerPasswordInput.fill('password123');
      await authPage.registerConfirmPasswordInput.fill('password123');
      await authPage.termsCheckbox.check();
      await authPage.registerButton.click();
      
      // Should handle gracefully without SQL injection
      await expect(authPage.errorMessage).toBeVisible();
    });

    test('should enforce HTTPS in production', async ({ page }) => {
      // This test would be environment-specific
      if (process.env.NODE_ENV === 'production') {
        await page.goto('http://example.com/login');
        // Should redirect to HTTPS
        await expect(page).toHaveURL(/^https:/);
      }
    });
  });
});
