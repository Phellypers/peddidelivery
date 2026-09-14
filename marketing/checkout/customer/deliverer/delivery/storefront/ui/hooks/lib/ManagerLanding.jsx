import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ShoppingBag, Layout, CreditCard, BarChart3, Smartphone, ArrowRight, LogIn, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ManagerLanding() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';

  const features = [
    { icon: Layout, title: 'Catálogo digital', desc: 'Cardápio e vitrine online com fotos, categorias e promoções.' },
    { icon: ShoppingBag, title: 'Gestão de pedidos', desc: 'Acompanhe pedidos em tempo real no Kanban e na lista.' },
    { icon: CreditCard, title: 'PDV completo', desc: 'Lance vendas no balcão, mesas e delivery com pagamento dividido.' },
    { icon: BarChart3, title: 'Relatórios e métricas', desc: 'Dashboard com vendas, ticket médio, origens e regiões.' },
    { icon: Smartphone, title: '100% responsivo', desc: 'Funciona no celular, tablet e desktop — seus clientes compram de qualquer tela.' },
  ];

  const ctaTarget = isAuthenticated && isAdmin ? '/admin' : '/login';
  const ctaLabel = isAuthenticated && isAdmin ? 'Acessar painel' : 'Entrar no sistema';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-sm text-gray-500 font-medium hover:text-primary transition-colors">← Ver vitrine pública</Link>
        {isAuthenticated ? (
          <Link to={isAdmin ? '/admin' : '/'} className="text-sm text-primary font-bold hover:underline">
            {isAdmin ? 'Ir ao painel' : 'Início'}
          </Link>
        ) : (
          <Link to="/login" className="text-sm text-primary font-bold hover:underline">Entrar</Link>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-8 pb-12 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold mb-5">
            <Check size={14} /> Plataforma de gestão para seu negócio
          </div>
        </motion.div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-gray-900 leading-tight mb-4">
          Sua vitrine digital<br />com gestão completa
        </h1>
        <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Catálogo online, pedidos em tempo real, PDV, relatórios e CRM — tudo em um só lugar, simples e rápido.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isAuthenticated && isAdmin ? (
            <Link to="/admin" className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors">
              Acessar painel <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link to="/login" className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors">
                <LogIn size={18} /> Entrar no sistema
              </Link>
              <Link to="/register" className="flex items-center justify-center gap-2 px-8 py-3.5 border-2 border-primary text-primary rounded-2xl font-bold text-sm hover:bg-primary/5 transition-colors">
                Criar conta
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <div className="bg-gray-900 rounded-3xl p-8 text-white">
          <h2 className="font-heading font-bold text-xl mb-2">Pronto para começar?</h2>
          <p className="text-gray-400 text-sm mb-5">Acesse o painel administrativo e configure seu catálogo agora.</p>
          <Link to={ctaTarget} className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-colors">
            {ctaLabel} <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}