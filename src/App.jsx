import { ThemeProvider } from 'next-themes';
import CourierNavigationGuard from '@/components/deliverer/CourierNavigationGuard';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from '@/pages/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from '@/components/ScrollToTop';
import { CartProvider } from '@/lib/CartContext';
import { WishlistProvider } from '@/lib/WishlistContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Landing from '@/pages/Landing';
import Home from '@/pages/Home';
import ManagerLanding from '@/pages/ManagerLanding';
import DelivererMap from '@/pages/admin/DelivererMap';
import DelivererApp from '@/pages/DelivererApp';
import DelivererRegister from '@/pages/DelivererRegister';
import ProductDetail from '@/pages/ProductDetail';
import Checkout from '@/pages/Checkout';
import Favorites from '@/pages/Favorites';
import SearchPage from '@/pages/Search';
import CustomerProfile from '@/pages/CustomerProfile';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/pages/admin/Dashboard';
import Catalog from '@/pages/admin/Catalog';
import Estoque from '@/pages/admin/Estoque';
import Orders from '@/pages/admin/Orders';
import Categories from '@/pages/admin/Categories';
import Promotions from '@/pages/admin/Promotions';
import StoreSettings from '@/pages/admin/StoreSettings';
import Deliverers from '@/pages/admin/Deliverers';
import Customers from '@/pages/admin/Customers';
import Marketing from '@/pages/admin/Marketing';
import Banners from '@/pages/admin/Banners';
import PDV from '@/pages/admin/PDV';
import Financeiro from '@/pages/admin/Financeiro';
import Comments from '@/pages/admin/Comments';
import ChatAdmin from '@/pages/admin/Chat';
import MyPeddi from '@/pages/admin/MyPeddi';
import NotificationSounds from '@/components/NotificationSounds';
import Tables from '@/pages/admin/Tables';
import MyOrders from '@/pages/MyOrders';
import MyData from '@/pages/MyData';
import OrderTracking from '@/pages/OrderTracking';
import OAuthConsent from '@/pages/OAuthConsent';
import MobilePreview from '@/components/MobilePreview';
import DemoNotice from '@/components/DemoNotice';
import { AppNavigationTracker } from '@/components/navigation/SafeBackButton';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
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
      <Route path="/gestor" element={<ManagerLanding />} />
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
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const app = (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <WishlistProvider>
            <Router>
              <AppNavigationTracker />
              <NotificationSounds />
              <ScrollToTop />
              <DemoNotice />
              <CourierNavigationGuard><Routes>
                {/* Auth routes always available, outside AuthenticatedApp */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/entregador/cadastro" element={<DelivererRegister />} />
                <Route path="/entregador" element={<DelivererApp />} />
                <Route path="/oauth/consent" element={<OAuthConsent />} />
                {/* Public storefront routes — accessible without login */}
                <Route path="/loja" element={<Home />} />
                <Route path="/loja/campanha/:bannerId" element={<Home />} />
                <Route path="/item/:id" element={<ProductDetail />} />
                <Route path="/buscar" element={<SearchPage />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/rastrear/:id" element={<OrderTracking />} />
                {/* All other routes go through AuthenticatedApp */}
                <Route path="*" element={<AuthenticatedApp />} />
              </Routes></CourierNavigationGuard>
            </Router>
          </WishlistProvider>
        </CartProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
    </ThemeProvider>
  );

  return <MobilePreview>{app}</MobilePreview>;
}

export default App
