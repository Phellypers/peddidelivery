export const chatReasons = {order_problem:'Problema com pedido',deliverer_problem:'Problema com entregador',order_change:'Alteração do pedido',question:'Dúvida',other:'Outros'};
export const chatLabels = {unread:'Não lida',in_progress:'Em atendimento',waiting:'Aguardando cliente',closed:'Encerrada'};
export function buildConversations(messages, tickets) {
  const groups = new Map(tickets.map(ticket => [ticket.id,{id:ticket.id,name:ticket.customer_name,email:ticket.customer_email,ticket,messages:[]} ]));
  for(const message of messages) {
    if(!groups.has(message.conversation_id)) groups.set(message.conversation_id,{id:message.conversation_id,name:message.customer_name,email:message.customer_email,messages:[]});
    groups.get(message.conversation_id).messages.push(message);
  }
  return [...groups.values()].map(conversation => {
    conversation.messages.sort((a,b)=>String(a.created_date).localeCompare(String(b.created_date)));
    const last=conversation.messages.at(-1);
    const unread=conversation.messages.filter(m=>['customer','deliverer'].includes(m.sender_type)&&!m.is_read_by_store).length;
    const ticketStatus=conversation.ticket?.status;
    const status=ticketStatus==='closed'?'closed':unread?'unread':ticketStatus==='waiting_response'?'waiting':ticketStatus==='in_progress'?'in_progress':last?.sender_type==='store'?'waiting':'in_progress';
    return {...conversation,name:conversation.name||last?.customer_name,email:conversation.email||last?.customer_email,last,unread,status,date:last?.created_date||conversation.ticket?.created_date,reason:chatReasons[conversation.ticket?.reason]||conversation.ticket?.reason_label||(conversation.id.startsWith('deliverer_')?'Conversa com entregador':'Motivo não informado')};
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
export function filterConversations(conversations,filters) {
  const term=filters.search.trim().toLocaleLowerCase('pt-BR');
  return conversations.filter(c=>{
    if((c.id.startsWith('deliverer_')?'deliverers':'customers')!==filters.tab) return false;
    if(term && ![c.name,c.email,c.ticket?.protocol].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(term))) return false;
    if(filters.reason && c.ticket?.reason!==filters.reason) return false;
    if(filters.status && c.status!==filters.status) return false;
    if(filters.from && new Date(c.date)<new Date(`${filters.from}T00:00:00`)) return false;
    if(filters.to && new Date(c.date)>new Date(`${filters.to}T23:59:59.999`)) return false;
    return true;
  });
}
export function matchesChatTab(conversation,tab) {
  return tab==='all'||(tab==='unread'?conversation.unread>0&&conversation.status!=='closed':tab==='in_progress'?conversation.status!=='closed':conversation.status==='closed');
}
export function remainingChatDays(ticket,now=Date.now()) {
  const expiry=ticket?.delete_after|| (ticket?.closed_at ? new Date(new Date(ticket.closed_at).getTime()+30*86400000).toISOString():null);
  return expiry?Math.max(0,Math.ceil((new Date(expiry).getTime()-now)/86400000)):null;
}
