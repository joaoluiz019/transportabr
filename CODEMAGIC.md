# Build na nuvem (Codemagic) — Android (.aab) e iOS (.ipa)

Gera os binários das duas lojas a partir do repositório, **sem precisar de Mac**. O pipeline está em
`codemagic.yaml` (raiz do frontend). App id / bundle id: **`com.base69b029d8fcb18bdaa5bc7102.app`**
(definido em `capacitor.config.ts`, igual ao `APPLE_CLIENT_ID`).

## 0. Pré-requisito de ícones (importante p/ aprovação nas lojas)
O ícone nativo padrão do Capacitor é o logo dele — as lojas recusam. Gere os ícones/splash a partir
de uma arte **1024×1024**:
```bash
npm i -D @capacitor/assets
# coloque uma imagem em assets/icon.png (1024x1024) e assets/splash.png (2732x2732)
npx @capacitor/assets generate --iconBackgroundColor '#0f172a' --splashBackgroundColor '#0f172a'
```
Commit das pastas `android/`/`ios/` atualizadas (ou deixe o Codemagic regenerar — o `codemagic.yaml`
roda `cap add`/`cap sync` se faltar).

## 1. Conectar o repositório
1. Crie conta em **codemagic.io** e conecte o repositório do **frontend** (GitHub).
2. O Codemagic detecta o `codemagic.yaml` automaticamente (workflows **android** e **ios**).

## 2. Assinatura Android (keystore)
Você precisa de uma keystore de release. Crie uma (Java já instalado):
```bash
keytool -genkey -v -keystore transportabr.keystore -alias transportabr \
  -keyalg RSA -keysize 2048 -validity 10000
```
> Guarde a keystore e as senhas com segurança — recomenda-se ativar o **Play App Signing** na Play
> Console (a keystore vira apenas "upload key").

No Codemagic: **Teams/App settings → Code signing identities → Android keystores** → faça upload da
keystore informando alias e senhas, com **reference name = `transportabr_keystore`** (igual ao
`codemagic.yaml`). O pipeline injeta a assinatura via `-Pandroid.injected.signing.*`.

## 3. Assinatura iOS (App Store Connect API key)
1. Tenha o **App ID** `com.base69b029d8fcb18bdaa5bc7102.app` registrado no Apple Developer (com a
   capability **Sign in with Apple**) e o app criado no **App Store Connect**.
2. Em **App Store Connect → Users and Access → Integrations → App Store Connect API**, gere uma chave
   (baixe o `.p8`, anote **Key ID** e **Issuer ID**).
3. No Codemagic: **Teams → Integrations → App Store Connect** → adicione a chave com o nome
   **`codemagic_asc_api_key`** (igual ao `integrations` do `codemagic.yaml`).
4. O Codemagic faz o **code signing automático** (cria/baixa certificados e provisioning para o bundle id).

## 4. Rodar o build
No Codemagic, dispare os workflows **android** e **ios** (manual ou por push). Ao final, baixe os
**artifacts**:
- Android: `android/app/build/outputs/**/*.aab`
- iOS: `build/ios/ipa/*.ipa`

## 5. Publicar nas lojas
- **Google Play:** crie o app na Play Console com o package `com.base69b029d8fcb18bdaa5bc7102.app` e
  faça upload do `.aab` (faixa interna → produção). (Opcional: automatizar com uma service account
  JSON e descomentar o bloco `publishing.google_play`.)
- **App Store:** com o app criado no App Store Connect, envie o `.ipa` (ou descomente
  `publishing.app_store_connect.submit_to_testflight` para ir direto ao TestFlight).

## Observações
- O app aponta para `https://api.transportabr.com.br` (fallback no código) — garanta que o **backend
  esteja no ar com HTTPS válido**, senão o app abre mas não loga.
- Adicione os domínios/origens necessários no Google Console para o login social **nativo** (ver
  `MOBILE.md`, seção de login social nativo — o botão web GIS não funciona dentro do app).
