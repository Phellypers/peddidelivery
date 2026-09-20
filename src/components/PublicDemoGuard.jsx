import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isPublicDemo, startPublicDemo } from '@/lib/presentationDemo';

const PUBLIC_DEMO_ROUTES = ['/loja', '/item/', '/buscar', '/checkout'];

export default function PublicDemoGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const requested = new URLSearchParams(location.search).get('demo') === '1';

  useEffect(() => {
    if (requested) startPublicDemo();
    if (!requested && !isPublicDemo()) return;

    localStorage.removeItem('peddi_access_token');
    localStorage.removeItem('peddi_refresh_token');

    const allowed = PUBLIC_DEMO_ROUTES.some(path => path.endsWith('/')
      ? location.pathname.startsWith(path)
      : location.pathname === path || location.pathname.startsWith(`${path}/`));
    if (!allowed) {
      navigate('/loja?demo=1', { replace: true });
      return;
    }
    if (!requested) {
      const params = new URLSearchParams(location.search);
      params.set('demo', '1');
      navigate(`${location.pathname}?${params}${location.hash}`, { replace: true });
    }
  }, [location.pathname, location.search, location.hash, navigate, requested]);

  return null;
}
