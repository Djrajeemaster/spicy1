import { router } from 'expo-router';

/**
 * Universal back navigation handler that falls back to home if no history
 */
export const handleBackNavigation = (fallbackRoute: string = '/(tabs)') => {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute);
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
