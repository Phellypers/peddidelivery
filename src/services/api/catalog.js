import { base44 } from '@/api/base44Client';
import { peddiApi } from './peddiApi';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('peddi_access_token') || ''}` });
const entity = (path, key) => ({
  list: async () => (await peddiApi.request(`/api/v1/admin/${path}`, { headers: headers() }))[`${key}s`],
  create: async data => (await peddiApi.request(`/api/v1/admin/${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }))[key],
  update: async (id, data) => (await peddiApi.request(`/api/v1/admin/${path}/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }))[key],
  delete: id => peddiApi.request(`/api/v1/admin/${path}/${id}`, { method: 'DELETE', headers: headers() }),
});

export const productService = peddiApi.isConfigured ? entity('products', 'product') : base44.entities.Product;
export const ingredientService = peddiApi.isConfigured ? entity('ingredients', 'ingredient') : base44.entities.Ingredient;
export async function loadAdminCatalog() {
  if (peddiApi.isConfigured) return peddiApi.request('/api/v1/admin/catalog', { headers: headers() });
  const [products, categories] = await Promise.all([base44.entities.Product.list('-created_date'), base44.entities.Category.list('sort_order')]);
  return { products, categories };
}
export async function loadAdminReports() {
  return { orders: await base44.entities.Order.list('-created_date') };
}
