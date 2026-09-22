import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff, Store } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { peddiApi, saveSession } from '@/services/api/peddiApi';
import { storefrontStoreRef } from '@/lib/storefrontTenant';
import { getStoreTheme } from '@/lib/storeTheme';

export default function Login({ managerOnly = false, courierOnly = false }) {
  const location = useLocation();
  const storeRef = managerOnly || courierOnly ? '' : storefrontStoreRef(location.search);
  const registerParams = new URLSearchParams();
  if (storeRef) registerParams.set('store', storeRef);
  const requestedReturn = new URLSearchParams(location.search).get('returnTo');
  if (requestedReturn) registerParams.set('returnTo', requestedReturn);
  const registerPath = `/register${registerParams.size ? `?${registerParams}` : ''}`;
  const [store, setStore] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (managerOnly || courierOnly || !storeRef) return;
    let active = true;
    peddiApi.stores().then(({ stores = [] }) => {
      const selected = stores.find(item => item.id === storeRef || item.slug === storeRef);
      if (active) setStore(selected || null);
    }).catch(() => { if (active) setStore(null); });
    return () => { active = false; };
  }, [managerOnly, courierOnly, storeRef]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let destination = safeReturnTo();
      if (peddiApi.isConfigured) {
        if (!managerOnly && !courierOnly && !store?.id) throw new Error('Acesse o login pelo cardápio da loja para continuar.');
        const result = await peddiApi.login(email, password, managerOnly ? 'manager' : courierOnly ? 'courier' : 'customer', store?.id);
        saveSession(result);
        if (courierOnly || result.user.role === 'courier') destination = '/entregador';
        if (managerOnly) destination = destination === '/admin' || destination.startsWith('/admin/') ? destination : '/admin';
        else if (result.user.role !== 'courier' && !new URLSearchParams(window.location.search).has('returnTo')) destination = '/loja';
      } else {
        await base44.auth.loginViaEmailPassword(email, password);
      }
      window.location.href = destination;
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  return (
    <AuthLayout
      icon={managerOnly ? LogIn : courierOnly ? LogIn : Store}
      logoUrl={!managerOnly && !courierOnly ? store?.logo_url : ''}
      brandName={!managerOnly && !courierOnly ? store?.name : courierOnly ? 'PEDDI Entregadores' : ''}
      theme={!managerOnly && !courierOnly && store ? getStoreTheme(store) : undefined}
      title={managerOnly ? 'Acesso do gestor' : courierOnly ? 'Acesso do entregador' : 'Entre na sua conta'}
      subtitle={managerOnly ? 'Entre com sua conta administrativa PEDDI.' : courierOnly ? 'Entre com o cadastro aprovado pela loja.' : store ? `Acesse o cardápio da ${store.name}` : 'Abra este acesso pelo cardápio da loja.'}
      footer={
        managerOnly ? <Link to="/" className="text-primary font-medium">Voltar ao site da PEDDI</Link> : courierOnly ? <Link to="/entregador" className="text-primary font-medium">Voltar para entregadores</Link> : <>
          Don't have an account?{" "}
          <Link to={registerPath} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {!managerOnly && !courierOnly && <><Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />
        Continue with Google
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>
      </>}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{managerOnly || courierOnly ? 'Senha' : 'Password'}</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              {managerOnly ? 'Esqueci minha senha' : 'Forgot password?'}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-12 h-12"
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-controls="password"
              aria-pressed={showPassword}
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword(current => !current)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {managerOnly || courierOnly ? 'Entrando...' : 'Logging in...'}
            </>
          ) : (
            managerOnly ? 'Entrar no painel' : courierOnly ? 'Entrar como entregador' : "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
