import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

interface ResponsiveInfo {
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  isWeb: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (): ResponsiveInfo => {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;
  const isWeb = Platform.OS === 'web';
  const isDesktop = isWeb && width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;
  const orientation = width > height ? 'landscape' : 'portrait';

  return {
    isDesktop,
    isTablet,
    isMobile,
    isWeb,
    screenWidth: width,
    screenHeight: height,
    orientation,
  };
};

export const getResponsiveStyles = (responsive: ResponsiveInfo) => {
  const { isDesktop, isTablet, isMobile } = responsive;
  
  return {
    container: {
      flexDirection: isDesktop ? 'row' : 'column' as any,
      padding: isDesktop ? 24 : isTablet ? 16 : 12,
    },
    sidebar: {
      width: isDesktop ? 280 : '100%',
      height: isDesktop ? '100%' : 'auto',
    },
    content: {
      flex: 1,
      marginLeft: isDesktop ? 24 : 0,
      marginTop: isDesktop ? 0 : 16,
    },
    grid: {
      flexDirection: isDesktop ? 'row' : 'column' as any,
      flexWrap: isDesktop ? 'wrap' : 'nowrap' as any,
      gap: isDesktop ? 24 : 16,
    },
    gridItem: {
      width: isDesktop ? '48%' : isTablet ? '48%' : '100%',
      marginBottom: isMobile ? 12 : 0,
    },
    card: {
      borderRadius: isDesktop ? 16 : 12,
      padding: isDesktop ? 24 : isTablet ? 20 : 16,
      shadowRadius: isDesktop ? 8 : 4,
      elevation: isDesktop ? 4 : 2,
    },
    text: {
      fontSize: isDesktop ? 16 : isTablet ? 15 : 14,
    },
    title: {
      fontSize: isDesktop ? 32 : isTablet ? 28 : 24,
    },
    subtitle: {
      fontSize: isDesktop ? 20 : isTablet ? 18 : 16,
    },
  };
};
