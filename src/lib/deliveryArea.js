const states = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const romans = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
export function normalizeLocation(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\b(distrito federal)\b/g, 'df').replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/^(regiao administrativa|bairro|cidade de|ra)\s+/, '')
    .replace(new RegExp(`\\s+(${states.join('|').toLowerCase()})$`), '')
    .replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/, token => romans[token]);
}
export const normalizePostalCode = value => String(value || '').replace(/[\s.-]/g, '');
const names = value => (Array.isArray(value) ? value : String(value || '').split(/[,;\n]/)).map(normalizeLocation).filter(Boolean);
export function findDeliveryArea(areas, address, hasConfiguredAreas = areas.length > 0) {
  const candidates = [address.neighborhood, address.region, address.city,
    ...String(address.address || '').split(/[,;]|\s+-\s+/)].map(normalizeLocation).filter(Boolean);
  const zip = normalizePostalCode(address.zip);
  const state = String(address.state || String(address.city || '').match(/[-/]\s*([A-Za-z]{2})\s*$/)?.[1] || '').toUpperCase().trim();
  const ranked = areas.filter(area => area.is_active !== false).map(area => {
    if (state && area.state && String(area.state).trim().toUpperCase() !== state) return null;
    const start = normalizePostalCode(area.zip_start), end = normalizePostalCode(area.zip_end);
    const hasRange = Boolean(start || end);
    if (hasRange && (!/^\d{8}$/.test(start) || !/^\d{8}$/.test(end) || !/^\d{8}$/.test(zip) || zip < start || zip > end)) return null;
    const exact = [normalizeLocation(area.name), ...names(area.aliases), ...names(area.neighborhoods)].some(name => name && candidates.includes(name));
    const municipality = normalizeLocation(area.municipality);
    if (!exact && !(hasRange && (!municipality || municipality === normalizeLocation(address.city)))) return null;
    return { area, score: (hasRange ? 2 : 0) + (exact ? 1 : 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  return { allowed: Boolean(ranked.length) || !hasConfiguredAreas, area: ranked[0]?.area || null };
}
export function validateDeliveryAddress(areas, address, options = {}) {
  if (address.deliveryMethod === 'pickup') return { valid: true, area: null, error: '' };
  if (!String(address.address || '').trim() || !String(address.city || '').trim()) return { valid: false, area: null, error: 'Informe o endereço completo e a cidade.', reason: 'missing_address' };
  if (!/^\d{8}$/.test(normalizePostalCode(address.zip))) return { valid: false, area: null, error: 'Informe um CEP válido com 8 números.', reason: 'invalid_zip' };
  const match = findDeliveryArea(areas, address, options.hasConfiguredAreas);
  if (!match.allowed) return { valid: false, area: null, error: 'Não entregamos para essa região. Confira a cidade e o bairro/região.', reason: 'outside_area' };
  if (options.subtotal !== undefined && Number(match.area?.min_order_value || 0) > options.subtotal) return { valid: false, area: match.area, error: `Pedido mínimo para esta região: R$ ${Number(match.area.min_order_value).toFixed(2).replace('.', ',')}.`, reason: 'minimum' };
  return { valid: true, area: match.area, error: '' };
}
