import React from 'react';
import { Home, Search, ShoppingCart, ClipboardList, User } from 'lucide-react';
import './Storefront.css';
import { useCart } from '@/lib/CartContext';
import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const { totalItems, setIsOpen } = useCart();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Início', path: '/loja' },
    { icon: Search, label: 'Buscar', path: '/buscar' },
    { icon: ShoppingCart, label: 'Carrinho', action: () => setIsOpen(true), badge: totalItems },
    { icon: ClipboardList, label: 'Pedidos', path: '/meus-pedidos' },
    { icon: User, label: 'Perfil', path: '/perfil' },
  ];

  return (
    <nav aria-label="Navegação do cliente" className="peddi-client-nav fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map(item => {
          const isActive = item.path && location.pathname === item.path;
          const Icon = item.icon;
          const Wrapper = item.action ? 'button' : Link;
          const props = item.action ? { onClick: item.action } : { to: item.path };

          return (
            <Wrapper
              key={item.label}
              {...props}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`peddi-client-nav-item flex items-center justify-center relative ${isActive ? 'active' : ''} ${item.action ? 'cart' : ''}`}
            >
              <div className="relative">
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-gray-900' : 'text-gray-400'}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="peddi-client-nav-label">{item.label}</span>
            </Wrapper>
          );
        })}
      </div>
    </nav>
  );
}
