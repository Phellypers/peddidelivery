const HEX = /^#[0-9a-f]{6}$/i;
const RADII = new Set(['10px', '18px', '26px']);

export function normalizeHex(value, fallback) {
  return HEX.test(String(value || '')) ? String(value).toUpperCase() : fallback;
}

export function readableText(hex) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  return luminance > .45 ? '#111111' : '#FFFFFF';
}

export function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;
  const lightness = (max + min) / 2;
  const saturation = delta ? delta / (1 - Math.abs(2 * lightness - 1)) : 0;
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function getStoreTheme(store = {}) {
  const config = store.menu_theme || {};
  const primary = normalizeHex(config.primary_color, normalizeHex(store.primary_color, '#22C55E'));
  const text = normalizeHex(config.text_color, '#172033');
  const background = normalizeHex(config.background_color, '#F6F8F7');
  const radius = RADII.has(config.radius) ? config.radius : '18px';
  return { primary, text, background, radius, onPrimary: readableText(primary), primaryHsl: hexToHsl(primary) };
}
