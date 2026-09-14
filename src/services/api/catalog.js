import { peddiApi } from './peddiApi';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('peddi_access_token') || ''}` });
const entity = (path, key) => ({
  list: async () => (await peddiApi.request(`/api/v1/admin/${path}`, { headers: headers() }))[`${key}s`],
  create: async data => (await peddiApi.request(`/api/v1/admin/${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }))[key],
  update: async (id, data) => (await peddiApi.request(`/api/v1/admin/${path}/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }))[key],
  delete: id => peddiApi.request(`/api/v1/admin/${path}/${id}`, { method: 'DELETE', headers: headers() }),
});

export const productService = entity('products', 'product');
export const ingredientService = entity('ingredients', 'ingredient');
export async function loadAdminCatalog() {
  return peddiApi.request('/api/v1/admin/catalog', { headers: headers() });
}
export async function loadAdminReports() {
  return peddiApi.request('/api/v1/admin/reports', { headers: headers() });
}
