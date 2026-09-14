import { env } from '../../config/env.js';

type StorageSettings = { supabaseUrl: string; supabaseStorageKey: string; supabaseStorageBucket: string };

export function storageConfigured(settings: StorageSettings = env) {
  try {
    const url = new URL(settings.supabaseUrl);
    const key = settings.supabaseStorageKey;
    const legacyRole = key.startsWith('eyJ')
      ? JSON.parse(Buffer.from(key.split('.')[1] || '', 'base64url').toString()).role : undefined;
    return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')
      && !url.username && !url.password && url.pathname === '/'
      && /^[a-z0-9][a-z0-9_-]{0,62}$/.test(settings.supabaseStorageBucket)
      && (key.startsWith('sb_secret_') || legacyRole === 'service_role');
  } catch { return false; }
}

export class StorageUploadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function uploadImage(bytes: Buffer, objectPath: string, mime: string,
  settings: StorageSettings = env, send: typeof fetch = fetch) {
  if (!storageConfigured(settings)) throw new StorageUploadError(503, 'Configure o Supabase Storage no backend para enviar fotos.');
  const base = new URL(settings.supabaseUrl).origin;
  const path = objectPath.split('/').map(encodeURIComponent).join('/');
  const bucket = encodeURIComponent(settings.supabaseStorageBucket);
  const headers: Record<string, string> = {
    apikey: settings.supabaseStorageKey, 'Content-Type': mime,
    'x-upsert': 'false', 'cache-control': '3600',
  };
  // Secret keys are API keys, not JWTs. Legacy service_role also requires Bearer.
  if (!settings.supabaseStorageKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${settings.supabaseStorageKey}`;
  let response: Response;
  try {
    response = await send(`${base}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST', headers, body: new Uint8Array(bytes), signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
  } catch { throw new StorageUploadError(502, 'Nao foi possivel enviar a foto ao armazenamento. Tente novamente.'); }
  if (!response.ok) {
    await response.body?.cancel();
    const message = response.status === 401 || response.status === 403
      ? 'A credencial do Storage nao foi aceita. Confira a configuracao do backend.'
      : response.status === 404 ? 'Bucket de imagens nao encontrado. Confira a configuracao do backend.'
      : response.status === 413 ? 'A foto ultrapassa o limite de tamanho do bucket.'
      : 'O armazenamento recusou a foto. Tente novamente.';
    throw new StorageUploadError(response.status === 413 ? 413 : 502, message);
  }
  await response.body?.cancel();
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
