import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight, Package, ShoppingCart, Sparkles, Wallet, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { peddiApi } from '@/services/api/peddiApi';

const steps = [
  { key: 'dashboard', path: '/admin', title: 'Visão geral', text: 'Aqui você acompanha tudo que acontece no seu cardápio.', icon: BarChart3 },
  { key: 'orders', path: '/admin/pedidos', title: 'Pedidos', text: 'Aqui você recebe e acompanha seus pedidos.', icon: ShoppingCart },
  { key: 'products', path: '/admin/catalogo', title: 'Produtos', text: 'Cadastre, edite e organize os produtos do seu cardápio.', icon: Package },
  { key: 'marketing', path: '/admin/marketing', title: 'Marketing', text: 'Crie promoções, campanhas e ações para seus clientes.', icon: Sparkles },
  { key: 'finance', path: '/admin/financeiro', title: 'Financeiro', text: 'Acompanhe vendas, custos e resultados do negócio.', icon: Wallet },
];

export default function ManagerOnboarding({ onTourVisibilityChange }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const storageKey = useMemo(() => user?.id ? `peddi_manager_onboarding_v1:${user.id}` : '', [user?.id]);
  const isManager = ['manager', 'admin', 'peddi_admin'].includes(user?.role);
  const step = steps[stepIndex];

  useEffect(() => {
    if (!isManager || !storageKey) return undefined;
    const completed = user?.preferences?.manager_onboarding_completed || localStorage.getItem(storageKey) === '1';
    if (completed) return undefined;
    const timer = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(timer);
  }, [isManager, storageKey, user?.preferences?.manager_onboarding_completed]);

  useEffect(() => {
    onTourVisibilityChange?.(open);
    return () => onTourVisibilityChange?.(false);
  }, [open, onTourVisibilityChange]);

  useEffect(() => {
    if (!open) return undefined;
    navigate(step.path);
    const updateTarget = () => {
      const element = document.querySelector(`[data-manager-tour="${step.key}"]`);
      if (!element) return setTargetRect(null);
      const rect = element.getBoundingClientRect();
      setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };
    const timer = window.setTimeout(updateTarget, 180);
    window.addEventListener('resize', updateTarget);
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', updateTarget); };
  }, [navigate, open, step.key, step.path]);

  const finish = async () => {
    localStorage.setItem(storageKey, '1');
    setOpen(false);
    try { await peddiApi.updatePreferences({ manager_onboarding_completed: true }); } catch (error) { console.warn('Não foi possível sincronizar a preferência do onboarding:', error); }
  };

  if (!open || !isManager) return null;
  const Icon = step.icon;

  return createPortal(
    <div className="fixed inset-0 z-[240]" role="dialog" aria-modal="true" aria-labelledby="manager-tour-title">
      {targetRect ? (
        <div aria-hidden="true" className="pointer-events-none fixed rounded-2xl border-2 border-[#22C55E] bg-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.64),0_0_0_6px_rgba(34,197,94,0.22)] transition-all duration-300" style={{ top: targetRect.top - 5, left: targetRect.left - 5, width: targetRect.width + 10, height: targetRect.height + 10 }} />
      ) : <div aria-hidden="true" className="fixed inset-0 bg-slate-950/65" />}

      <section className="fixed inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto max-w-md rounded-3xl border border-gray-200 bg-white p-5 text-[#111111] shadow-2xl sm:inset-x-auto sm:right-6 sm:w-[390px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-green-700"><Icon size={22} /></span>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-green-700">Primeiros passos · {stepIndex + 1}/{steps.length}</p><h2 id="manager-tour-title" className="font-heading text-lg font-bold">{step.title}</h2></div>
          </div>
          <button type="button" aria-label="Pular apresentação" onClick={finish} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <p className="text-sm leading-6 text-gray-600">{step.text}</p>
        <div className="my-5 flex gap-1.5" aria-hidden="true">{steps.map((item, index) => <span key={item.key} className={`h-1.5 rounded-full transition-all ${index === stepIndex ? 'w-8 bg-green-500' : 'w-2 bg-gray-200'}`} />)}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={finish} className="mr-auto min-h-11 px-2 text-xs font-semibold text-gray-500 hover:text-gray-900">Não mostrar novamente</button>
          {stepIndex > 0 && <button type="button" onClick={() => setStepIndex(index => index - 1)} className="flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 px-3 text-sm font-semibold text-gray-700"><ChevronLeft size={16} /> Voltar</button>}
          <button type="button" onClick={() => stepIndex === steps.length - 1 ? finish() : setStepIndex(index => index + 1)} className="flex min-h-11 items-center gap-1 rounded-xl bg-[#22C55E] px-4 text-sm font-bold text-[#111111]">
            {stepIndex === steps.length - 1 ? 'Concluir' : 'Próximo'} {stepIndex < steps.length - 1 && <ChevronRight size={16} />}
          </button>
        </div>
        <button type="button" onClick={finish} className="mt-3 w-full text-center text-xs font-medium text-gray-400 hover:text-gray-700">Pular tour</button>
      </section>
    </div>,
    document.body,
  );
}
