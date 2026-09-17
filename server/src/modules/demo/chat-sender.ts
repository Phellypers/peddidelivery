// A manager can also contact their own store from the customer storefront.
export function resolveChatSender(manager: boolean, requested: unknown, ownTicket: boolean) {
  if (!manager) return 'customer';
  if (requested === 'customer') {
    if (!ownTicket) throw new Error('Não é permitido enviar mensagens como outro cliente.');
    return 'customer';
  }
  return 'store';
}
