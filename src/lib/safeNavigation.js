export const APP_ROUTE_CURRENT_KEY = 'peddi_current_app_route';
export const APP_ROUTE_PREVIOUS_KEY = 'peddi_previous_app_route';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/oauth/consent'];

export function isSafeAppRoute(route) {
  if (!route || typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) return false;
  const pathname = route.split(/[?#]/)[0];
  return pathname !== '/' && !AUTH_PATHS.some(authPath => pathname === authPath || pathname.startsWith(`${authPath}/`));
}

export function getAppRouteArea(route) {
  const pathname = String(route || '').split(/[?#]/)[0];
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin';
  if (pathname === '/entregador' || pathname.startsWith('/entregador/')) return 'deliverer';
  if (pathname === '/gestor') return 'manager';
  return isSafeAppRoute(pathname) ? 'storefront' : null;
}

export function isSafeBackDestination(destination, currentRoute) {
  return isSafeAppRoute(destination)
    && destination !== currentRoute
    && getAppRouteArea(destination) === getAppRouteArea(currentRoute);
}
