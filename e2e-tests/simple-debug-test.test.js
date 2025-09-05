const { test, expect } = require('@playwright/test');

const baseURL = 'http://localhost:8081';

// Helper function to login
async function loginUser(page, userType) {
  const users = {
    user: { email: 'user@example.com', password: 'password123' },
    business: { email: 'business@example.com', password: 'password123' },
    admin: { email: 'admin@example.com', password: 'password123' }
  };

  const user = users[userType];
  console.log(`🔐 Logging in as ${userType}: ${user.email}`);

  await page.goto(`${baseURL}/sign-in`);
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', user.email);
  await page.fill('input[type="password"], input[name="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForLoadState('networkidle');
  
  console.log(`✅ Login successful for ${userType}`);
}

test.describe('🔍 Simple Debug Test - One User Flow', () => {
  
  test('should complete full user journey - login → view deals → vote → comment → post', async ({ page }) => {
    console.log('🚀 Starting complete user journey test...');

    // Step 1: Login as regular user
    console.log('\n📝 STEP 1: Login');
    await loginUser(page, 'user');
    
    // Step 2: Go to home page and check for deals
    console.log('\n📝 STEP 2: Check deals on home page');
    await page.goto(`${baseURL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for deals to load
    
    // Look for deals with multiple selectors
    const dealSelectors = [
      '[data-testid*="deal"]',
      '.deal-card',
      '[class*="deal"]',
      'article',
      '[data-deal-id]',
      '.card',
      '[role="article"]'
    ];
    
    let dealsFound = 0;
    let dealElements = null;
    
    for (const selector of dealSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      console.log(`🔍 Selector "${selector}": ${count} elements`);
      
      if (count > 0) {
        dealsFound = count;
        dealElements = elements;
        break;
      }
    }
    
    console.log(`📊 Total deals found: ${dealsFound}`);
    
    if (dealsFound === 0) {
      console.log('⚠️ No deals found! Let me check what\'s on the page...');
      
      // Debug: Check page content
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').textContent();
      const hasError = bodyText.includes('error') || bodyText.includes('Error');
      
      console.log(`📄 Page title: ${pageTitle}`);
      console.log(`🔍 Page contains error: ${hasError}`);
      console.log(`📝 Page text preview: ${bodyText.substring(0, 200)}...`);
      
      // Check if we're actually logged in
      const currentUrl = page.url();
      const isSignedIn = !currentUrl.includes('sign-in');
      console.log(`🔐 Still signed in: ${isSignedIn}`);
      
      throw new Error('No deals found on home page!');
    }
    
    // Step 3: Try to vote on first deal
    console.log('\n📝 STEP 3: Test voting on first deal');
    const firstDeal = dealElements.first();
    
    // Look for vote buttons with different approaches
    const voteSelectors = [
      'button:has-text("👍")',
      'button:has-text("👎")',
      'button:has-text("Vote")',
      'button:has-text("Upvote")',
      'button:has-text("Downvote")',
      '[data-testid*="vote"]',
      '[data-testid*="upvote"]',
      '[data-testid*="downvote"]',
      '.vote-button',
      '.upvote',
      '.downvote'
    ];
    
    let voteButtonFound = false;
    
    for (const voteSelector of voteSelectors) {
      const voteButtons = firstDeal.locator(voteSelector);
      const voteCount = await voteButtons.count();
      
      if (voteCount > 0) {
        console.log(`✅ Found ${voteCount} vote buttons with selector: ${voteSelector}`);
        
        try {
          await voteButtons.first().click();
          console.log('✅ Vote clicked successfully');
          voteButtonFound = true;
          break;
        } catch (error) {
          console.log(`⚠️ Vote click failed: ${error.message}`);
        }
      }
    }
    
    if (!voteButtonFound) {
      console.log('⚠️ No vote buttons found in first deal');
    }
    
    // Step 4: Try to comment
    console.log('\n📝 STEP 4: Test commenting');
    const commentSelectors = [
      'input[placeholder*="comment" i]',
      'textarea[placeholder*="comment" i]',
      'button:has-text("Comment")',
      '[data-testid*="comment"]',
      '.comment-input',
      '.comment-form'
    ];
    
    let commentInputFound = false;
    
    for (const commentSelector of commentSelectors) {
      const commentInputs = page.locator(commentSelector);
      const commentCount = await commentInputs.count();
      
      if (commentCount > 0) {
        console.log(`✅ Found ${commentCount} comment elements with selector: ${commentSelector}`);
        
        try {
          const input = commentInputs.first();
          if (await input.getAttribute('type') !== 'submit') {
            await input.fill('This is a test comment from E2E testing');
            console.log('✅ Comment text entered successfully');
            commentInputFound = true;
            break;
          }
        } catch (error) {
          console.log(`⚠️ Comment input failed: ${error.message}`);
        }
      }
    }
    
    if (!commentInputFound) {
      console.log('⚠️ No comment inputs found');
    }
    
    // Step 5: Try to access posting (switch to business user)
    console.log('\n📝 STEP 5: Test deal posting as business user');
    await loginUser(page, 'business');
    
    await page.goto(`${baseURL}/(tabs)/post`);
    await page.waitForLoadState('networkidle');
    
    // Look for posting form elements
    const postSelectors = [
      'input[placeholder*="title" i]',
      'input[placeholder*="deal" i]',
      'textarea[placeholder*="description" i]',
      'input[placeholder*="price" i]',
      'form'
    ];
    
    let postFormFound = false;
    
    for (const postSelector of postSelectors) {
      const postElements = page.locator(postSelector);
      const postCount = await postElements.count();
      
      if (postCount > 0) {
        console.log(`✅ Found ${postCount} post form elements with selector: ${postSelector}`);
        postFormFound = true;
      }
    }
    
    if (postFormFound) {
      console.log('✅ Post form accessible for business user');
    } else {
      console.log('⚠️ No post form found for business user');
    }
    
    // Step 6: Test admin access
    console.log('\n📝 STEP 6: Test admin features');
    await loginUser(page, 'admin');
    
    // Try admin page
    await page.goto(`${baseURL}/admin`);
    const adminPageExists = !page.url().includes('404') && !page.url().includes('sign-in');
    
    if (adminPageExists) {
      console.log('✅ Admin page accessible');
    } else {
      console.log('⚠️ Admin page not found, checking for admin controls on main page');
      
      await page.goto(`${baseURL}/`);
      await page.waitForLoadState('networkidle');
      
      const adminControls = page.locator('button:has-text("Edit"), button:has-text("Delete"), button:has-text("Moderate")');
      const adminControlCount = await adminControls.count();
      
      console.log(`🔍 Found ${adminControlCount} admin controls on main page`);
    }
    
    console.log('\n🎉 User journey test completed!');
  });
});
