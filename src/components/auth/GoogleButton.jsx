import React, { useEffect, useRef } from 'react';

// Client ID público (web). Fallback embutido porque o .env é gitignored e não
// existe no build de deploy (ex.: Vercel) — sem isso o botão não apareceria lá.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '819927565471-3pdtqkb27koar7ftk0s9ueu01gnlk0br.apps.googleusercontent.com';

let scriptPromise = null;
function loadGsi() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar Google Identity Services'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Botão "Continuar com Google" (Google Identity Services). Some se não houver VITE_GOOGLE_CLIENT_ID. */
export default function GoogleButton({ onCredential, onError }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGsi()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            if (resp?.credential) onCredential(resp.credential);
          },
        });
        if (ref.current) {
          window.google.accounts.id.renderButton(ref.current, {
            theme: 'outline',
            size: 'large',
            width: 320,
            text: 'continue_with',
            shape: 'rectangular',
          });
        }
      })
      .catch((e) => onError?.(e));
    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!GOOGLE_CLIENT_ID) return null;
  return <div ref={ref} className="flex justify-center" />;
}
