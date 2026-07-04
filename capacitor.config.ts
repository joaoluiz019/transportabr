import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Igual ao bundle id da Apple (APPLE_CLIENT_ID) para o Sign in with Apple funcionar.
  appId: 'com.base69b029d8fcb18bdaa5bc7102.app',
  appName: 'TransportaBR',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      // Não esconder automaticamente: o splash nativo (estático) fica até o app
      // web chamar SplashScreen.hide(), evitando flash branco antes do GIF animado.
      launchAutoHide: false,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },
};

export default config;
