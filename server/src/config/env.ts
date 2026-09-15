import { config } from 'dotenv';

// Backend secrets live in .env; environment variables keep priority.
config({ path: '.env', quiet: true });
if (process.env.DOTENV_CONFIG_PATH && process.env.DOTENV_CONFIG_PATH !== '.env') {
  config({ path: process.env.DOTENV_CONFIG_PATH, quiet: true });
}

export const env = {
  demoMode: process.env.PEDDI_DEMO_MODE === 'true' && process.env.NODE_ENV !== 'production',
  mvpMode: process.env.PEDDI_MVP_MODE === 'true',
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSSLMode: process.env.DATABASE_SSL_MODE ?? 'auto',
  databaseSSLCAFile: process.env.DATABASE_SSL_CA_FILE ?? '',
  databaseSSLCA: process.env.DATABASE_SSL_CA ?? '',
  databasePoolMax: Number(process.env.DATABASE_POOL_MAX ?? 5),
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  seedTestPassword: process.env.SEED_TEST_PASSWORD ?? '',
  presentationDemoPassword: process.env.PRESENTATION_DEMO_PASSWORD ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseStorageKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'peddi-images',
};

if (!env.jwtSecret || (process.env.NODE_ENV === 'production' && (env.jwtSecret.length < 32 || /change-me|gere-|development/i.test(env.jwtSecret)))) {
  throw new Error('JWT_SECRET precisa ser configurado em producao.');
}
