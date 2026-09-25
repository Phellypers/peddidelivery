import React from 'react';
import { Home, Search, ShoppingCart, ClipboardList, User } from 'lucide-react';
import './Storefront.css';
import { useCart } from '@/lib/CartContext';
import { Link, useLocation } from 'react-router-dom';
import { isPublicDemo } from '@/lib/presentationDemo';
import { useAuth } from '@/lib/AuthContext';
import { storefrontStoreRef, withStore } from '@/lib/storefrontTenant';

export default function BottomNav() {
  const { totalItems, setIsOpen } = useCart();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const storeRef = storefrontStoreRef(location.search);
  const publicDemo = isPublicDemo();
  const openDemo = area => () => window.dispatchEvent(new CustomEvent('peddi-demo-open', { detail: area }));

  const navItems = [
    { icon: Home, label: 'Início', path: withStore('/loja', storeRef) },
    { icon: Search, label: 'Buscar', path: withStore('/buscar', storeRef) },
    { icon: ShoppingCart, label: 'Carrinho', action: () => setIsOpen(true), badge: totalItems, cart: true },
    { icon: ClipboardList, label: 'Pedidos', ...(publicDemo ? { action: openDemo('orders') } : { path: withStore('/meus-pedidos', storeRef) }) },
    { icon: User, label: 'Perfil', ...(publicDemo ? { action: openDemo('profile') } : isAuthenticated ? { path: withStore('/perfil', storeRef) } : { path: `/login?store=${encodeURIComponent(storeRef)}&returnTo=${encodeURIComponent(withStore('/perfil', storeRef))}` }) },
  ];

  return (
    <nav aria-label="Navegação do cliente" className="peddi-client-nav fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map(item => {
          const isActive = item.path && location.pathname === item.path.split('?')[0];
          const Icon = item.icon;
          const Wrapper = item.action ? 'button' : Link;
          const props = item.action ? { onClick: item.action } : {
            to: item.path,
            ...(item.path?.startsWith('/buscar') ? { state: { from: `${location.pathname}${location.search}` } } : {}),
          };

          return (
            <Wrapper
              key={item.label}
              {...props}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={`peddi-client-nav-item flex items-center justify-center relative ${isActive ? 'active' : ''} ${item.cart ? 'cart' : ''}`}
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
