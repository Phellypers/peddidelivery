import { useEffect, useRef, useState } from 'react';
import { peddiApi } from '@/services/api/peddiApi';
import { isPresentationDemo } from '@/lib/presentationDemo';

export function useChatTyping(ticketId, enabled = true) {
  const [typing, setTyping] = useState(false);
  const lastSent = useRef(0);
  const stopTimer = useRef(null);
  const send = active => {
    if (!enabled || !ticketId || ticketId.startsWith('deliverer_') || isPresentationDemo()) return;
    return peddiApi.request(`/api/v1/demo/chat/${ticketId}/typing`, {method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('peddi_access_token') || ''}`},body:JSON.stringify({typing:active})}).catch(()=>{});
  };
  useEffect(() => {
    setTyping(false);lastSent.current=0;
    if (!enabled || !ticketId || ticketId.startsWith('deliverer_') || isPresentationDemo()) return undefined;
    let disposed=false;
    const poll=async()=>{
      try {
        const result=await peddiApi.request(`/api/v1/demo/chat/${ticketId}/typing`,{headers:{Authorization:`Bearer ${localStorage.getItem('peddi_access_token') || ''}`}});
        if(!disposed)setTyping(Boolean(result.typing));
      } catch {if(!disposed)setTyping(false);}
    };
    void poll();const timer=setInterval(poll,2000);
    return ()=>{disposed=true;clearInterval(timer);clearTimeout(stopTimer.current);void send(false);};
  },[ticketId,enabled]);
  const stop=()=>{clearTimeout(stopTimer.current);lastSent.current=0;void send(false);};
  const change=value=>{
    clearTimeout(stopTimer.current);
    if(!value.trim()){stop();return;}
    if(Date.now()-lastSent.current>2000){lastSent.current=Date.now();void send(true);}
    stopTimer.current=setTimeout(stop,3000);
  };
  return {typing,change,stop};
}
