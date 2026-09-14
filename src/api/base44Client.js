import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createLocalClient } from './localClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const legacyClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

export const base44 = import.meta.env.VITE_PEDDI_API_URL ? createLocalClient() : legacyClient;
