import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/components/AuthLayout';

export default function OAuthConsent() {
  return (
    <AuthLayout icon={ShieldCheck} title="Integrações externas">
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>A integração OAuth está reservada para uma futura conexão com parceiros. O app PEDDI funciona de forma independente com a API própria.</p>
        <Button onClick={() => { window.location.href = '/'; }}>Voltar ao início</Button>
      </div>
    </AuthLayout>
  );
}
