# TransportaBR — App nativo (Capacitor) para App Store e Play Store

O frontend React/Vite é empacotado como app nativo com **Capacitor** (substitui o
empacotamento que o Base44 fazia). O Android já foi adicionado neste repositório; o
iOS deve ser adicionado num **Mac com Xcode**.

- `appId`: `com.base69b029d8fcb18bdaa5bc7102.app` (igual ao `APPLE_CLIENT_ID` — não altere sem
  atualizar a configuração do Sign in with Apple e o `APPLE_CLIENT_ID` do backend).
- `appName`: `TransportaBR` · `webDir`: `dist` · config em `capacitor.config.ts`.

## Pré-requisitos
- **Android:** Android Studio + JDK 17. **iOS:** macOS + Xcode + CocoaPods.
- Conta de desenvolvedor **Google Play** e **Apple Developer** (você já possui).

## 1. Apontar para a API hospedada (obrigatório)
O app nativo **não** acessa `localhost`. Antes de buildar para distribuição, defina no `.env`
(raiz) a URL pública do backend e rebuilde:
```
VITE_API_URL="https://api.seu-dominio.com"
```
O backend NestJS já habilita CORS para qualquer origem. Em produção, recomenda-se também
**habilitar SSL** no Postgres e usar `sslmode=require` (ver `server/.env`).

## 2. Build e sincronização
```
npm run cap:sync          # build web + copia para as plataformas
npm run cap:android       # build + sync + abre o Android Studio
npm run cap:ios           # (no Mac) build + sync + abre o Xcode
```
Para adicionar o iOS (uma vez, no Mac): `npx cap add ios`.

## 3. Ícones e splash
Há um ícone vetorial em `public/icon.svg` (usado pelo PWA). Para gerar os ícones/splash
nativos a partir de uma arte 1024×1024, use:
```
npm i -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0f172a' --splashBackgroundColor '#0f172a'
```
(Coloque `assets/icon.png` e `assets/splash.png` antes de rodar.)

## 4. Login social NATIVO (importante)
O botão "Continuar com o Google" atual usa **Google Identity Services (web)**, que **não funciona
dentro do WebView nativo**. No app, use plugins nativos. Os Client IDs já existem:
- Google **Android**: `819927565471-s5d5hhktq96f7a2st55ufq2eos0r13o8.apps.googleusercontent.com`
- Google **iOS**: `819927565471-omdr1kdr1e7tos9c56ggnu44k2tr8ga3.apps.googleusercontent.com`
- Apple (bundle id / audience): `com.base69b029d8fcb18bdaa5bc7102.app`

Passos:
1. Instale um plugin de login social, ex.: `@capgo/capacitor-social-login` (suporta Google e Apple).
2. **Android:** baixe o `google-services.json` (Firebase/Google) e coloque em `android/app/`.
   Configure o SHA-1/256 da sua keystore no Google Cloud Console.
3. **iOS:** habilite a capability **Sign in with Apple** no Xcode; adicione o URL scheme do Google
   (reverse client id) no `Info.plist`.
4. No frontend, detecte a plataforma e troque o fluxo:
   - `import { Capacitor } from '@capacitor/core'`
   - se `Capacitor.isNativePlatform()` → use o plugin nativo e envie o `idToken`/`identityToken`
     para `POST /auth/google` ou `POST /auth/apple` (o backend já valida e emite o JWT).
   - senão → mantém o `GoogleButton` (web GIS) atual.
   O backend **não muda** (já aceita o token do provedor em `/auth/google` e `/auth/apple`).

## 5. Deep links (redefinição de senha / convites)
Para abrir links `https://app.../reset-password?...` no app, configure **App Links** (Android) e
**Universal Links** (iOS) com o domínio do `APP_URL`. Alternativamente, ajuste o `APP_URL` do
backend para um esquema/host que o app intercepte.

## 6. Publicação
- **Android:** no Android Studio, gere um **AAB** assinado → Play Console.
- **iOS:** no Xcode, Archive → distribuir para a App Store Connect.
- Após publicar, configure as URLs das lojas no campo `store_url` dos convites (DriverInvite).

## Observação
O build/run nativo e o login social nativo **não foram testados neste ambiente** (Windows, sem
Xcode/emulador). A estrutura, a plataforma Android, os assets web e o pipeline estão prontos.
