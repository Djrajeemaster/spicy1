import { test as baseTest, expect } from '@playwright/test';
import { AuthPage } from './page-objects/auth-page';
import { DashboardPage } from './page-objects/dashboard-page';
import { DealsPage } from './page-objects/deals-page';
import { AdminPage } from './page-objects/admin-page';
import { ProfilePage } from './page-objects/profile-page';

/**
 * Extended test fixture for SaversDream E2E testing
 * అన్ని page objects మరియు utilities accessible చేస్తుంది
 */

export const test = baseTest.extend<{
  authPage: AuthPage;
  dashboardPage: DashboardPage;
  dealsPage: DealsPage;
  adminPage: AdminPage;
  profilePage: ProfilePage;
  testUser: {
    email: string;
    password: string;
    username: string;
  };
  adminUser: {
    email: string;
    password: string;
    username: string;
  };
}>({
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  dealsPage: async ({ page }, use) => {
    const dealsPage = new DealsPage(page);
    await use(dealsPage);
  },

  adminPage: async ({ page }, use) => {
    const adminPage = new AdminPage(page);
    await use(adminPage);
  },

  profilePage: async ({ page }, use) => {
    const profilePage = new ProfilePage(page);
    await use(profilePage);
  },

  testUser: async ({}, use) => {
    await use({
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      username: 'testuser'
    });
  },

  adminUser: async ({}, use) => {
    await use({
      email: 'admin@saversdream.com',
      password: 'AdminPassword123!',
      username: 'admin'
    });
  }
});

export { expect } from '@playwright/test';
