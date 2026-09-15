import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Tag, FolderOpen, Settings, Menu, X, ChevronLeft, Bike, Users, Megaphone, Image, Monitor, Wallet, UtensilsCrossed, MapPin, MessageSquare, MessageCircle, Boxes } from 'lucide-react';
import NewOrderNotifier from '@/components/admin/NewOrderNotifier';
import ChatBadge from '@/components/admin/ChatBadge';
import ManagerOnboarding from '@/components/admin/ManagerOnboarding';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Package, label: 'Produtos', path: '/admin/catalogo' },
  { icon: Boxes, label: 'Estoque', path: '/admin/estoque' },
  { icon: FolderOpen, label: 'Categorias', path: '/admin/categorias' },
  { icon: ShoppingCart, label: 'Pedidos', path: '/admin/pedidos' },
  { icon: Monitor, label: 'PDV', path: '/admin/pdv' },
  { icon: UtensilsCrossed, label: 'Mesas', path: '/admin/mesas' },
  { icon: Tag, label: 'Promoções', path: '/admin/promocoes' },
  { icon: Image, label: 'Banners', path: '/admin/banners' },
  { icon: Megaphone, label: 'Marketing', path: '/admin/marketing' },
  { icon: Users, label: 'Clientes', path: '/admin/clientes' },
  { icon: MessageSquare, label: 'Comentários', path: '/admin/comentarios' },
  { icon: MessageCircle, label: 'Chat', path: '/admin/chat' },
  { icon: Wallet, label: 'Financeiro', path: '/admin/financeiro' },
  { icon: Bike, label: 'Entregadores', path: '/admin/entregadores' },
  { icon: MapPin, label: 'Mapa', path: '/admin/mapa-entregadores' },
  { icon: Settings, label: 'Configurações', path: '/admin/configuracoes' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="peddi-admin min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 bottom-0 flex flex-col w-64 max-w-[85vw] bg-card border-r border-border z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-foreground">PEDDI</span>
            </div>
            <button aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} className="lg:hidden p-3 rounded-xl hover:bg-muted">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav aria-label="Navegação do gestor" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                data-manager-tour={item.path === '/admin' ? 'dashboard' : item.path === '/admin/pedidos' ? 'orders' : item.path === '/admin/catalogo' ? 'products' : item.path === '/admin/marketing' ? 'marketing' : item.path === '/admin/financeiro' ? 'finance' : undefined}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={18} />
                {item.label}
                {item.path === '/admin/chat' && <ChatBadge />}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3 pb-safe">
          <Link to="/loja" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft size={18} />
            Ver vitrine
          </Link>
        </div>
      </aside>

      <div className="min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border h-14 flex items-center px-4 lg:px-6">
          <button aria-label="Abrir menu" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} className="lg:hidden p-3 -ml-2 mr-2 rounded-xl hover:bg-muted">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <Link to="/loja" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft size={14} /> Ver vitrine
          </Link>
        </header>
        <main className="min-w-0 p-4 lg:p-6 max-w-full">
          <Outlet />
        </main>
      </div>
      <NewOrderNotifier />
      <ManagerOnboarding onTourVisibilityChange={setSidebarOpen} />
    </div>
  );
}
