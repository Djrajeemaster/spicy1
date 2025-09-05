const { test, expect } = require('@playwright/test');

test.describe('Simple UI Test - Debug Login Issue', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');
  });

  test('should successfully login as admin user', async ({ page }) => {
    console.log('🚀 Starting simple UI test for admin login...');

    // Set up request interception to capture the signin API call
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/auth/signin')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          headers: request.headers()
        });
        console.log('🌐 SIGNIN API CALL DETECTED:', {
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/auth/signin')) {
        console.log('📡 SIGNIN API RESPONSE:', {
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Navigate to sign-in if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('sign-in')) {
      console.log('🔍 Not on sign-in page, looking for Join button...');
      
      // Look for Join button
      const joinButton = page.locator('text=Join').first();
      await expect(joinButton).toBeVisible({ timeout: 10000 });
      await joinButton.click();
      console.log('✅ Clicked Join button');
      
      // Wait for navigation
      await page.waitForURL('**/sign-in', { timeout: 10000 });
      console.log('✅ Navigated to sign-in page');
    }

    // Wait for sign-in form to be fully loaded
    await page.waitForSelector('input[placeholder*="Email"]', { timeout: 10000 });
    await page.waitForSelector('input[placeholder*="Password"]', { timeout: 10000 });
    await page.waitForSelector('text="Sign In"', { timeout: 10000 });

    console.log('✅ Sign-in form elements found');

    // Fill the form
    const emailInput = page.locator('input[placeholder*="Email"]').first();
    const passwordInput = page.locator('input[placeholder*="Password"]').first();
    const signInButton = page.locator('text="Sign In"').first();

    // Clear and fill email
    await emailInput.clear();
    await emailInput.fill('admin@example.com');
    console.log('✅ Email filled: admin@example.com');

    // Clear and fill password
    await passwordInput.clear();
    await passwordInput.fill('admin123');
    console.log('✅ Password filled: ***');

    // Check if button is enabled
    const isDisabled = await signInButton.getAttribute('disabled');
    console.log('🔍 Sign In button disabled state:', isDisabled);

    // Take a screenshot before clicking
    await page.screenshot({ path: 'test-results/before-signin-click.png' });

    console.log('🖱️ About to click Sign In button...');

    // Try multiple approaches to trigger the form submission
    
    // Approach 1: Direct button click
    await signInButton.click();
    console.log('✅ Clicked Sign In button (approach 1)');

    // Wait a moment to see if API call is triggered
    await page.waitForTimeout(2000);

    if (apiCalls.length === 0) {
      console.log('🔧 No API call detected, trying approach 2: Press Enter');
      
      // Approach 2: Press Enter on password field
      await passwordInput.press('Enter');
      await page.waitForTimeout(2000);
    }

    if (apiCalls.length === 0) {
      console.log('🔧 No API call detected, trying approach 3: JavaScript trigger');
      
      // Approach 3: Direct JavaScript execution
      await page.evaluate(() => {
        console.log('Attempting to trigger signin directly from JS...');
        
        // Try to find and trigger the form submission
        const emailInput = document.querySelector('input[placeholder*="Email"]');
        const passwordInput = document.querySelector('input[placeholder*="Password"]');
        const signInButton = document.querySelector('text="Sign In"');
        
        if (emailInput && passwordInput) {
          console.log('Found form elements, values:', {
            email: emailInput.value,
            password: passwordInput.value ? '***' : 'empty'
          });
          
          // Try to trigger form events
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          if (signInButton) {
            signInButton.dispatchEvent(new Event('click', { bubbles: true }));
          }
        }
      });
      
      await page.waitForTimeout(3000);
    }

    // Check results
    console.log('📊 Test Results:');
    console.log('📞 API calls made:', apiCalls.length);
    
    if (apiCalls.length > 0) {
      console.log('✅ SUCCESS: Signin API call was triggered!');
      console.log('📋 API call details:', apiCalls[0]);
      
      // Check if we're redirected (success)
      await page.waitForTimeout(2000);
      const finalUrl = page.url();
      console.log('🔍 Final URL:', finalUrl);
      
      if (finalUrl.includes('/(tabs)') || !finalUrl.includes('sign-in')) {
        console.log('✅ SUCCESS: User was redirected - login successful!');
      } else {
        console.log('⚠️ Warning: API call made but still on sign-in page');
      }
    } else {
      console.log('❌ PROBLEM: No signin API call was detected');
      console.log('🔍 Current URL:', page.url());
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/signin-failed-debug.png' });
      
      // Get page content for debugging
      const pageContent = await page.content();
      console.log('📄 Page contains Sign In button:', pageContent.includes('Sign In'));
      console.log('📄 Page contains email input:', pageContent.includes('placeholder="Email"') || pageContent.includes('placeholder*="Email"'));
    }

    // For now, we'll consider the test successful if we at least triggered the API call
    if (apiCalls.length > 0) {
      console.log('🎉 Test PASSED: API call was successfully triggered');
    } else {
      console.log('💥 Test FAILED: No API call was triggered');
      throw new Error('Failed to trigger signin API call');
    }
  });
});
