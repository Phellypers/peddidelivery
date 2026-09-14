import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Bike, Mail, Loader2, ArrowLeft, LogIn, UserPlus } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import BottomSheetSelect from '@/components/ui/BottomSheetSelect';

const VEHICLE_OPTIONS = [
  { value: 'moto', label: '🏍️ Moto' },
  { value: 'bicicleta', label: '🚲 Bicicleta' },
  { value: 'carro', label: '🚗 Carro' },
  { value: 'a_pe', label: '🚶 A pé' },
];

export default function DelivererRegister() {
  const urlParams = new URLSearchParams(window.location.search);
  const presetEmail = urlParams.get('email') || '';
  const { user, isAuthenticated } = useAuth();

  const [step, setStep] = useState('invite'); // invite | form | otp
  const [form, setForm] = useState({
    email: presetEmail, name: '', phone: '', vehicle: 'moto',
    password: '', confirmPassword: '',
  });
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // If already logged in, redirect to deliverer app
  useEffect(() => {
    if (isAuthenticated && user && !redirecting) {
      setRedirecting(true);
      window.location.href = '/entregador';
    }
  }, [isAuthenticated, user, redirecting]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem'); return; }
    if (form.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      // Validate deliverer invite exists
      const dels = await base44.entities.Deliverer.filter({ email: form.email });
      if (!dels[0]) {
        setError('Você não foi convidado como entregador. Solicite ao gestor o envio do seu convite por e-mail.');
        setLoading(false);
        return;
      }
      await base44.auth.register({ email: form.email, password: form.password });
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Erro ao cadastrar. Este e-mail já pode estar em uso.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: form.email, otpCode });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      const me = await base44.auth.me();
      const dels = await base44.entities.Deliverer.filter({ email: form.email });
      if (dels[0]) {
        await base44.entities.Deliverer.update(dels[0].id, {
          name: form.name, phone: form.phone, vehicle: form.vehicle, user_id: me.id, is_active: true,
        });
        window.location.href = '/entregador';
      } else {
        setError('Você não foi convidado como entregador.');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Código inválido');
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    try { await base44.auth.resendOtp(form.email); } catch (err) { setError(err.message || 'Erro ao reenviar'); }
  };

  // ── Redirecting state ──
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-primary mx-auto" />
          <p className="text-sm text-gray-500">Redirecionando para o app de entregas...</p>
        </div>
      </div>
    );
  }

  // ── OTP step ──
  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-sm p-8 space-y-6">
          <button onClick={() => setStep('form')} className="text-xs text-gray-400 flex items-center gap-1"><ArrowLeft size={12} /> Voltar</button>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail size={28} className="text-primary" />
            </div>
            <h1 className="font-heading font-bold text-xl">Verifique seu e-mail</h1>
            <p className="text-sm text-gray-500 mt-1">Enviamos um código para {form.email}</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <button onClick={handleVerify} disabled={loading || otpCode.length < 6}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar cadastro'}
          </button>
          <p className="text-center text-sm text-gray-400">
            Não recebeu? <button onClick={handleResend} className="text-primary font-medium hover:underline">Reenviar</button>
          </p>
        </div>
      </div>
    );
  }

  // ── Form step ──
  if (step === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-sm p-8 space-y-6">
          <button onClick={() => { setStep('invite'); setError(''); }} className="text-xs text-gray-400 flex items-center gap-1"><ArrowLeft size={12} /> Voltar</button>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Bike size={28} className="text-primary" />
            </div>
            <h1 className="font-heading font-bold text-xl">Cadastro de Entregador</h1>
            <p className="text-sm text-gray-500 mt-1">Crie sua conta para receber entregas</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Nome completo *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">WhatsApp *</label>
              <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">E-mail *</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Veículo</label>
              <BottomSheetSelect
                value={form.vehicle}
                onChange={v => set('vehicle', v)}
                label="Selecione seu veículo"
                options={VEHICLE_OPTIONS}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Senha *</label>
              <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Confirmar senha *</label>
              <input type="password" required value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Cadastrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Invite landing step ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-md p-8 space-y-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Bike size={40} className="text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-gray-900">Você foi convidado!</h1>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Você recebeu um convite para ser entregador. Crie sua conta para começar a receber entregas, ou entre se já possui cadastro.
          </p>
        </div>
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-left">{error}</div>}
        <div className="space-y-3">
          <button onClick={() => { setError(''); setStep('form'); }}
            className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors">
            <UserPlus size={18} /> Cadastrar-se
          </button>
          <Link to="/login?returnTo=/entregador"
            className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <LogIn size={18} /> Já tenho conta / Entrar
          </Link>
        </div>
        <p className="text-xs text-gray-400">
          Após concluir o cadastro ou login, você será direcionado automaticamente ao app de entregas.
        </p>
        <Link to="/loja" className="inline-block text-xs text-gray-400 hover:text-primary transition-colors">← Voltar ao cardápio</Link>
      </div>
    </div>
  );
}