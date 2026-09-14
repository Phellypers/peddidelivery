import { base44 } from '@/api/base44Client';

const SESSION_KEY = 'peddi_live_session_id';
const RECORD_KEY = 'peddi_live_record_id';
const USER_KEY = 'peddi_live_user_info';
const STAGE_KEY = 'peddi_live_stage';

const STAGE_ORDER = ['navegando', 'interessado', 'carrinho', 'checkout', 'concluida'];

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = 's_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function getUserInfo() {
  let cached = sessionStorage.getItem(USER_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) {}
  }
  try {
    const user = await base44.auth.me();
    if (user?.email) {
      const info = { email: user.email, name: user.full_name || user.email, user_id: user.id };
      sessionStorage.setItem(USER_KEY, JSON.stringify(info));
      return info;
    }
  } catch (_) {}
  return null;
}

export async function emitLiveEvent(stage, extra = {}, options = {}) {
  try {
    const sessionId = getSessionId();
    const recordId = sessionStorage.getItem(RECORD_KEY);
    const payload = {
      session_id: sessionId,
      last_event_at: new Date().toISOString(),
      ...extra,
    };

    // No-regression: don't move the session back to an earlier stage
    if (options.noRegression) {
      const currentStage = sessionStorage.getItem(STAGE_KEY);
      const currentIndex = STAGE_ORDER.indexOf(currentStage);
      const newIndex = STAGE_ORDER.indexOf(stage);
      if (currentIndex >= 0 && newIndex >= 0 && newIndex < currentIndex) {
        // Keep current stage, only update other fields (cart_items, etc.)
      } else {
        payload.stage = stage;
        sessionStorage.setItem(STAGE_KEY, stage);
      }
    } else {
      payload.stage = stage;
      sessionStorage.setItem(STAGE_KEY, stage);
    }

    const userInfo = await getUserInfo();
    if (userInfo) {
      payload.customer_email = userInfo.email;
      payload.customer_name = userInfo.name;
      payload.customer_user_id = userInfo.user_id;
    }
    if (recordId) {
      await base44.entities.LiveSession.update(recordId, payload);
    } else {
      const created = await base44.entities.LiveSession.create(payload);
      if (created?.id) sessionStorage.setItem(RECORD_KEY, created.id);
    }
  } catch (_) {}
}