import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { peddiApi } from '@/services/api/peddiApi';
import { useAuth } from '@/lib/AuthContext';

export default function DemoNotice() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  useEffect(() => {
    if (!peddiApi.isConfigured) return;
    peddiApi.request('/health').then(result => setDemo(result.demoMode)).catch(() => {});
    const failed = event => setError(event.detail);
    const email = event => setEmailMessage(event.detail);
    const action = event => setActionMessage(event.detail);
    window.addEventListener('peddi-api-error', failed);
    window.addEventListener('peddi-demo-email', email);
    window.addEventListener('peddi-demo-action', action);
    return () => { window.removeEventListener('peddi-api-error', failed); window.removeEventListener('peddi-demo-email', email); window.removeEventListener('peddi-demo-action', action); };
  }, []);
  const presentation = user?.demoMode === 'presentation';
  if (!demo && !error && !presentation) return null;
  return <div className={`relative z-[60] border-b px-4 py-2 text-xs ${presentation ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
    {presentation && <p className="font-medium">Modo apresentação: explore e altere livremente. Nenhuma mudança desta sessão será gravada no banco ou enviada para serviços externos.</p>}
    {actionMessage && <p role="status" className="mt-1">{actionMessage} <button type="button" onClick={() => setActionMessage('')} className="ml-2 underline">Fechar</button></p>}
    {demo && <p>Teste local: cadastros salvos no PostgreSQL. Conta gestor demo sem expiração. Emails são simulados; pagamentos, WhatsApp e Google dependem de integração. Código de confirmação local: 000000.</p>}
    {emailMessage && <p role="status">{emailMessage}</p>}
    {error && <p role="alert" className="text-red-700 mt-1">{error} <a className="underline" href={`${pathname.startsWith('/admin') ? '/gestor/login' : '/login'}?returnTo=${encodeURIComponent(pathname)}`}>Entrar novamente</a> <button type="button" onClick={() => setError('')} className="underline ml-3">Fechar aviso</button></p>}
  </div>;
}
