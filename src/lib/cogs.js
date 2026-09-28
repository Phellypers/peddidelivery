export function getItemTotalCogs(item, productCostMap = {}) {
  if (item?.total_cogs !== undefined && item?.total_cogs !== null) return Number(item.total_cogs) || 0;
  return (Number(productCostMap[item?.product_id]) || 0) * (Number(item?.quantity) || 0);
}

export function getItemUnitCogs(item, productCostMap = {}) {
  if (item?.unit_cogs !== undefined && item?.unit_cogs !== null) return Number(item.unit_cogs) || 0;
  return Number(productCostMap[item?.product_id]) || 0;
}
