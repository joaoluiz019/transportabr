// Client de compatibilidade: reproduz a superfície do SDK Base44, mas falando
// com o backend NestJS. Assim as páginas que importam `base44` quase não mudam.
import { apiFetch, getToken, setToken, clearToken, ApiError } from './http';
import { subscribeEntity, disconnectSocket } from './socket';

const ENTITY_PATHS = {
  Company: 'companies',
  Driver: 'drivers',
  Vehicle: 'vehicles',
  Advance: 'advances',
  Billing: 'billings',
  Expense: 'expenses',
  Fueling: 'fuelings',
  DriverInvite: 'driver-invites',
  User: 'users',
};

function makeEntity(name, path) {
  return {
    // segundo argumento (sort/limit do Base44) é ignorado — a API já ordena
    filter: (where = {}) => apiFetch('/' + path, { query: where }),
    list: () => apiFetch('/' + path),
    create: (data) => apiFetch('/' + path, { method: 'POST', body: data }),
    update: (id, data) => apiFetch(`/${path}/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => apiFetch(`/${path}/${id}`, { method: 'DELETE' }),
    bulkCreate: (items) => apiFetch(`/${path}/bulk`, { method: 'POST', body: items }),
    // tempo real via WebSocket; devolve a função de unsubscribe
    subscribe: (cb) => subscribeEntity(name, cb),
  };
}

const entities = {};
for (const [name, path] of Object.entries(ENTITY_PATHS)) {
  entities[name] = makeEntity(name, path);
}

const auth = {
  async me() {
    const u = await apiFetch('/auth/me');
    return { ...u, full_name: u.name }; // compat: o Base44 expunha full_name
  },
  async login(email, password) {
    const r = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setToken(r.access_token);
    return r.user;
  },
  async register(email, password, name) {
    const r = await apiFetch('/auth/register', { method: 'POST', body: { email, password, name } });
    setToken(r.access_token);
    return r.user;
  },
  forgotPassword(email) {
    return apiFetch('/auth/forgot-password', { method: 'POST', body: { email } });
  },
  async resetPassword(email, token, password) {
    const r = await apiFetch('/auth/reset-password', { method: 'POST', body: { email, token, password } });
    setToken(r.access_token);
    return r.user;
  },
  async loginWithGoogle(idToken) {
    const r = await apiFetch('/auth/google', { method: 'POST', body: { idToken } });
    setToken(r.access_token);
    return r.user;
  },
  async loginWithApple(identityToken, name) {
    const r = await apiFetch('/auth/apple', { method: 'POST', body: { identityToken, name } });
    setToken(r.access_token);
    return r.user;
  },
  updateMe(data) {
    return apiFetch('/users/me', { method: 'PATCH', body: data });
  },
  logout(redirect = true) {
    clearToken();
    disconnectSocket();
    if (redirect && typeof window !== 'undefined') window.location.href = '/login';
  },
  redirectToLogin() {
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
  isAuthenticated: () => !!getToken(),
};

const functions = {
  async invoke(name, payload = {}) {
    if (name === 'exportConsultantData') {
      const data = await apiFetch('/export', { query: payload });
      return { data, status: 200 };
    }
    if (name === 'associateDriver') {
      // no-op: a associação é feita pelo Driver.email
      return { data: { status: 'success' }, status: 200 };
    }
    throw new Error('Função desconhecida: ' + name);
  },
};

const integrations = {
  Core: {
    SendEmail: ({ to, subject, body }) =>
      apiFetch('/mail/send', { method: 'POST', body: { to, subject, body } }),
  },
};

export const base44 = {
  entities,
  auth,
  functions,
  integrations,
  // o backend já valida o escopo por empresa; User.filter({email}) usa /users?email=
  asServiceRole: { entities },
};

export { getToken, setToken, clearToken, ApiError };
export default base44;
