import { peddiApi } from './peddiApi';
import { demoCreate, demoDelete, demoList, demoUpdate, isPresentationDemo, seedDemoCollection } from '@/lib/presentationDemo';

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('peddi_access_token') || ''}` });
const entity = (path, key) => ({
  list: async () => isPresentationDemo()
    ? demoList(key === 'product' ? 'Product' : 'Ingredient', async () => (await peddiApi.request(`/api/v1/admin/${path}`, { headers: headers() }))[`${key}s`])
    : (await peddiApi.request(`/api/v1/admin/${path}`, { headers: headers() }))[`${key}s`],
  create: async data => isPresentationDemo() ? demoCreate(key === 'product' ? 'Product' : 'Ingredient', data) : (await peddiApi.request(`/api/v1/admin/${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }))[key],
  update: async (id, data) => isPresentationDemo() ? demoUpdate(key === 'product' ? 'Product' : 'Ingredient', id, data) : (await peddiApi.request(`/api/v1/admin/${path}/${id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(data) }))[key],
  delete: id => isPresentationDemo() ? demoDelete(key === 'product' ? 'Product' : 'Ingredient', id) : peddiApi.request(`/api/v1/admin/${path}/${id}`, { method: 'DELETE', headers: headers() }),
});

export const productService = entity('products', 'product');
export const ingredientService = entity('ingredients', 'ingredient');
export async function loadAdminCatalog() {
  const catalog = await peddiApi.request('/api/v1/admin/catalog', { headers: headers() });
  if (!isPresentationDemo()) return catalog;
  seedDemoCollection('Product', catalog.products);
  seedDemoCollection('Category', catalog.categories);
  return { ...catalog, products: await demoList('Product', async () => catalog.products), categories: await demoList('Category', async () => catalog.categories) };
}
export async function loadAdminReports() {
  return peddiApi.request('/api/v1/admin/reports', { headers: headers() });
}
