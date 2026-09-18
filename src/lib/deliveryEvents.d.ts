export type DeliveryActionType = 'accepted' | 'refused' | 'picked_up' | 'delivered';
export interface DeliveryActionEvent {
  id: string;
  origin: 'courier';
  actor_id: string;
  type: DeliveryActionType;
}
interface DeliveryOrder {
  deliverer_user_id?: string;
  deliverer_accepted?: boolean;
  status?: string;
  delivery_action_event?: DeliveryActionEvent | null;
}
export function deliveryActionEvent(previous: DeliveryOrder | undefined, changes: DeliveryOrder, actor: { role?: string; userId?: string }, eventId: string): DeliveryActionEvent | null;
export function newDeliveryAction(previous: DeliveryOrder | undefined, current: DeliveryOrder | undefined): DeliveryActionType | null;
