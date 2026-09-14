import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { peddiApi } from '@/services/api/peddiApi';

export default function DemoNotice() {
  const { pathname } = useLocation();
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  useEffect(() => {
    if (!peddiApi.isConfigured) return;
    peddiApi.request('/health').then(result => setDemo(result.demoMode)).catch(() => {});
    const failed = event => setError(event.detail);
    const email = event => setEmailMessage(event.detail);
    window.addEventListener('peddi-api-error', failed);
    window.addEventListener('peddi-demo-email', email);
    return () => { window.removeEventListener('peddi-api-error', failed); window.removeEventListener('peddi-demo-email', email); };
  }, []);
  if (!demo && !error) return null;
  return <div className="relative z-[60] bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-900">
    {demo && <p>Teste local: cadastros salvos no PostgreSQL. Conta gestor demo sem expiração. Emails são simulados; pagamentos, WhatsApp e Google dependem de integração. Código de confirmação local: 000000.</p>}
    {emailMessage && <p role="status">{emailMessage}</p>}
    {error && <p role="alert" className="text-red-700 mt-1">{error} <a className="underline" href={`/login?returnTo=${encodeURIComponent(pathname)}`}>Entrar novamente</a> <button type="button" onClick={() => setError('')} className="underline ml-3">Fechar aviso</button></p>}
  </div>;
}
