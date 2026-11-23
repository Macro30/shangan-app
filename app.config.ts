import type { ExpoConfig } from 'expo/config';

const appName = '上岸';
const slugAppName = 'shangan-debt-tracker';

const config: ExpoConfig = {
  name: appName,
  slug: slugAppName,
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'shangan',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0F172A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.shangan.debttracker',
  },
  android: {
    package: 'com.shangan.debttracker',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0F172A',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: ['POST_NOTIFICATIONS', 'SCHEDULE_EXACT_ALARM'],
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router', 'expo-notifications'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
