import { isProductAvailable } from './productAvailability.js';
export const defaultSearchFilters = { sort: 'most_ordered', min: '', max: '', promotions: false, available: false };
export function filterSearchProducts(products, query, category, filters, now = new Date()) {
  const text = query.trim().toLocaleLowerCase('pt-BR');
  const price = p => Number(p.promo_price > 0 && p.promo_price < p.price ? p.promo_price : p.price);
  const date = p => new Date(p.created_date || p.created_at || 0).getTime() || 0;
  return products.filter(p => {
    if (category && !p.category_ids?.includes(category)) return false;
    if (text && ![p.name, p.description, ...(p.tags || [])].some(v => String(v || '').toLocaleLowerCase('pt-BR').includes(text))) return false;
    if (filters.min !== '' && price(p) < Number(filters.min)) return false;
    if (filters.max !== '' && price(p) > Number(filters.max)) return false;
    if (filters.promotions && !(p.promo_price > 0 && p.promo_price < p.price)) return false;
    if (filters.available && (p.is_paused || Number(p.stock ?? p.stockQuantity ?? 999) <= 0 || !isProductAvailable(p, now))) return false;
    return true;
  }).sort((a,b) => filters.sort === 'price_low' ? price(a)-price(b) : filters.sort === 'price_high' ? price(b)-price(a) : ['new','recent'].includes(filters.sort) ? date(b)-date(a) : Number(b.orders_count || 0)-Number(a.orders_count || 0));
}
