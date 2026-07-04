// Login social NATIVO (iOS/Android) via @capgo/capacitor-social-login.
// No navegador usamos o Google Identity Services (web) em GoogleButton.jsx;
// dentro do app o SDK web do Google é bloqueado no WebView, então aqui
// chamamos as telas nativas do Google e da Apple e devolvemos o JWT
// (idToken) que o backend valida em /auth/google e /auth/apple.
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

// Client ID WEB do Google (o mesmo cadastrado no backend em GOOGLE_CLIENT_ID).
const GOOGLE_WEB_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '819927565471-3pdtqkb27koar7ftk0s9ueu01gnlk0br.apps.googleusercontent.com';

// Client ID do tipo **iOS** criado no Google Cloud Console (bundle
// com.base69b029d8fcb18bdaa5bc7102.app). Sem ele o login Google no iPhone falha.
// Fallback embutido porque o .env é gitignored e não existe no build do Codemagic
// (mesma lógica do client web em GoogleButton.jsx). É um ID público, não é segredo.
const GOOGLE_IOS_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID ||
  '819927565471-omdr1kdr1e7tos9c56ggnu44k2tr8ga3.apps.googleusercontent.com';

// Sign in with Apple: no iOS nativo o "aud" do token é o bundle id do app.
const APPLE_CLIENT_ID =
  import.meta.env.VITE_APPLE_CLIENT_ID || 'com.base69b029d8fcb18bdaa5bc7102.app';

let initPromise = null;
async function ensureInit() {
  if (initPromise) return initPromise;
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  initPromise = SocialLogin.initialize({
    google: {
      iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      webClientId: GOOGLE_WEB_CLIENT_ID,
    },
    apple: {
      clientId: APPLE_CLIENT_ID,
    },
  }).then(() => SocialLogin);
  return initPromise;
}

/** true quando o login Google nativo tem as credenciais mínimas configuradas. */
export const isNativeGoogleConfigured = !isNative || !!GOOGLE_IOS_CLIENT_ID;

/** Abre a tela nativa do Google e devolve o idToken (JWT) para o backend. */
export async function nativeGoogleSignIn() {
  // Sem o client ID iOS o SDK nativo do Google faz fatalError e derruba o app.
  // Barramos antes para exibir uma mensagem em vez de crashar.
  if (isNative && !GOOGLE_IOS_CLIENT_ID) {
    throw new Error('Login Google não configurado neste app (falta o Client ID iOS).');
  }
  const SocialLogin = await ensureInit();
  const { result } = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'] },
  });
  const idToken = result?.idToken;
  if (!idToken) throw new Error('Google não retornou o token de identidade');
  return { idToken };
}

/**
 * Abre a tela nativa "Sign in with Apple" e devolve o identityToken (JWT).
 * A Apple só envia nome/email no PRIMEIRO login — por isso montamos o nome aqui
 * e enviamos junto (o backend só o usa para preencher o cadastro na 1ª vez).
 */
export async function nativeAppleSignIn() {
  const SocialLogin = await ensureInit();
  const { result } = await SocialLogin.login({
    provider: 'apple',
    options: { scopes: ['name', 'email'] },
  });
  const identityToken = result?.idToken;
  if (!identityToken) throw new Error('Apple não retornou o token de identidade');
  const p = result?.profile || {};
  const name = [p.givenName, p.familyName].filter(Boolean).join(' ').trim() || undefined;
  return { identityToken, name };
}
