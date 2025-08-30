import { router } from 'expo-router';

/**
 * Universal back navigation handler that falls back to home if no history
 */
export const handleBackNavigation = (fallbackRoute: string = '/(tabs)') => {
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute);
    }
  } catch (error) {
    console.warn('Navigation error:', error);
    // Fallback to home if there's any navigation issue
    router.replace('/(tabs)');
  }
};

/**
 * Handle back navigation with a specific fallback route
 */
export const handleBackWithFallback = (fallbackRoute: string) => {
  handleBackNavigation(fallbackRoute);
};

/**
 * Force back navigation or go to home
 */
export const goBackOrHome = () => {
  handleBackNavigation('/(tabs)');
};

/**
 * Enhanced navigation that doesn't trigger unnecessary refreshes
 */
export const navigateWithoutRefresh = (route: string) => {
  try {
    router.push(route);
  } catch (error) {
    console.warn('Navigation error:', error);
    router.replace(route);
  }
};

/**
 * Navigate and replace current screen without triggering focus effects
 */
export const replaceWithoutRefresh = (route: string) => {
  try {
    router.replace(route);
  } catch (error) {
    console.warn('Navigation error:', error);
  }
};
