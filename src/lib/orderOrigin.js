export function isPdvOrder(order = {}) {
  return order.created_via_pdv === true || String(order.sale_origin || '').startsWith('pdv_');
}
