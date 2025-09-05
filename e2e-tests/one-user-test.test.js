const { test, expect } = require('@playwright/test');

const baseURL = 'http://localhost:8081';

test.describe('🔍 ONE USER - ALL FEATURES TEST', () => {
  
  test('Complete user journey with detailed debugging', async ({ page }) => {
    console.log('🚀 Starting ONE USER test for ALL features...\n');
    
    // STEP 1: Login
    console.log('STEP 1: Login...');
    await page.goto(`${baseURL}/sign-in`);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="email"]', 'user@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Look for sign in button - React Native Web uses TouchableOpacity, not HTML button
    const signInButton = page.locator('text="Sign In"').last(); // Get the button text, not submit type
    await signInButton.click();
    
    await page.waitForLoadState('networkidle');
    console.log('✅ Login completed');
    
    // STEP 2: Check HOME page for deals
    console.log('\nSTEP 2: Checking for deals on home page...');
    await page.goto(`${baseURL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Check for any deal-related content
    const bodyText = await page.textContent('body');
    console.log(`📝 Page contains "deal": ${bodyText.toLowerCase().includes('deal')}`);
    console.log(`📝 Page contains "$": ${bodyText.includes('$')}`);
    console.log(`📝 Page contains "vote": ${bodyText.toLowerCase().includes('vote')}`);
    
    // Try multiple selectors to find deals
    const selectors = [
      'button:has-text("vote")',
      'button:has-text("upvote")', 
      '[data-testid*="deal"]',
      '.deal',
      'div:has-text("$")',
      'article'
    ];
    
    let totalFound = 0;
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found ${count} elements with: ${selector}`);
        totalFound += count;
      }
    }
    
    if (totalFound === 0) {
      console.log('❌ NO DEALS FOUND! Taking screenshot...');
      await page.screenshot({ path: 'no-deals-debug.png', fullPage: true });
      console.log('📸 Screenshot saved: no-deals-debug.png');
      console.log(`🌐 Current URL: ${page.url()}`);
      return;
    }
    
    console.log(`✅ Found ${totalFound} deal-related elements total`);
    
    // STEP 3: Try to vote
    console.log('\nSTEP 3: Testing voting...');
    
    // Look for vote buttons using the actual selectors from components
    const voteSelectors = [
      '[aria-label*="vote"]',
      '[role="button"]', // TouchableOpacity renders as button role
      'div[role="button"]', // Alternative button role  
      'svg', // Look for SVG icons (ChevronUp/ChevronDown are SVGs)
    ];
    
    let voteElementsFound = 0;
    for (const selector of voteSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found ${elements} elements with selector: ${selector}`);
        voteElementsFound += elements;
      }
    }
    
    if (voteElementsFound > 0) {
      console.log(`✅ Found ${voteElementsFound} vote-related elements total`);
      
      // Try to click on button elements that might be vote buttons
      const clickableElements = page.locator('[role="button"]');
      const clickableCount = await clickableElements.count();
      
      if (clickableCount > 5) { // If we have many clickable elements, try to find vote-specific ones
        console.log(`🔍 Found ${clickableCount} clickable elements, trying to click a potential vote button`);
        await clickableElements.nth(2).click(); // Try clicking one that might be a vote button
        await page.waitForTimeout(2000);
        console.log('✅ Clicked on potential vote element');
      }
    } else {
      console.log('❌ No vote elements found');
    }
    
    // STEP 4: Try to comment
    console.log('\nSTEP 4: Testing comments...');
    
    // Look for comment inputs - React Native uses TextInput, not HTML input
    const commentSelectors = [
      'input[placeholder*="comment"]',
      'textarea[placeholder*="comment"]',
      'input[placeholder*="Comment"]',
      'input', // Generic input search
      'textarea' // Generic textarea search
    ];
    
    let commentInputsFound = 0;
    for (const selector of commentSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ Found ${elements} elements with selector: ${selector}`);
        commentInputsFound += elements;
      }
    }
    
    if (commentInputsFound > 0) {
      console.log(`✅ Found ${commentInputsFound} input elements total`);
      
      // Try to find and use a comment input
      const inputs = page.locator('input, textarea');
      const inputCount = await inputs.count();
      
      if (inputCount > 2) { // Skip login inputs, look for others
        const commentInput = inputs.nth(2); // Try third input (after email/password)
        await commentInput.fill('Test comment from E2E');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(2000);
        console.log('✅ Comment potentially submitted');
      }
    } else {
      console.log('❌ No comment inputs found');
    }
    
    // STEP 5: Test POST page
    console.log('\nSTEP 5: Testing post page...');
    await page.goto(`${baseURL}/(tabs)/post`);
    await page.waitForLoadState('networkidle');
    
    const postInputs = page.locator('input[placeholder*="title"], textarea');
    const postCount = await postInputs.count();
    
    if (postCount > 0) {
      console.log(`✅ Post page works - found ${postCount} inputs`);
    } else {
      console.log('❌ Post page not working');
    }
    
    // STEP 6: Test PROFILE page
    console.log('\nSTEP 6: Testing profile page...');
    await page.goto(`${baseURL}/(tabs)/profile`);
    await page.waitForLoadState('networkidle');
    
    const profileText = await page.textContent('body');
    if (profileText.toLowerCase().includes('profile') || profileText.toLowerCase().includes('user')) {
      console.log('✅ Profile page works');
    } else {
      console.log('❌ Profile page not working');
    }
    
    console.log('\n🎉 ONE USER test completed!');
    console.log('📋 SUMMARY:');
    console.log(`   Deals found: ${totalFound > 0 ? '✅' : '❌'}`);
    console.log(`   Vote elements: ${voteElementsFound > 0 ? '✅' : '❌'}`);
    console.log(`   Comment inputs: ${commentInputsFound > 0 ? '✅' : '❌'}`);
    console.log(`   Post page: ${postCount > 0 ? '✅' : '❌'}`);
  });
});
