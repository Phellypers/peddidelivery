import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function CourierNavigationGuard({ children }) {
  const { user }=useAuth();
  const { pathname }=useLocation();
  const allowed=['/entregador','/entregador/cadastro','/login','/forgot-password','/reset-password'];
  if (user?.role==='courier' && !allowed.includes(pathname)) return <Navigate to="/entregador" replace/>;
  return children;
}
