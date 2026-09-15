export function hasRecentProduct(categoryId: string, products: Array<Record<string, unknown>>, now?: Date): boolean;
export function getPriceDropBadge(product: Record<string, unknown>): string | null;
export function getPriceReductionUpdate(
  previousPrice: unknown,
  currentPrice: unknown,
  isNew?: boolean,
  now?: Date,
): { previous_price?: number | null; price_reduced_at?: string | null };
