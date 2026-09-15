const NEW_PRODUCT_HIGHLIGHT_DAYS = 7;

export function hasRecentProduct(categoryId, products, now = new Date()) {
  const threshold = now.getTime() - NEW_PRODUCT_HIGHLIGHT_DAYS * 24 * 60 * 60 * 1000;
  return products.some(product => {
    if (!product?.category_ids?.includes(categoryId) || !product.created_date) return false;
    const createdAt = new Date(product.created_date).getTime();
    return Number.isFinite(createdAt) && createdAt >= threshold && createdAt <= now.getTime();
  });
}

export function getPriceDropBadge(product) {
  const style = product?.price_drop_badge_style || 'text';
  const previousPrice = Number(product?.previous_price || 0);
  const currentPrice = Number(product?.price || 0);
  if (style === 'off' || previousPrice <= currentPrice || currentPrice < 0) return null;

  const percentage = Math.round((1 - currentPrice / previousPrice) * 100);
  if (percentage <= 0) return null;
  return style === 'percentage' ? `-${percentage}%` : 'Baixou o preço';
}

export function getPriceReductionUpdate(previousPrice, currentPrice, isNew = false, now = new Date()) {
  if (isNew) return { previous_price: null, price_reduced_at: null };
  const previous = Number(previousPrice);
  const current = Number(currentPrice);
  if (current < previous) return { previous_price: previous, price_reduced_at: now.toISOString() };
  if (current > previous) return { previous_price: null, price_reduced_at: null };
  return {};
}
