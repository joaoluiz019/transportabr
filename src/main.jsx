import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import App from '@/App.jsx'
import '@/index.css'
import { base44 } from '@/api/base44Client'

// Quanto tempo o splash animado (GIF) fica visível antes do fade-out.
const SPLASH_DURATION_MS = 2500

// Esconde o splash NATIVO assim que a webview está pronta. O overlay animado do
// index.html já está por baixo, então a transição não tem flash branco.
if (Capacitor.isNativePlatform()) {
  SplashScreen.hide().catch(() => {})
}

// Depois da animação, faz fade-out e remove o overlay do GIF.
const splashEl = document.getElementById('animated-splash')
if (splashEl) {
  window.setTimeout(() => {
    splashEl.classList.add('hide')
    window.setTimeout(() => splashEl.remove(), 450)
  }, SPLASH_DURATION_MS)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
window.base44 = base44;