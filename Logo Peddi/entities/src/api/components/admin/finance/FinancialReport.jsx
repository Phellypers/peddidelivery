import React from 'react';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function FinancialReport({ orders, products, accounts, loading }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const productCostMap = {};
  products.forEach(p => { productCostMap[p.id] = p.cost || 0; });

  const faturamento = orders.reduce((s, o) => s + (o.total || 0), 0);
  const cmv = orders.reduce((s, o) =>
    s + (o.items || []).reduce((si, i) => si + (productCostMap[i.product_id] || 0) * (i.quantity || 0), 0), 0);
  const despesas = accounts.filter(a => a.type === 'payable').reduce((s, a) => s + (a.amount || 0), 0);
  const receitas = accounts.filter(a => a.type === 'receivable').reduce((s, a) => s + (a.amount || 0), 0);

  const lucroBruto = faturamento - cmv;
  const lucroLiquido = lucroBruto + receitas - despesas;
  const margem = faturamento > 0 ? (lucroLiquido / faturamento) * 100 : 0;
  const margemBruta = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;

  const chartData = [
    { name: 'Faturamento', value: faturamento, fill: '#22C55E' },
    { name: 'CMV', value: cmv, fill: '#EF4444' },
    { name: 'Despesas', value: despesas, fill: '#F97316' },
    { name: 'Receitas', value: receitas, fill: '#3B82F6' },
    { name: 'Lucro Líq.', value: lucroLiquido, fill: lucroLiquido >= 0 ? '#16A34A' : '#DC2626' },
  ];

  const rows = [
    { label: '(+) Faturamento (Vendas)', value: faturamento, type: 'positive' },
    { label: '(-) CMV (Custo de Produtos)', value: -cmv, type: 'negative' },
    { label: '(=) Lucro Bruto', value: lucroBruto, type: 'highlight', bold: true },
    { label: '(+) Outras Receitas', value: receitas, type: 'positive' },
    { label: '(-) Despesas', value: -despesas, type: 'negative' },
    { label: '(=) Lucro Líquido', value: lucroLiquido, type: lucroLiquido >= 0 ? 'positive' : 'negative', bold: true },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className="text-green-500" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Faturamento</span></div>
          <p className="font-heading font-bold text-lg text-green-600">R$ {faturamento.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{orders.length} venda(s)</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-red-500" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">CMV</span></div>
          <p className="font-heading font-bold text-lg text-red-600">R$ {cmv.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{faturamento > 0 ? `${((cmv/faturamento)*100).toFixed(1)}%` : '—'}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-primary" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Lucro Líquido</span></div>
          <p className={`font-heading font-bold text-lg ${lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>R$ {lucroLiquido.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{margem.toFixed(1)}% margem</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><Percent size={16} className="text-orange-500" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Margem Bruta</span></div>
          <p className="font-heading font-bold text-lg text-orange-600">{margemBruta.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">R$ {lucroBruto.toFixed(2)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="font-heading font-bold text-sm">Consolidado Financeiro</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0)}`} />
            <Tooltip formatter={v => `R$ ${v.toFixed(2)}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown table */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="font-heading font-bold text-sm mb-3">Detalhamento</h3>
        <div className="space-y-0">
          {rows.map((r, i) => (
            <div key={i} className={`flex justify-between items-center py-2.5 ${r.bold ? 'border-t border-border pt-3 font-heading font-bold' : ''}`}>
              <span className={`text-sm ${r.bold ? 'font-bold' : 'text-muted-foreground'}`}>{r.label}</span>
              <span className={`font-bold ${r.type === 'positive' ? 'text-green-600' : r.type === 'negative' ? 'text-red-600' : r.type === 'highlight' ? 'text-primary' : r.type === 'negative' ? 'text-red-600' : 'text-foreground'}`}>
                {r.value < 0 ? '- ' : ''}R$ {Math.abs(r.value).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
        {faturamento > 0 && (
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Margem Líquida</span>
            <span className={`font-bold ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margem.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}