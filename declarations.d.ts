// Image file declarations
declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}

declare module '*.jpeg' {
  const value: any;
  export default value;
}

declare module '*.gif' {
  const value: any;
  export default value;
}

declare module '*.webp' {
  const value: any;
  export default value;
}

declare module '*.svg' {
  const value: any;
  export default value;
}

// Other asset declarations
declare module '*.json' {
  const value: any;
  export default value;
}

// Environment variables (if using process.env)
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    EXPO_PUBLIC_API_URL?: string;
    DATABASE_URL?: string;
    JWT_SECRET?: string;
  }
}

// Global type augmentations for your app
declare global {
  interface Window {
    // Add any global window properties your app might use
    __DEV__?: boolean;
  }
}

// Expo Router specific declarations (if needed)
declare module 'expo-router' {
  export * from 'expo-router/build/exports';
}