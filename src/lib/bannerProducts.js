export function getBannerProductIds(banner = {}) {
  return [...new Set([
    ...(Array.isArray(banner.product_ids) ? banner.product_ids : []),
    banner.product_id,
  ].filter(Boolean))];
}

export function withBannerProductIds(banner, productIds) {
  const ids = [...new Set((productIds || []).filter(Boolean))];
  return { ...banner, product_ids: ids, product_id: ids[0] || '' };
}

export function ensureBannerIds(banners = []) {
  return banners.map(banner => ({
    ...banner,
    id: banner.id || crypto.randomUUID(),
  }));
}
