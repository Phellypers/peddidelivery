import React from 'react';
import { Loader2, Package, Percent, AlertTriangle, TrendingUp } from 'lucide-react';

export default function CMV({ orders, products, loading }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const faturamento = orders.reduce((s, o) => s + (o.total || 0), 0);

  // Per-product aggregation
  const productStats = {};
  orders.forEach(o => {
    (o.items || []).forEach(item => {
      const p = productMap[item.product_id];
      const cost = p?.cost || 0;
      const revenue = (item.unit_price || 0) * (item.quantity || 0);
      const totalCost = cost * (item.quantity || 0);
      const key = item.product_id || `_${item.product_name}`;
      if (!productStats[key]) {
        productStats[key] = {
          name: item.product_name || p?.name || '—',
          price: p?.promo_price || p?.price || item.unit_price || 0,
          cost,
          qtySold: 0,
          totalRevenue: 0,
          totalCost: 0,
        };
      }
      productStats[key].qtySold += item.quantity || 0;
      productStats[key].totalRevenue += revenue;
      productStats[key].totalCost += totalCost;
    });
  });

  const cmvTotal = Object.values(productStats).reduce((s, p) => s + p.totalCost, 0);
  const cmvPercent = faturamento > 0 ? (cmvTotal / faturamento) * 100 : 0;
  const margemBruta = faturamento - cmvTotal;
  const margemBrutaPct = faturamento > 0 ? (margemBruta / faturamento) * 100 : 0;

  const productList = Object.values(productStats)
    .map(p => ({
      ...p,
      profit: p.totalRevenue - p.totalCost,
      margin: p.totalRevenue > 0 ? ((p.totalRevenue - p.totalCost) / p.totalRevenue) * 100 : 0,
      unitMargin: p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0,
    }))
    .sort((a, b) => a.margin - b.margin);

  const lowMargin = productList.filter(p => p.margin < 30);

  return (
    <div className="space-y-6">
      {/* CMV Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2"><Package size={18} /><span className="text-xs font-medium opacity-90 uppercase">CMV Total</span></div>
          <p className="text-2xl font-heading font-bold">R$ {cmvTotal.toFixed(2)}</p>
          <p className="text-xs opacity-80 mt-1">{orders.length} venda(s) no período</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-2"><Percent size={18} className="text-orange-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">% do CMV</span></div>
          <p className="text-2xl font-heading font-bold text-orange-600">{cmvPercent.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">sobre faturamento</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-green-500" /><span className="text-xs font-semibold text-muted-foreground uppercase">Margem Bruta</span></div>
          <p className="text-2xl font-heading font-bold text-green-600">{margemBrutaPct.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">R$ {margemBruta.toFixed(2)}</p>
        </div>
      </div>

      {/* Alert: low margin products */}
      {lowMargin.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{lowMargin.length} produto(s) com margem abaixo de 30%</p>
            <p className="text-xs text-amber-700 mt-0.5">Revise o preço de venda ou o custo para melhorar a rentabilidade.</p>
          </div>
        </div>
      )}

      {/* Per-product table */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-heading font-bold text-sm">Margem por produto</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Ordenado pela menor margem</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground uppercase">
                <th className="text-left py-2.5 px-4 font-semibold">Produto</th>
                <th className="text-right py-2.5 px-2 font-semibold">Preço</th>
                <th className="text-right py-2.5 px-2 font-semibold">Custo</th>
                <th className="text-right py-2.5 px-2 font-semibold">Qtd vendida</th>
                <th className="text-right py-2.5 px-2 font-semibold">Receita</th>
                <th className="text-right py-2.5 px-2 font-semibold">Custo total</th>
                <th className="text-right py-2.5 px-2 font-semibold">Lucro</th>
                <th className="text-right py-2.5 px-4 font-semibold">Margem</th>
              </tr>
            </thead>
            <tbody>
              {productList.map((p, i) => (
                <tr key={i} className="border-t border-border/30 hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-medium text-foreground">{p.name}</td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground">R$ {p.price.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right text-muted-foreground">R$ {p.cost.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right">{p.qtySold}</td>
                  <td className="py-2.5 px-2 text-right">R$ {p.totalRevenue.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right text-red-500">R$ {p.totalCost.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-right font-medium text-green-600">R$ {p.profit.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      p.margin >= 50 ? 'bg-green-100 text-green-700'
                      : p.margin >= 30 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {p.margin.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
              {productList.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma venda no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}