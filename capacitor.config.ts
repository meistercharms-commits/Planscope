import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.planscope.app',
  appName: 'Planscope',
  webDir: 'out',
  server: {
    // For development, point to your local dev server:
    // Use your Mac's local IP so real devices can connect over WiFi
    url: 'http://172.20.10.3:3000',
    // For production, replace with your deployed URL:
    // url: 'https://planscope.co',
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3500,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'Planscope',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FFFFFF',
  },
};

export default config;
