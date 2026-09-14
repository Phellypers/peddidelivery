import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';

config({ path: '.env', quiet: true });
const api = process.env.PEDDI_HOSTING_API_URL;
let url;
try { url = new URL(api); } catch { /* Report only the missing setting. */ }
if (!url || url.protocol !== 'https:' || url.username || url.password
  || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  console.error('Configure PEDDI_HOSTING_API_URL no .env com o endereco HTTPS publico do backend antes de publicar.');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_PEDDI_API_URL: api, VITE_DEV_MOBILE_FRAME: 'false' },
});
process.exit(result.status ?? 1);
