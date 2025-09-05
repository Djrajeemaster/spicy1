import { Page, Locator, expect } from '@playwright/test';

/**
 * Dashboard Page Object Model
 * User dashboard navigation మరియు functionality
 */
export class DashboardPage {
  readonly page: Page;
  
  // Header navigation
  readonly logoLink: Locator;
  readonly homeLink: Locator;
  readonly dealsLink: Locator;
  readonly profileLink: Locator;
  readonly userMenuDropdown: Locator;
  readonly logoutButton: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly notificationBell: Locator;
  
  // Sidebar navigation
  readonly sidebarToggle: Locator;
  readonly sidebar: Locator;
  readonly myDealsLink: Locator;
  readonly favoritesLink: Locator;
  readonly followingLink: Locator;
  readonly settingsLink: Locator;
  
  // Main content area
  readonly welcomeMessage: Locator;
  readonly recentDeals: Locator;
  readonly trendingDeals: Locator;
  readonly categoriesGrid: Locator;
  readonly createDealButton: Locator;
  
  // Stats/metrics
  readonly dealCount: Locator;
  readonly followerCount: Locator;
  readonly votesCount: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Header selectors
    this.logoLink = page.locator('[data-testid="logo-link"]');
    this.homeLink = page.locator('[data-testid="nav-home"]');
    this.dealsLink = page.locator('[data-testid="nav-deals"]');
    this.profileLink = page.locator('[data-testid="nav-profile"]');
    this.userMenuDropdown = page.locator('[data-testid="user-menu-dropdown"]');
    this.logoutButton = page.locator('[data-testid="logout-button"]');
    this.searchInput = page.locator('[data-testid="header-search-input"]');
    this.searchButton = page.locator('[data-testid="header-search-button"]');
    this.notificationBell = page.locator('[data-testid="notification-bell"]');
    
    // Sidebar selectors
    this.sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.myDealsLink = page.locator('[data-testid="sidebar-my-deals"]');
    this.favoritesLink = page.locator('[data-testid="sidebar-favorites"]');
    this.followingLink = page.locator('[data-testid="sidebar-following"]');
    this.settingsLink = page.locator('[data-testid="sidebar-settings"]');
    
    // Main content selectors
    this.welcomeMessage = page.locator('[data-testid="welcome-message"]');
    this.recentDeals = page.locator('[data-testid="recent-deals"]');
    this.trendingDeals = page.locator('[data-testid="trending-deals"]');
    this.categoriesGrid = page.locator('[data-testid="categories-grid"]');
    this.createDealButton = page.locator('[data-testid="create-deal-button"]');
    
    // Stats selectors
    this.dealCount = page.locator('[data-testid="user-deal-count"]');
    this.followerCount = page.locator('[data-testid="user-follower-count"]');
    this.votesCount = page.locator('[data-testid="user-votes-count"]');
  }

  /**
   * Navigate to dashboard
   */
  async goToDashboard() {
    await this.page.goto('/dashboard');
    await expect(this.welcomeMessage).toBeVisible();
  }

  /**
   * Test complete header navigation
   */
  async testHeaderNavigation() {
    // Test logo navigation
    await this.logoLink.click();
    await expect(this.page).toHaveURL('/');
    
    // Test deals navigation
    await this.dealsLink.click();
    await expect(this.page).toHaveURL('/deals');
    
    // Test profile navigation
    await this.profileLink.click();
    await expect(this.page).toHaveURL('/profile');
    
    // Return to dashboard
    await this.homeLink.click();
    await expect(this.page).toHaveURL('/dashboard');
  }

  /**
   * Test sidebar navigation
   */
  async testSidebarNavigation() {
    // Open sidebar if not visible
    if (!(await this.sidebar.isVisible())) {
      await this.sidebarToggle.click();
    }
    
    await expect(this.sidebar).toBeVisible();
    
    // Test my deals navigation
    await this.myDealsLink.click();
    await expect(this.page).toHaveURL('/my-deals');
    
    // Test favorites navigation
    await this.favoritesLink.click();
    await expect(this.page).toHaveURL('/favorites');
    
    // Test following navigation
    await this.followingLink.click();
    await expect(this.page).toHaveURL('/following');
    
    // Test settings navigation
    await this.settingsLink.click();
    await expect(this.page).toHaveURL('/settings');
  }

  /**
   * Test search functionality
   */
  async testSearchFunctionality(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.searchButton.click();
    
    // Verify search results page
    await expect(this.page).toHaveURL(new RegExp(`/search.*q=${searchTerm}`));
    
    // Verify results are displayed
    const searchResults = this.page.locator('[data-testid="search-results"]');
    await expect(searchResults).toBeVisible();
  }

  /**
   * Test user menu dropdown
   */
  async testUserMenuDropdown() {
    await this.userMenuDropdown.click();
    
    // Verify dropdown options are visible
    await expect(this.profileLink).toBeVisible();
    await expect(this.settingsLink).toBeVisible();
    await expect(this.logoutButton).toBeVisible();
    
    // Close dropdown by clicking outside
    await this.page.click('body');
    await expect(this.profileLink).not.toBeVisible();
  }

  /**
   * Test logout functionality
   */
  async logout() {
    await this.userMenuDropdown.click();
    await this.logoutButton.click();
    
    // Verify redirected to login page
    await expect(this.page).toHaveURL('/login');
  }

  /**
   * Test create deal button
   */
  async testCreateDealButton() {
    await this.createDealButton.click();
    await expect(this.page).toHaveURL('/deals/create');
  }

  /**
   * Verify dashboard content is loaded
   */
  async verifyDashboardContent() {
    await expect(this.welcomeMessage).toBeVisible();
    await expect(this.recentDeals).toBeVisible();
    await expect(this.trendingDeals).toBeVisible();
    await expect(this.categoriesGrid).toBeVisible();
  }

  /**
   * Test notification functionality
   */
  async testNotifications() {
    await this.notificationBell.click();
    
    const notificationPanel = this.page.locator('[data-testid="notification-panel"]');
    await expect(notificationPanel).toBeVisible();
    
    // Test marking notification as read
    const firstNotification = this.page.locator('[data-testid="notification-item"]').first();
    if (await firstNotification.isVisible()) {
      await firstNotification.click();
      // Verify notification behavior
    }
  }

  /**
   * Verify user stats are displayed
   */
  async verifyUserStats() {
    await expect(this.dealCount).toBeVisible();
    await expect(this.followerCount).toBeVisible();
    await expect(this.votesCount).toBeVisible();
    
    // Verify stats contain numbers
    const dealCountText = await this.dealCount.textContent();
    const followerCountText = await this.followerCount.textContent();
    const votesCountText = await this.votesCount.textContent();
    
    expect(dealCountText).toMatch(/\d+/);
    expect(followerCountText).toMatch(/\d+/);
    expect(votesCountText).toMatch(/\d+/);
  }
}
