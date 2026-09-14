import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, Store, ShoppingBag, Bike, BarChart3, MessageCircle, Heart, ArrowRight, Lock, Mail, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const SEGMENTS = [
  'Restaurante / Lanchonete', 'Açaí / Sorveteria', 'Pizzaria', 'Mercado / Sacolão',
  'Farmácia', 'Padaria', 'Loja de Roupas', 'Pet Shop', 'Salão / Barbearia',
  'Hamburgueria', 'Sushi', 'Outro'
];

export default function Landing() {
  const [step, setStep] = useState('form');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({
    owner_name: '', owner_cpf: '', phone: '', email: '', password: '',
    store_name: '', segment: SEGMENTS[0], zip_code: '', address: '',
    terms: false,
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.terms) { setError('Você precisa aceitar os termos de uso e política de privacidade'); return; }
    if (form.password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      await base44.auth.register({ email: form.email, password: form.password });
      setStep('otp');
    } catch (err) {
      setError(err.message?.includes('already') ? 'Este e-mail já está cadastrado. Faça login.' : (err.message || 'Erro ao cadastrar'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: form.email, otpCode: otp });
      if (result?.access_token) base44.auth.setToken(result.access_token);
      await base44.entities.Store.create({
        name: form.store_name,
        owner_name: form.owner_name,
        owner_cpf: form.owner_cpf,
        owner_email: form.email,
        business_segment: form.segment,
        phone: form.phone,
        whatsapp: form.phone,
        address: form.address,
        zip_code: form.zip_code,
        business_type: 'menu',
        description: `${form.store_name} — ${form.segment}`,
      });
      window.location.href = '/admin';
    } catch (err) {
      setError(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <img src="https://media.base44.com/images/public/6a382b7ab7116d571cddd00c/905a659a8_d663f7ae-8a44-4372-8708-273d4d1061ea-removebg-preview.png" alt="PEDDI" className="h-8 object-contain" />
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors flex items-center gap-1.5">
              <Lock size={15} /> Entrar
            </Link>
            <button onClick={() => setShowForm(true)} className="text-sm font-bold text-white bg-primary px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
              Cadastrar loja
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mb-4"> Plataforma de Delivery & PDV</span>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl text-gray-900 leading-tight max-w-2xl mx-auto">
            Sua loja online em <span className="text-primary">minutos</span>, não em dias.
          </h1>
          <p className="text-gray-500 text-lg mt-4 max-w-xl mx-auto">
            Cardápio digital, pedidos em tempo real, PDV completo, entregadores com rastreio e marketing automático. Tudo em um só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <button onClick={() => setShowForm(true)} className="bg-primary text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              Criar minha loja grátis <ArrowRight size={16} />
            </button>
            <Link to="/loja" className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-colors">
              Ver demonstração
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Features grid ── */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: Store, title: 'Catálogo Digital', desc: 'Monte seu cardápio com fotos, variações, adicionais e promoções em minutos.' },
            { icon: ShoppingBag, title: 'Pedidos em Tempo Real', desc: 'Receba pedidos no painel com notificação sonora e Kanban visual.' },
            { icon: BarChart3, title: 'PDV & Financeiro', desc: 'Venda no balcão, mesa ou delivery. Controle financeiro integrado.' },
            { icon: Bike, title: 'Entregadores', desc: 'App dedicado para motoboys com rastreio em tempo real no mapa.' },
            { icon: MessageCircle, title: 'Chat & CRM', desc: 'Converse com clientes, gerencie comentários e avaliações.' },
            { icon: Heart, title: 'Marketing Automático', desc: 'Cashback, promoções de aniversário, carrinho abandonado e upsell.' },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <f.icon size={24} className="text-primary" />
              </div>
              <h3 className="font-heading font-bold text-base text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Registration form (modal) ── */}
      {showForm && (
        <div data-peddi-modal="" className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !loading && setShowForm(false)}>
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8 max-w-xl w-full my-8 relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => !loading && setShowForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
              <X size={20} />
            </button>
          {step === 'form' && (
            <>
              <div className="text-center mb-6">
                <h2 className="font-heading font-extrabold text-2xl text-gray-900">Crie sua loja</h2>
                <p className="text-sm text-gray-500 mt-1">Preencha os dados e comece em minutos</p>
              </div>
              {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm mb-4">{error}</div>}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Nome do responsável *</label>
                  <input required value={form.owner_name} onChange={e => set('owner_name', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">CPF *</label>
                    <input required value={form.owner_cpf} onChange={e => set('owner_cpf', e.target.value)} placeholder="000.000.000-00" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Telefone *</label>
                    <input required value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">E-mail *</label>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Senha *</label>
                  <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Nome da loja *</label>
                    <input required value={form.store_name} onChange={e => set('store_name', e.target.value)} placeholder="Ex: Pizza Express" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div className="mt-3">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Segmento *</label>
                    <select value={form.segment} onChange={e => set('segment', e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">CEP *</label>
                      <input required value={form.zip_code} onChange={e => set('zip_code', e.target.value)} placeholder="00000-000" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block uppercase">Endereço *</label>
                      <input required value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rua, número" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    </div>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.terms} onChange={e => set('terms', e.target.checked)} className="w-4 h-4 accent-primary mt-0.5" />
                  <span>Aceito os <a href="#" className="text-primary font-medium">termos de uso</a> e a <a href="#" className="text-primary font-medium">política de privacidade</a>.</span>
                </label>
                <button type="submit" disabled={loading} className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <>Criar minha loja <ArrowRight size={16} /></>}
                </button>
              </form>
              <p className="text-center text-xs text-gray-400 mt-4">Já tem conta? <Link to="/login" className="text-primary font-medium">Fazer login</Link></p>
            </>
          )}
          {step === 'otp' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Mail size={28} className="text-primary" />
              </div>
              <div>
                <h2 className="font-heading font-extrabold text-xl">Verifique seu e-mail</h2>
                <p className="text-sm text-gray-500 mt-1">Enviamos um código para {form.email}</p>
              </div>
              {error && <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">{error}</div>}
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} autoFocus>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <button onClick={handleVerify} disabled={loading || otp.length < 6} className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar e criar loja'}
              </button>
              <button onClick={() => base44.auth.resendOtp(form.email)} className="text-xs text-gray-400">Reenviar código</button>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-5 flex flex-col items-center gap-3">
          <img src="https://media.base44.com/images/public/6a382b7ab7116d571cddd00c/905a659a8_d663f7ae-8a44-4372-8708-273d4d1061ea-removebg-preview.png" alt="PEDDI" className="h-7 object-contain" />
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} PEDDI — Plataforma SaaS para lojas e restaurantes</p>
          <Link to="/loja" className="text-xs text-gray-400 hover:text-primary transition-colors">Acessar vitrine</Link>
        </div>
      </footer>
    </div>
  );
}