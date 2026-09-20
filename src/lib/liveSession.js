import { base44 } from '@/api/base44Client';
import { isPresentationDemo } from '@/lib/presentationDemo';

const SESSION_KEY = 'peddi_live_session_id';
const RECORD_KEY = 'peddi_live_record_id';
const USER_KEY = 'peddi_live_user_info';
const STAGE_KEY = 'peddi_live_stage';

const STAGE_ORDER = ['navegando', 'interessado', 'carrinho', 'checkout', 'concluida'];

function getSessionId() {
  if (isPresentationDemo()) return 'demo_' + Math.random().toString(36).slice(2, 10);
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

let pending = Promise.resolve();
export function emitLiveEvent(stage, extra = {}, options = {}) {
  if (isPresentationDemo()) return Promise.resolve({ demo: true, temporary: true });
  // Serialize writes from the same tab so product/cart effects share one session.
  pending = pending.then(() => writeLiveEvent(stage, extra, options));
  return pending;
}

async function writeLiveEvent(stage, extra = {}, options = {}) {
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
      const prior = await base44.entities.LiveSession.get(recordId);
      payload.event_history = extendHistory(prior, payload);
      await base44.entities.LiveSession.update(recordId, payload);
    } else {
      payload.event_history = extendHistory(null, payload);
      const created = await base44.entities.LiveSession.create(payload);
      if (created?.id) sessionStorage.setItem(RECORD_KEY, created.id);
    }
  } catch (_) {}
}

function extendHistory(prior, payload) {
  const history = [...(prior?.event_history || (prior?.last_event_at ? [{ stage: prior.stage, at: prior.last_event_at, current_product: prior.current_product, cart_items: prior.cart_items }] : []))];
  const last = Date.parse(prior?.last_event_at);
  const now = Date.parse(payload.last_event_at);
  const returnedAfterTimeout = ['interessado', 'carrinho', 'checkout'].includes(prior?.stage) && now - last > 300000;
  if (returnedAfterTimeout) {
    history.push({ stage: 'abandonou', at: new Date(last + 300000).toISOString() });
  }
  const stage = payload.stage || prior?.stage;
  const productChanged = stage === 'interessado' && payload.current_product !== undefined && payload.current_product !== prior?.current_product;
  const cartChanged = stage === 'carrinho' && payload.cart_items !== undefined && JSON.stringify(payload.cart_items) !== JSON.stringify(prior?.cart_items);
  if (!prior || returnedAfterTimeout || stage !== prior.stage || productChanged || cartChanged) {
    const previousCount = Number(prior?.cart_count || 0);
    const nextCount = Number(payload.cart_count ?? previousCount);
    const cartAction = nextCount > previousCount ? 'added' : nextCount < previousCount ? 'removed' : 'updated';
    const addedItem = payload.cart_items?.find(item => !prior?.cart_items?.includes(item));
    history.push({ stage, at: payload.last_event_at, current_product: payload.current_product || prior?.current_product, cart_items: payload.cart_items || prior?.cart_items, cart_action: cartAction, added_item: addedItem });
  }
  return history;
}
