import React from 'react';
import { Loader2, TrendingUp, TrendingDown, Wallet, Package, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function CashBalance({ orders, products, accounts, loading }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const productCostMap = {};
  products.forEach(p => { productCostMap[p.id] = p.cost || 0; });

  const vendas = orders.reduce((s, o) => s + (o.total || 0), 0);
  const cmv = orders.reduce((s, o) =>
    s + (o.items || []).reduce((si, i) => si + (productCostMap[i.product_id] || 0) * (i.quantity || 0), 0), 0);
  const despesas = accounts.filter(a => a.type === 'payable').reduce((s, a) => s + (a.amount || 0), 0);
  const receitas = accounts.filter(a => a.type === 'receivable').reduce((s, a) => s + (a.amount || 0), 0);

  const entradas = vendas + receitas;
  const saidas = cmv + despesas;
  const saldo = entradas - saidas;

  return (
    <div className="space-y-6">
      {/* Saldo principal */}
      <div className={`rounded-2xl p-6 ${saldo >= 0 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white`}>
        <div className="flex items-center gap-2 mb-2"><Wallet size={20} /><span className="text-sm font-medium opacity-90">Saldo de Caixa</span></div>
        <p className="text-4xl font-heading font-bold">R$ {saldo.toFixed(2)}</p>
        <p className="text-sm opacity-80 mt-1">{orders.length} venda(s) no período</p>
      </div>

      {/* Entradas */}
      <div>
        <h3 className="font-heading font-semibold text-sm text-green-600 mb-3 flex items-center gap-1"><TrendingUp size={16} /> Entradas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-1"><ArrowUpCircle size={16} className="text-green-500" /><span className="text-xs text-muted-foreground">Vendas</span></div>
            <p className="font-heading font-bold text-lg text-green-600">R$ {vendas.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{orders.length} pedido(s) entregue(s)</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-1"><ArrowUpCircle size={16} className="text-green-500" /><span className="text-xs text-muted-foreground">Outras receitas</span></div>
            <p className="font-heading font-bold text-lg text-green-600">R$ {receitas.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{accounts.filter(a => a.type === 'receivable').length} conta(s) recebida(s)</p>
          </div>
        </div>
      </div>

      {/* Saídas */}
      <div>
        <h3 className="font-heading font-semibold text-sm text-red-600 mb-3 flex items-center gap-1"><TrendingDown size={16} /> Saídas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-red-500" /><span className="text-xs text-muted-foreground">Custo de produtos (CMV)</span></div>
            <p className="font-heading font-bold text-lg text-red-600">R$ {cmv.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{vendas > 0 ? `${((cmv / vendas) * 100).toFixed(1)}% das vendas` : '—'}</p>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-1"><ArrowDownCircle size={16} className="text-red-500" /><span className="text-xs text-muted-foreground">Despesas</span></div>
            <p className="font-heading font-bold text-lg text-red-600">R$ {despesas.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{accounts.filter(a => a.type === 'payable').length} conta(s) paga(s)</p>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Total de entradas</span><span className="font-bold text-green-600">R$ {entradas.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Total de saídas</span><span className="font-bold text-red-600">R$ {saidas.toFixed(2)}</span></div>
        <div className="flex justify-between font-heading font-bold text-lg pt-2 border-t border-border">
          <span>Saldo</span>
          <span className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>R$ {saldo.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}