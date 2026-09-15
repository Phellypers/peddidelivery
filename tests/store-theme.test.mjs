import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoreTheme, hexToHsl, normalizeHex, readableText } from '../src/lib/storeTheme.js';

test('uses the store primary color when no menu theme exists', () => {
  const theme = getStoreTheme({ primary_color: '#2563eb' });
  assert.equal(theme.primary, '#2563EB');
  assert.equal(theme.primaryHsl, '221 83% 53%');
  assert.equal(theme.onPrimary, '#FFFFFF');
});

test('keeps valid merchant colors and allowed radius', () => {
  const theme = getStoreTheme({ menu_theme: { primary_color: '#facc15', text_color: '#111111', background_color: '#fffbea', radius: '26px' } });
  assert.deepEqual(theme, { primary: '#FACC15', text: '#111111', background: '#FFFBEA', radius: '26px', onPrimary: '#111111', primaryHsl: '48 96% 53%' });
});

test('rejects invalid stored style values and chooses readable contrast', () => {
  const theme = getStoreTheme({ primary_color: 'url(bad)', menu_theme: { primary_color: 'red; display:none', text_color: '#123', background_color: '', radius: '999px' } });
  assert.deepEqual(theme, { primary: '#22C55E', text: '#172033', background: '#F6F8F7', radius: '18px', onPrimary: '#111111', primaryHsl: '142 71% 45%' });
  assert.equal(readableText('#FFFFFF'), '#111111');
  assert.equal(normalizeHex('#abcdef', '#000000'), '#ABCDEF');
  assert.equal(hexToHsl('#000000'), '0 0% 0%');
});
