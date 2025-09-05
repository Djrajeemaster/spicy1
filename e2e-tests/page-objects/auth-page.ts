import { Page, Locator, expect } from '@playwright/test';

/**
 * Authentication Page Object Model
 * Login, Register, Forgot Password అన్ని flows handle చేస్తుంది
 */
export class AuthPage {
  readonly page: Page;
  
  // Login elements
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly rememberMeCheckbox: Locator;
  
  // Register elements
  readonly registerUsernameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerConfirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly termsCheckbox: Locator;
  readonly loginFromRegisterLink: Locator;
  
  // Common elements
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly loadingSpinner: Locator;
  
  // Social login
  readonly googleLoginButton: Locator;
  readonly facebookLoginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Login selectors
    this.loginEmailInput = page.locator('[data-testid="login-email"]');
    this.loginPasswordInput = page.locator('[data-testid="login-password"]');
    this.loginButton = page.locator('[data-testid="login-submit"]');
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]');
    this.registerLink = page.locator('[data-testid="register-link"]');
    this.rememberMeCheckbox = page.locator('[data-testid="remember-me"]');
    
    // Register selectors
    this.registerUsernameInput = page.locator('[data-testid="register-username"]');
    this.registerEmailInput = page.locator('[data-testid="register-email"]');
    this.registerPasswordInput = page.locator('[data-testid="register-password"]');
    this.registerConfirmPasswordInput = page.locator('[data-testid="register-confirm-password"]');
    this.registerButton = page.locator('[data-testid="register-submit"]');
    this.termsCheckbox = page.locator('[data-testid="terms-checkbox"]');
    this.loginFromRegisterLink = page.locator('[data-testid="login-from-register-link"]');
    
    // Common selectors
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    
    // Social login
    this.googleLoginButton = page.locator('[data-testid="google-login"]');
    this.facebookLoginButton = page.locator('[data-testid="facebook-login"]');
  }

  /**
   * Navigate to login page
   */
  async goToLogin() {
    await this.page.goto('/login');
    await expect(this.loginEmailInput).toBeVisible();
  }

  /**
   * Navigate to register page
   */
  async goToRegister() {
    await this.page.goto('/register');
    await expect(this.registerEmailInput).toBeVisible();
  }

  /**
   * Complete login flow
   */
  async login(email: string, password: string, rememberMe: boolean = false) {
    await this.goToLogin();
    
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    
    if (rememberMe) {
      await this.rememberMeCheckbox.check();
    }
    
    await this.loginButton.click();
    
    // Wait for navigation or error
    await this.page.waitForURL(url => url.pathname !== '/login', { timeout: 10000 });
  }

  /**
   * Complete registration flow
   */
  async register(username: string, email: string, password: string, confirmPassword?: string) {
    await this.goToRegister();
    
    await this.registerUsernameInput.fill(username);
    await this.registerEmailInput.fill(email);
    await this.registerPasswordInput.fill(password);
    await this.registerConfirmPasswordInput.fill(confirmPassword || password);
    
    await this.termsCheckbox.check();
    await this.registerButton.click();
    
    // Wait for success message or error
    await expect(this.successMessage.or(this.errorMessage)).toBeVisible();
  }

  /**
   * Test invalid login attempts
   */
  async attemptInvalidLogin(email: string, password: string) {
    await this.goToLogin();
    
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
    
    await expect(this.errorMessage).toBeVisible();
  }

  /**
   * Test navigation between login and register
   */
  async testNavigationFlow() {
    // Start at login
    await this.goToLogin();
    
    // Go to register
    await this.registerLink.click();
    await expect(this.registerEmailInput).toBeVisible();
    
    // Go back to login
    await this.loginFromRegisterLink.click();
    await expect(this.loginEmailInput).toBeVisible();
  }

  /**
   * Test forgot password flow
   */
  async testForgotPassword(email: string) {
    await this.goToLogin();
    await this.forgotPasswordLink.click();
    
    // Assuming forgot password has email input
    const forgotEmailInput = this.page.locator('[data-testid="forgot-email"]');
    const forgotSubmitButton = this.page.locator('[data-testid="forgot-submit"]');
    
    await forgotEmailInput.fill(email);
    await forgotSubmitButton.click();
    
    await expect(this.successMessage).toBeVisible();
  }

  /**
   * Verify user is logged in
   */
  async verifyLoggedIn() {
    // Check if we're redirected to dashboard or user menu is visible
    const userMenu = this.page.locator('[data-testid="user-menu"]');
    await expect(userMenu).toBeVisible();
  }

  /**
   * Verify user is logged out
   */
  async verifyLoggedOut() {
    // Check if login button is visible
    const loginButton = this.page.locator('[data-testid="header-login-button"]');
    await expect(loginButton).toBeVisible();
  }

  /**
   * Test form validations
   */
  async testFormValidations() {
    await this.goToRegister();
    
    // Test empty form submission
    await this.registerButton.click();
    await expect(this.errorMessage).toBeVisible();
    
    // Test invalid email format
    await this.registerEmailInput.fill('invalid-email');
    await this.registerButton.click();
    await expect(this.errorMessage).toBeVisible();
    
    // Test password mismatch
    await this.registerEmailInput.fill('test@example.com');
    await this.registerPasswordInput.fill('password123');
    await this.registerConfirmPasswordInput.fill('different123');
    await this.registerButton.click();
    await expect(this.errorMessage).toBeVisible();
  }
}
