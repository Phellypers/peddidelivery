import React from 'react';
import { Loader2, ShoppingBag, DollarSign, TrendingUp, Clock, CreditCard, Package, Tag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const PAYMENT_LABELS = {
  pix: 'PIX', credit_card: 'Cartão Crédito', cash: 'Dinheiro',
  whatsapp: 'WhatsApp', bank_transfer: 'Transferência', to_arrange: 'A combinar',
  debit_card: 'Cartão Débito', split: 'Dividido',
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PIE_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#A855F7', '#EC4899', '#06B6D4', '#64748B', '#F97316'];

export default function SalesReport({ orders, products, categories, loading }) {
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  const totalVendas = orders.length;
  const faturamento = orders.reduce((s, o) => s + (o.total || 0), 0);
  const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0;
  const itensVendidos = orders.reduce((s, o) => s + (o.items || []).reduce((si, i) => si + (i.quantity || 0), 0), 0);

  // Por produto
  const productStats = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    const key = item.product_id || `_${item.product_name}`;
    if (!productStats[key]) productStats[key] = { name: item.product_name || '—', qty: 0, revenue: 0 };
    productStats[key].qty += item.quantity || 0;
    productStats[key].revenue += (item.unit_price || 0) * (item.quantity || 0);
  }));
  const topProducts = Object.values(productStats).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Por categoria
  const categoryStats = {};
  orders.forEach(o => (o.items || []).forEach(item => {
    const product = products.find(p => p.id === item.product_id);
    const catIds = product?.category_ids || [];
    if (catIds.length === 0) {
      const key = 'Sem categoria';
      if (!categoryStats[key]) categoryStats[key] = { name: key, revenue: 0, qty: 0 };
      categoryStats[key].revenue += (item.unit_price || 0) * (item.quantity || 0);
      categoryStats[key].qty += item.quantity || 0;
    } else {
      catIds.forEach(catId => {
        const cat = categories?.find(c => c.id === catId);
        const name = cat?.name || 'Sem categoria';
        if (!categoryStats[name]) categoryStats[name] = { name, revenue: 0, qty: 0 };
        categoryStats[name].revenue += (item.unit_price || 0) * (item.quantity || 0);
        categoryStats[name].qty += item.quantity || 0;
      });
    }
  }));
  const categoryList = Object.values(categoryStats).sort((a, b) => b.revenue - a.revenue);

  // Por forma de pagamento
  const paymentStats = {};
  orders.forEach(o => {
    const method = PAYMENT_LABELS[o.payment_method] || o.payment_method || 'Outro';
    if (!paymentStats[method]) paymentStats[method] = { name: method, count: 0, revenue: 0 };
    paymentStats[method].count++;
    paymentStats[method].revenue += o.total || 0;
  });
  const paymentList = Object.values(paymentStats).sort((a, b) => b.revenue - a.revenue);
  const paymentPieData = paymentList.map(p => ({ name: p.name, value: p.revenue }));

  // Por horário
  const hourStats = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}h`, count: 0 }));
  orders.forEach(o => { hourStats[new Date(o.created_date).getHours()].count++; });
  const activeHours = hourStats.filter(h => h.count > 0);

  // Por dia da semana
  const dayStats = DAY_NAMES.map((d, i) => ({ day: d, count: 0, revenue: 0 }));
  orders.forEach(o => {
    const dow = new Date(o.created_date).getDay();
    dayStats[dow].count++;
    dayStats[dow].revenue += o.total || 0;
  });
  const orderedDays = [dayStats[1], dayStats[2], dayStats[3], dayStats[4], dayStats[5], dayStats[6], dayStats[0]];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><ShoppingBag size={16} className="text-primary" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Vendas</span></div>
          <p className="font-heading font-bold text-lg text-foreground">{totalVendas}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">pedidos no período</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign size={16} className="text-green-500" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Faturamento</span></div>
          <p className="font-heading font-bold text-lg text-green-600">R$ {faturamento.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-blue-500" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Ticket Médio</span></div>
          <p className="font-heading font-bold text-lg text-blue-600">R$ {ticketMedio.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1"><Package size={16} className="text-orange-500" /><span className="text-[11px] text-muted-foreground uppercase font-semibold">Itens Vendidos</span></div>
          <p className="font-heading font-bold text-lg text-orange-600">{itensVendidos}</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendas por dia da semana */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4"><Clock size={16} className="text-primary" /><h3 className="font-heading font-bold text-sm">Vendas por dia da semana</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={orderedDays}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Bar dataKey="count" fill="#22C55E" radius={[6, 6, 0, 0]} name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Vendas por horário */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4"><Clock size={16} className="text-blue-500" /><h3 className="font-heading font-bold text-sm">Vendas por horário</h3></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activeHours.length > 0 ? activeHours : hourStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment methods pie + category list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {paymentPieData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-4"><CreditCard size={16} className="text-purple-500" /><h3 className="font-heading font-bold text-sm">Formas de pagamento</h3></div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={paymentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => `${e.name}`}>
                  {paymentPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `R$ ${v.toFixed(2)}`} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Vendas por categoria */}
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4"><Tag size={16} className="text-orange-500" /><h3 className="font-heading font-bold text-sm">Vendas por categoria</h3></div>
          {categoryList.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Sem dados no período</p>
          ) : (
            <div className="space-y-2">
              {categoryList.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-xl text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-medium">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">R$ {c.revenue.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{c.qty} itens</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top products */}
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-4"><Package size={16} className="text-primary" /><h3 className="font-heading font-bold text-sm">Top produtos vendidos</h3></div>
        {topProducts.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Sem vendas no período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="text-left py-2 font-semibold">#</th>
                  <th className="text-left py-2 font-semibold">Produto</th>
                  <th className="text-right py-2 font-semibold">Qtd</th>
                  <th className="text-right py-2 font-semibold">Receita</th>
                  <th className="text-right py-2 font-semibold">% Fat.</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    <td className="py-2.5 text-muted-foreground font-medium">{i + 1}</td>
                    <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                    <td className="py-2.5 text-right">{p.qty}</td>
                    <td className="py-2.5 text-right font-bold text-green-600">R$ {p.revenue.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-muted-foreground">{faturamento > 0 ? ((p.revenue / faturamento) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment methods detail */}
      {paymentList.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <div className="flex items-center gap-2 mb-4"><CreditCard size={16} className="text-purple-500" /><h3 className="font-heading font-bold text-sm">Detalhamento por pagamento</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {paymentList.map((p, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-sm font-medium">{p.name}</span>
                </div>
                <p className="font-bold text-foreground">R$ {p.revenue.toFixed(2)}</p>
                <p className="text-[10px] text-muted-foreground">{p.count} pedido(s) · {totalVendas > 0 ? ((p.count / totalVendas) * 100).toFixed(0) : 0}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}