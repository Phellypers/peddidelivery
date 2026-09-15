import { isPresentationDemo, simulateExternalAction } from '@/lib/presentationDemo';

const apiUrl = import.meta.env.VITE_PEDDI_API_URL || 'http://localhost:3333';
let refreshPending;

export function saveSession(result) {
  localStorage.setItem('peddi_access_token', result.accessToken);
  if (result.refreshToken) localStorage.setItem('peddi_refresh_token', result.refreshToken);
}

async function refreshSession() {
  if (!refreshPending) {
    refreshPending = (async () => {
      const refreshToken = localStorage.getItem('peddi_refresh_token');
      if (!refreshToken) return false;
      const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
      });
      if (response.status === 401) {
        localStorage.removeItem('peddi_refresh_token');
        return false;
      }
      if (!response.ok) throw new Error('Não foi possível renovar a sessão. Tente novamente.');
      saveSession(await response.json());
      return true;
    })().finally(() => { refreshPending = undefined; });
  }
  return refreshPending;
}

async function request(path, options = {}, retried = false) {
  const method = String(options.method || 'GET').toUpperCase();
  if (isPresentationDemo() && !['GET', 'HEAD', 'OPTIONS'].includes(method) && !path.startsWith('/api/v1/auth/')) {
    simulateExternalAction('Ação simulada. Nenhuma informação foi enviada ou gravada fora desta sessão.');
    return { demo: true, temporary: true, deleted: 0 };
  }
  const response = await fetch(`${apiUrl}${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 && options.headers?.Authorization && !retried && await refreshSession()) {
    return request(path, { ...options, headers: { ...options.headers, Authorization: `Bearer ${localStorage.getItem('peddi_access_token')}` } }, true);
  }
  if (!response.ok) {
    const error = new Error(response.status === 401 && options.headers?.Authorization
      ? 'Sua sessão terminou. Entre novamente para continuar.' : body.error || `PEDDI API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export const peddiApi = {
  request,
  isConfigured: true,
  login: (email, password) => request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: (token) => request('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } }),
  orders: (token) => request('/api/v1/orders', { headers: { Authorization: `Bearer ${token}` } }),
  stores: () => request('/api/v1/stores'),
  catalog: (storeId) => request(`/api/v1/stores/${storeId}/catalog`),
};

export const demoCatalog = {
  store: { id: 'demo-store', name: 'Loja PEDDI Demo', description: 'Cardapio de demonstracao da PEDDI.', opening_hours: 'Aberto para testes', address: 'Ambiente local', city: 'PEDDI' },
  categories: [
    { id: 'demo-featured', name: 'Destaques', is_featured: true, is_active: true, badge_color: 'orange' },
    { id: 'demo-combos', name: 'Combos', is_featured: true, is_active: true, badge_color: 'green' },
  ],
  products: [
    { id: 'demo-product-1', name: 'Combo PEDDI', description: 'Produto de demonstracao para testar o cardapio.', price: 29.9, promo_price: 24.9, is_featured: true, category_ids: ['demo-featured', 'demo-combos'], tags: ['demo'], views: 100 },
    { id: 'demo-product-2', name: 'Lanche Especial', description: 'Item demonstrativo com adicionais.', price: 19.9, is_featured: true, category_ids: ['demo-featured'], tags: ['demo'], views: 80 },
  ],
};

export async function loadPublicCatalog() {
  try {
    const stores = await peddiApi.stores();
    const store = stores.stores?.find(store => store.slug === 'loja-demo') || stores.stores?.[0];
    if (store) {
      const catalog = await peddiApi.catalog(store.id);
      return { store, categories: catalog.categories.map(category => ({ ...category, is_featured: category.is_featured ?? true, is_active: category.is_active ?? true })), products: catalog.products.map(product => ({ ...product, category_ids: product.category_ids ?? (product.categoryId ? [product.categoryId] : []), is_published: true })) };
    }
  } catch (error) {
    console.warn('API PEDDI indisponivel; usando catalogo de contingencia local:', error);
  }
  return demoCatalog;
}
