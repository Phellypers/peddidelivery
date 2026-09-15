const TEMPORARY_COVERS = [
  { terms: ['hamburguer', 'burger', 'lanche'], path: '/category-covers/hamburgueres.webp' },
  { terms: ['pizza'], path: '/category-covers/pizzas.webp' },
  { terms: ['acai'], path: '/category-covers/acai.webp' },
  { terms: ['bebida', 'suco', 'drink', 'refrigerante'], path: '/category-covers/bebidas.webp' },
  { terms: ['sobremesa', 'doce', 'dessert'], path: '/category-covers/sobremesas.webp' },
  { terms: ['promocao', 'promocoes', 'oferta', 'desconto'], path: '/category-covers/promocoes.webp' },
];

const normalize = value => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

export function getTemporaryCategoryCover(category) {
  if (category?.image_url) return null;
  const searchable = normalize(`${category?.name || ''} ${category?.description || ''}`);
  return TEMPORARY_COVERS.find(cover => cover.terms.some(term => searchable.includes(term)))?.path || null;
}

export function getCategoryCover(category) {
  return category?.image_url || getTemporaryCategoryCover(category);
}
