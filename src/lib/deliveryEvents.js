export function deliveryActionEvent(previous, changes, actor, eventId) {
  if (!previous || !actor.userId || actor.role !== 'courier' || previous.deliverer_user_id !== actor.userId) return null;
  let type;
  if (changes.deliverer_user_id === '') type = 'refused';
  else if (changes.deliverer_accepted === true && !previous.deliverer_accepted) type = 'accepted';
  else if (changes.status === 'shipped' && previous.status !== 'shipped') type = 'picked_up';
  else if (changes.status === 'delivered' && previous.status !== 'delivered') type = 'delivered';
  return type ? { id: eventId, origin: 'courier', actor_id: actor.userId, type } : null;
}

export function newDeliveryAction(previous, current) {
  const event = current?.delivery_action_event;
  if (event?.origin !== 'courier' || !event.id || event.id === previous?.delivery_action_event?.id) return null;
  return ['accepted', 'refused', 'picked_up', 'delivered'].includes(event.type) ? event.type : null;
}
