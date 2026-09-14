import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Tag, FolderOpen, Settings, Menu, X, ChevronLeft, Store, Bike, Users, Megaphone, Image, Monitor, Wallet, UtensilsCrossed, MapPin, MessageSquare, MessageCircle, Boxes } from 'lucide-react';
import NewOrderNotifier from '@/components/admin/NewOrderNotifier';
import ChatBadge from '@/components/admin/ChatBadge';

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
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src="https://media.base44.com/images/public/6a382b7ab7116d571cddd00c/38efd2ccd_peddidelivery.png"
                alt="Peddi"
                className="h-7 object-contain"
              />
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <Icon size={18} />
                {item.label}
                {item.path === '/admin/chat' && <ChatBadge />}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-4 left-3 right-3">
          <Link to="/loja" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <ChevronLeft size={18} />
            Ver vitrine
          </Link>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border h-14 flex items-center px-4 lg:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 mr-2">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <Link to="/loja" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft size={14} /> Ver vitrine
          </Link>
        </header>
        <main className="p-3 lg:p-6 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <NewOrderNotifier />
    </div>
  );
}