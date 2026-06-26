// Tempo real (Fase 5): conecta ao gateway Socket.io do backend e distribui os
// eventos `entity:changed` para os assinantes registrados via subscribe().
import { io } from 'socket.io-client';
import { API_URL, getToken } from './http';

let socket = null;
const listeners = new Map(); // entidade (lowercase) -> Set<cb>

function ensureSocket() {
  if (socket) return;
  const token = getToken();
  if (!token) return; // só conecta autenticado
  socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
  socket.on('entity:changed', ({ entity, action }) => {
    const set = listeners.get(entity);
    if (set) set.forEach((cb) => {
      try { cb({ action, entity }); } catch (e) { /* noop */ }
    });
  });
}

/** Assina mudanças de uma entidade (ex.: 'Expense'). Retorna a função de unsubscribe. */
export function subscribeEntity(name, cb) {
  const key = String(name).toLowerCase();
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(cb);
  ensureSocket();
  return () => {
    listeners.get(key)?.delete(cb);
  };
}

/** Encerra a conexão (ex.: no logout). */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
}
