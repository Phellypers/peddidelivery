import React, { useState } from 'react';
import { Loader2, FileBarChart } from 'lucide-react';

function calc(orders, products, accounts, taxRate) {
  const productCostMap = {};
  products.forEach(p => { productCostMap[p.id] = p.cost || 0; });

  const faturamento = orders.reduce((s, o) => s + (o.total || 0), 0);
  const cmv = orders.reduce((s, o) =>
    s + (o.items || []).reduce((si, i) => si + (productCostMap[i.product_id] || 0) * (i.quantity || 0), 0), 0);
  const despesas = accounts.filter(a => a.type === 'payable').reduce((s, a) => s + (a.amount || 0), 0);
  const impostos = faturamento * (taxRate / 100);
  const lucroBruto = faturamento - impostos - cmv;
  const lucroLiquido = lucroBruto - despesas;
  return { faturamento, impostos, cmv, lucroBruto, despesas, lucroLiquido };
}

function Row({ label, value, type, bold, indent }) {
  const colors = { positive: 'text-green-600', negative: 'text-red-600', neutral: 'text-foreground', highlight: 'text-primary' };
  return (
    <div className={`flex justify-between items-center py-2.5 ${bold ? 'border-t border-border pt-3 font-heading font-bold' : ''} ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold' : 'text-muted-foreground'}`}>{label}</span>
      <span className={`font-bold ${colors[type] || colors.neutral}`}>{value < 0 ? '- ' : ''}R$ {Math.abs(value).toFixed(2)}</span>
    </div>
  );
}

function DeltaBadge({ current, previous }) {
  if (previous === 0 && current === 0) return null;
  const diff = current - previous;
  const pct = previous !== 0 ? (diff / Math.abs(previous)) * 100 : (current !== 0 ? 100 : 0);
  const isUp = diff >= 0;
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {isUp ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function DRE({ orders, products, accounts, loading, prevOrders, prevAccounts }) {
  const [taxRate, setTaxRate] = useState(0);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const cur = calc(orders, products, accounts, taxRate);
  const prev = calc(prevOrders, products, prevAccounts, taxRate);

  const fmt = (v) => `R$ ${v.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Tax rate config */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 flex items-center gap-3">
        <FileBarChart size={18} className="text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Alíquota de impostos</p>
          <p className="text-xs text-muted-foreground">Percentual aplicado sobre o faturamento bruto</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number" step="0.1" min="0" max="100"
            value={taxRate}
            onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
            className="w-20 px-3 py-2 bg-muted rounded-xl text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <span className="text-sm font-bold text-muted-foreground">%</span>
        </div>
      </div>

      {/* DRE Atual */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="font-heading font-bold text-base mb-1">Demonstração do Resultado</h3>
        <p className="text-xs text-muted-foreground mb-4">Período selecionado</p>

        <Row label="(+) Faturamento Bruto" value={cur.faturamento} type="positive" bold />
        <Row label="(-) Impostos" value={-cur.impostos} type="negative" indent />
        <Row label="(-) CMV (Custo das Mercadorias Vendidas)" value={-cur.cmv} type="negative" indent />
        <Row label="(=) Lucro Bruto" value={cur.lucroBruto} type="highlight" bold />
        <Row label="(-) Despesas Operacionais" value={-cur.despesas} type="negative" indent />
        <Row label="(=) Lucro Líquido" value={cur.lucroLiquido} type={cur.lucroLiquido >= 0 ? 'positive' : 'negative'} bold />

        {cur.faturamento > 0 && (
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Margem Líquida</span>
            <span className={`font-bold ${cur.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {((cur.lucroLiquido / cur.faturamento) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Comparação com período anterior */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <h3 className="font-heading font-bold text-base mb-4">Comparação com período anterior</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                <th className="text-left py-2 font-semibold">Indicador</th>
                <th className="text-right py-2 font-semibold">Atual</th>
                <th className="text-right py-2 font-semibold">Anterior</th>
                <th className="text-right py-2 font-semibold">Var.</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'Faturamento Bruto', cur: cur.faturamento, prev: prev.faturamento },
                { label: 'Impostos', cur: cur.impostos, prev: prev.impostos },
                { label: 'CMV', cur: cur.cmv, prev: prev.cmv },
                { label: 'Lucro Bruto', cur: cur.lucroBruto, prev: prev.lucroBruto },
                { label: 'Despesas', cur: cur.despesas, prev: prev.despesas },
                { label: 'Lucro Líquido', cur: cur.lucroLiquido, prev: prev.lucroLiquido },
              ].map(row => (
                <tr key={row.label} className="border-b border-border/30 last:border-0">
                  <td className="py-2.5 text-muted-foreground">{row.label}</td>
                  <td className="py-2.5 text-right font-medium">{fmt(row.cur)}</td>
                  <td className="py-2.5 text-right text-muted-foreground">{fmt(row.prev)}</td>
                  <td className="py-2.5 text-right"><DeltaBadge current={row.cur} previous={row.prev} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}