const ACTIVE = ['navegando', 'interessado', 'carrinho', 'checkout'];
const THREE_MIN = 180000;
const FIVE_MIN = 300000;
const historyFor = session => session.event_history?.length ? session.event_history : [{ stage: session.stage, at: session.last_event_at, current_product: session.current_product, cart_items: session.cart_items }];

// Projection only: never changes campaign stages or recovery eligibility.
export function summarizeLiveSessions(rows, now = Date.now()) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  const sessions = [...new Map(rows.map(row => [row.session_id || row.id, row])).values()];
  const events = [];
  const computedSessions = [];
  const stageCounts = Object.fromEntries([...ACTIVE, 'concluida', 'abandonou'].map(stage => [stage, 0]));
  for (const session of sessions) {
    const history = historyFor(session);
    const name = session.customer_user_id && session.customer_name ? session.customer_name : 'Visitante';
    history.forEach((event, index) => {
      const at = Date.parse(event.at);
      if (!Number.isFinite(at) || at > now) return;
      const messages = {
        navegando: 'entrou no cardápio', interessado: event.current_product ? `visualizou ${event.current_product}` : 'visualizou um produto',
        carrinho: event.cart_action === 'removed' ? 'removeu um item do carrinho' : event.cart_action === 'updated' ? 'atualizou o carrinho' : event.added_item ? `adicionou ${event.added_item} ao carrinho` : 'adicionou um item ao carrinho',
        checkout: 'iniciou o checkout', concluida: 'concluiu um pedido', abandonou: 'abandonou o fluxo de compra',
      };
      if (messages[event.stage]) events.push({ ...event, name, message: messages[event.stage], id: `${session.id}:${index}:${event.at}:${event.stage}` });
    });
    const last = Date.parse(session.last_event_at);
    const age = now - last;
    const abandonedAt = last + FIVE_MIN;
    const timedOut = ['interessado', 'carrinho', 'checkout'].includes(session.stage) && age > FIVE_MIN;
    if (timedOut) events.push({ id: `${session.id}:timeout:${last}`, at: new Date(abandonedAt).toISOString(), stage: 'abandonou', name, message: 'abandonou o fluxo de compra' });
    let effectiveStage = session.stage;
    if (timedOut) effectiveStage = 'abandonou';
    if (ACTIVE.includes(effectiveStage) && (!Number.isFinite(last) || age >= THREE_MIN)) effectiveStage = 'inactive';
    if (effectiveStage === 'abandonou' && (timedOut ? abandonedAt : last) < today) effectiveStage = 'inactive';
    if (effectiveStage === 'concluida' && last < today) effectiveStage = 'inactive';
    if (effectiveStage !== 'inactive') computedSessions.push({ ...session, effectiveStage, inactiveMs: age });
    if (ACTIVE.includes(effectiveStage)) stageCounts[effectiveStage]++;
  }
  const daily = events.filter(event => Date.parse(event.at) >= today && Date.parse(event.at) <= now);
  const conversions = daily.filter(event => event.stage === 'concluida').length;
  const abandonments = daily.filter(event => event.stage === 'abandonou').length;
  stageCounts.concluida = conversions; stageCounts.abandonou = abandonments;
  const activeCount = ACTIVE.reduce((total, stage) => total + stageCounts[stage], 0);
  const buyingCount = stageCounts.carrinho + stageCounts.checkout;
  const visitorsToday = sessions.filter(session => historyFor(session).some(event => Date.parse(event.at) >= today && Date.parse(event.at) <= now)).length;
  const convertingSessions = new Set(daily.filter(event => event.stage === 'concluida').map(event => event.id.split(':')[0])).size;
  const conversionRate = visitorsToday ? Math.round(convertingSessions / visitorsToday * 100) : 0;
  return { computedSessions, stageCounts, activeCount, events: events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)), conversions, abandonments, buyingCount, conversionRate };
}
