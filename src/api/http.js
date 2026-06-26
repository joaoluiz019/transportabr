// Camada HTTP do frontend: fala com o backend NestJS (substitui o Base44).
// Fallback aponta para produção (o .env é gitignored e pode não existir no build de deploy).
export const API_URL = import.meta.env.VITE_API_URL || 'https://api.transportabr.com.br';
const TOKEN_KEY = '5Let7j3x7UqvZak';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(status, data) {
    super((data && (data.message || data.error)) || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch(path, { method = 'GET', body, query } = {}) {
  let url = API_URL + path;

  if (query && typeof query === 'object') {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || typeof v === 'object') continue;
      qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += '?' + s;
  }

  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    // token expirado em rota autenticada: descarta para forçar novo login
    if (res.status === 401 && !path.startsWith('/auth/')) clearToken();
    throw new ApiError(res.status, data);
  }
  return data;
}
