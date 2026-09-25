import { Suspense } from 'react';
import {
  PageNotFound, Login, Register, ForgotPassword, ResetPassword, Landing, Home, DelivererMap, DelivererApp, DelivererRegister, ProductDetail, Checkout, Favorites, SearchPage, CustomerProfile, AdminLayout, Dashboard, Catalog, Estoque, Orders, Categories, Promotions, StoreSettings, Deliverers, Customers, Marketing, Banners, PDV, Financeiro, Comments, ChatAdmin, MyPeddi, Tables, MyOrders, MyData, OrderTracking, OAuthConsent, HelpCenter
} from '@/routes/pages';
import PageLoading from '@/components/PageLoading';
import { ThemeProvider } from 'next-themes';
import CourierNavigationGuard from '@/components/deliverer/CourierNavigationGuard';
import { Toaster } from "@/components/ui/toaster"
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from '@/components/ScrollToTop';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';
import NotificationSounds from '@/components/NotificationSounds';
import MobilePreview from '@/components/MobilePreview';
import DemoNotice from '@/components/DemoNotice';
import { AppNavigationTracker } from '@/components/navigation/SafeBackButton';
import PublicDemoGuard from '@/components/PublicDemoGuard';

const AuthenticatedApp = () => {
  const { user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location=useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <PageLoading />
    );
  }

  if (location.pathname==='/admin' || location.pathname.startsWith('/admin/')) {
    if (user?.demoMode === 'presentation') return <Navigate replace to="/loja?demo=1" />;
    if (!isAuthenticated || !['manager','peddi_admin'].includes(user?.role)) return <Navigate replace to={`/gestor/login?returnTo=${encodeURIComponent(location.pathname+location.search)}`}/>;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/gestor" element={<Navigate replace to="/gestor/login" />} />
      <Route path="/favoritos" element={<Favorites />} />
      <Route path="/perfil" element={<CustomerProfile />} />
      <Route path="/meus-pedidos" element={<MyOrders />} />
      <Route path="/meus-dados" element={<MyData />} />
      <Route path="/entregador" element={<DelivererApp />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="catalogo" element={<Catalog />} />
        <Route path="estoque" element={<Estoque />} />
        <Route path="categorias" element={<Categories />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="promocoes" element={<Promotions />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="marketing" element={<Marketing />} />
        <Route path="banners" element={<Banners />} />
        <Route path="pdv" element={<PDV />} />
        <Route path="mesas" element={<Tables />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="comentarios" element={<Comments />} />
        <Route path="chat" element={<ChatAdmin />} />
        <Route path="minha-peddi" element={<MyPeddi />} />
        <Route path="entregadores" element={<Deliverers />} />
        <Route path="mapa-entregadores" element={<DelivererMap />} />
        <Route path="configuracoes" element={<StoreSettings />} />
        <Route path="ajuda" element={<HelpCenter />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const app = (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
    <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <AppNavigationTracker />
              <PublicDemoGuard />
              <NotificationSounds />
              <ScrollToTop />
              <DemoNotice />
              <CourierNavigationGuard><Suspense fallback={<PageLoading />}><Routes>
                {/* Auth routes always available, outside AuthenticatedApp */}
                <Route path="/login" element={<Login />} />
                <Route path="/landing-preview" element={<Navigate replace to="/" />} />
                <Route path="/gestor/login" element={<Login managerOnly />} />
                <Route path="/entregador/login" element={<Login courierOnly />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/entregador/cadastro" element={<DelivererRegister />} />
                <Route path="/entregador" element={<DelivererApp />} />
                <Route path="/oauth/consent" element={<OAuthConsent />} />
                {/* Public storefront routes — accessible without login */}
                <Route path="/loja" element={<Home />} />
                <Route path="/loja/campanha/:bannerId" element={<Home />} />
                <Route path="/loja/promocao/:promotionId" element={<Home />} />
                <Route path="/item/:id" element={<ProductDetail />} />
                <Route path="/buscar" element={<SearchPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/rastrear/:id" element={<OrderTracking />} />
                {/* All other routes go through AuthenticatedApp */}
                <Route path="*" element={<AuthenticatedApp />} />
              </Routes></Suspense></CourierNavigationGuard>
            </Router>
          </WishlistProvider>
        </CartProvider>
        <Toaster />
    </AuthProvider>
    </ThemeProvider>
  );

  return <MobilePreview>{app}</MobilePreview>;
}

export default App
