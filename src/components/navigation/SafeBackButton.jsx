import React, { useEffect } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { APP_ROUTE_CURRENT_KEY, APP_ROUTE_PREVIOUS_KEY, isSafeAppRoute, isSafeBackDestination } from '@/lib/safeNavigation';

export function AppNavigationTracker() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    const route = `${location.pathname}${location.search}${location.hash}`;
    if (!isSafeAppRoute(route)) return;
    const current = sessionStorage.getItem(APP_ROUTE_CURRENT_KEY);
    if (navigationType !== 'REPLACE' && current && current !== route && isSafeAppRoute(current)) sessionStorage.setItem(APP_ROUTE_PREVIOUS_KEY, current);
    sessionStorage.setItem(APP_ROUTE_CURRENT_KEY, route);
  }, [location.pathname, location.search, location.hash, navigationType]);

  return null;
}

export function useSafeBack(fallback = '/loja') {
  const location = useLocation();
  const navigate = useNavigate();

  return () => {
    const current = `${location.pathname}${location.search}${location.hash}`;
    const stateOrigin = location.state?.from;
    const trackedOrigin = sessionStorage.getItem(APP_ROUTE_PREVIOUS_KEY);
    const destination = [stateOrigin, trackedOrigin, fallback]
      .find(route => isSafeBackDestination(route, current)) || (isSafeAppRoute(fallback) ? fallback : '/loja');
    const returnTo = location.state?.returnTo;
    const state = isSafeBackDestination(returnTo, destination) ? { from: returnTo } : undefined;
    navigate(destination, { replace: true, state });
  };
}

export default function SafeBackButton({ fallback = '/loja', children, ...props }) {
  const goBack = useSafeBack(fallback);
  return <button type="button" aria-label="Voltar" onClick={goBack} {...props}>{children}</button>;
}
