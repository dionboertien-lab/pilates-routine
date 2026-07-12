import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dionboertien.pilates',
  appName: 'Kiné',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '443627015452-607m0jgju0crolb3vptrib6a0ej3jfdu.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
