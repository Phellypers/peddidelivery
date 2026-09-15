export const PRESENTATION_DEMO_EMAIL = 'designer.demo@peddi.app';

const collections = new Map();

const clone = value => value == null ? value : structuredClone(value);

function tokenPayload() {
  try {
    const token = localStorage.getItem('peddi_access_token');
    if (!token) return null;
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

export function isPresentationDemo() {
  return tokenPayload()?.demoMode === 'presentation';
}

export function resetPresentationDemo() {
  collections.clear();
}

export function simulateExternalAction(message = 'Ação externa simulada no modo apresentação.') {
  if (!isPresentationDemo()) return false;
  window.dispatchEvent(new CustomEvent('peddi-demo-action', { detail: message }));
  return true;
}

export function seedDemoCollection(name, rows) {
  if (!collections.has(name)) collections.set(name, clone(rows || []));
  return clone(collections.get(name));
}

export async function demoList(name, loader) {
  if (!collections.has(name)) seedDemoCollection(name, await loader());
  return clone(collections.get(name));
}

export async function demoCreate(name, data) {
  const rows = collections.get(name) || [];
  const now = new Date().toISOString();
  const record = { ...clone(data), id: crypto.randomUUID(), created_date: now, updated_date: now, demo_temporary: true };
  collections.set(name, [record, ...rows]);
  return clone(record);
}

export async function demoUpdate(name, id, data) {
  const rows = collections.get(name) || [];
  const index = rows.findIndex(row => row.id === id);
  const record = { ...(index >= 0 ? rows[index] : { id }), ...clone(data), id, updated_date: new Date().toISOString(), demo_temporary: true };
  if (index >= 0) rows[index] = record;
  else rows.unshift(record);
  collections.set(name, rows);
  return clone(record);
}

export async function demoDelete(name, id) {
  collections.set(name, (collections.get(name) || []).filter(row => row.id !== id));
}
