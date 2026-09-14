import React, { useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Users, Repeat, DollarSign, Package, CreditCard, Clock, MapPin, Award, AlertCircle, ShoppingBag, Printer, FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const PAYMENT_LABELS = {
  pix: 'PIX', credit_card: 'Cartão', cash: 'Dinheiro',
  whatsapp: 'WhatsApp', bank_transfer: 'Transferência', to_arrange: 'A combinar', split: 'Dividido'
};
const PAYMENT_COLORS = ['#22C55E', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#6B7280'];

const ORIGIN_LABELS = {
  catalog: 'Catálogo online',
  pdv_balcao: 'PDV — Balcão',
  pdv_quick: 'PDV — Venda rápida',
  pdv_table: 'Mesas/Comandas',
  pdv_pickup: 'PDV — Retirada',
  pdv_delivery: 'PDV — Delivery',
};

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={18} className="text-primary" />}
          <h2 className="font-heading font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon size={18} />
      </div>
      <p className="font-heading font-bold text-lg text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function inRange(dateStr, start, end) {
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

export default function AdvancedReports({ orders, products, customers }) {
  const [mode, setMode] = useState('month'); // today | month | year | custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  // Compute date range based on mode
  const { start, end, label } = useMemo(() => {
    const now = new Date();
    if (mode === 'today') {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      const e = new Date(now); e.setHours(23, 59, 59, 999);
      return { start: s, end: e, label: now.toLocaleDateString('pt-BR') };
    }
    if (mode === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: s, end: e, label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
    }
    if (mode === 'year') {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start: s, end: e, label: String(now.getFullYear()) };
    }
    // custom
      const s = customStart ? new Date(customStart + 'T00:00:00') : new Date(2000, 0, 1);
      const e = customEnd ? new Date(customEnd + 'T23:59:59') : new Date();
      return { start: s, end: e, label: customStart && customEnd ? `${customStart.split('-').reverse().join('/')} — ${customEnd.split('-').reverse().join('/')}` : 'Personalizado' };
  }, [mode, customStart, customEnd]);

  // Filter orders by period
  const periodOrders = useMemo(() => orders.filter(o => inRange(o.created_date, start, end)), [orders, start, end]);

  const finalized = periodOrders.filter(o => o.status !== 'pending' && o.status !== 'cancelled');
  const cancelled = periodOrders.filter(o => o.status === 'cancelled');

  const productCostMap = useMemo(() => {
    const map = {};
    (products || []).forEach(p => { map[p.id] = p.cost || 0; });
    return map;
  }, [products]);

  // Sales by period (daily breakdown within range)
  const salesByPeriod = useMemo(() => {
    const days = [];
    const diffDays = Math.min(Math.ceil((end - start) / (1000 * 60 * 60 * 24)), 90);
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const dayOrders = periodOrders.filter(o => new Date(o.created_date).toISOString().split('T')[0] === key && o.status !== 'cancelled');
      days.push({
        name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        vendas: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        pedidos: dayOrders.length,
      });
    }
    // If too many days, aggregate weekly
    if (days.length > 31) {
      const weekly = [];
      for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        weekly.push({
          name: chunk[0].name,
          vendas: chunk.reduce((s, d) => s + d.vendas, 0),
          pedidos: chunk.reduce((s, d) => s + d.pedidos, 0),
        });
      }
      return weekly;
    }
    return days;
  }, [periodOrders, start, end]);

  // Top selling products
  const productSales = useMemo(() => {
    const map = {};
    finalized.forEach(o => o.items?.forEach(item => {
      const key = item.product_id || item.product_name;
      const itemCost = (productCostMap[item.product_id] || 0) * (item.quantity || 0);
      if (!map[key]) map[key] = { name: item.product_name, qty: 0, revenue: 0, cost: 0, profit: 0 };
      map[key].qty += item.quantity || 0;
      map[key].revenue += (item.unit_price * item.quantity) || 0;
      map[key].cost += itemCost;
      map[key].profit += ((item.unit_price * item.quantity) || 0) - itemCost;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [finalized]);

  // Top cancelled products
  const productCancels = useMemo(() => {
    const map = {};
    cancelled.forEach(o => o.items?.forEach(item => {
      const key = item.product_id || item.product_name;
      if (!map[key]) map[key] = { name: item.product_name, qty: 0 };
      map[key].qty += item.quantity || 0;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [cancelled]);

  // Top regions
  const regionSales = useMemo(() => {
    const map = {};
    periodOrders.filter(o => o.status !== 'cancelled').forEach(o => {
      const region = o.delivery_city || (o.delivery_method === 'pickup' ? 'Retirada' : 'Sem região');
      if (!map[region]) map[region] = { name: region, count: 0, revenue: 0 };
      map[region].count++;
      map[region].revenue += o.total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [periodOrders]);

  // Payment methods
  const paymentStats = useMemo(() => {
    const map = {};
    periodOrders.forEach(o => {
      const m = o.payment_method || 'to_arrange';
      if (!map[m]) map[m] = { name: PAYMENT_LABELS[m] || m, count: 0, value: 0 };
      map[m].count++;
      map[m].value += o.total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [periodOrders]);

  // Origin stats
  const originStats = useMemo(() => {
    const map = {};
    finalized.forEach(o => {
      const origin = o.sale_origin || 'catalog';
      if (!map[origin]) map[origin] = { name: ORIGIN_LABELS[origin] || origin, count: 0, value: 0 };
      map[origin].count++;
      map[origin].value += o.total || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [finalized]);

  // Hourly / daily stats
  const timeStats = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const days = dayNames.map(d => ({ name: d, pedidos: 0 }));
    const hoursMap = {};
    periodOrders.forEach(o => {
      const d = new Date(o.created_date);
      days[d.getDay()].pedidos++;
      const h = d.getHours();
      hoursMap[h] = (hoursMap[h] || 0) + 1;
    });
    const hours = Object.entries(hoursMap)
      .map(([h, c]) => ({ name: `${h}h`, pedidos: c }))
      .sort((a, b) => parseInt(a.name) - parseInt(b.name));
    return { hours, days };
  }, [periodOrders]);

  // Customer stats
  const customerStats = useMemo(() => {
    const map = {};
    periodOrders.forEach(o => {
      const email = o.customer_email || o.customer_name;
      if (!email) return;
      if (!map[email]) map[email] = { name: o.customer_name, count: 0, spent: 0 };
      map[email].count++;
      if (o.status !== 'pending' && o.status !== 'cancelled') map[email].spent += o.total || 0;
    });
    const list = Object.values(map).sort((a, b) => b.count - a.count);
    return { list, active: list.length, recurring: list.filter(c => c.count >= 2).length };
  }, [periodOrders]);

  // Summary
  const totalSold = finalized.reduce((s, o) => s + (o.total || 0), 0);
  const totalCancelled = cancelled.reduce((s, o) => s + (o.total || 0), 0);
  const itemsSold = finalized.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0), 0);
  const avgTicket = finalized.length > 0 ? totalSold / finalized.length : 0;

  const totalCost = useMemo(() => {
    return finalized.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (productCostMap[i.product_id] || 0) * (i.quantity || 0), 0) || 0), 0);
  }, [finalized, productCostMap]);

  const totalProfit = totalSold - totalCost;

  const exportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      while (heightLeft > 0) {
        position -= 297;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      pdf.save(`relatorio-${label.replace(/[^\w-]/g, '_')}.pdf`);
    } catch (_) {}
    setExporting(false);
  };

  const periodModes = [
    { id: 'today', label: 'Dia' },
    { id: 'month', label: 'Mês' },
    { id: 'year', label: 'Ano' },
    { id: 'custom', label: 'Personalizado' },
  ];

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Period selector + export */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Período:</span>
          {periodModes.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${mode === m.id ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-accent'}`}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-xl text-sm font-medium hover:bg-accent transition-colors">
            <Printer size={15} /> Imprimir
          </button>
          <button onClick={exportPDF} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
            {exporting ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Custom date range */}
      {mode === 'custom' && (
        <div className="flex items-center gap-3 bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">De</label>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Até</label>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="w-full px-3 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
        </div>
      )}

      {/* Period label */}
      <p className="text-sm font-semibold text-muted-foreground">Relatório: <span className="text-foreground capitalize">{label}</span></p>

      {/* Summary mini-stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Total vendido" value={`R$ ${totalSold.toFixed(2)}`} icon={DollarSign} color="text-green-600 bg-green-50" />
        <MiniStat label="Total cancelado" value={`R$ ${totalCancelled.toFixed(2)}`} icon={TrendingDown} color="text-red-600 bg-red-50" />
        <MiniStat label="Ticket médio" value={`R$ ${avgTicket.toFixed(2)}`} icon={TrendingUp} color="text-blue-600 bg-blue-50" />
        <MiniStat label="Itens vendidos" value={itemsSold} icon={Package} color="text-orange-600 bg-orange-50" />
        <MiniStat label="Clientes ativos" value={customerStats.active} icon={Users} color="text-purple-600 bg-purple-50" />
        <MiniStat label="Clientes recorrentes" value={customerStats.recurring} icon={Repeat} color="text-cyan-600 bg-cyan-50" />
        <MiniStat label="Pedidos concluídos" value={finalized.length} icon={ShoppingBag} color="text-green-600 bg-green-50" />
        <MiniStat label="Pedidos cancelados" value={cancelled.length} icon={AlertCircle} color="text-red-600 bg-red-50" />
        <MiniStat label="Custo produção" value={`R$ ${totalCost.toFixed(0)}`} icon={Package} color="text-orange-600 bg-orange-50" />
        <MiniStat label="Lucro estimado" value={`R$ ${totalProfit.toFixed(0)}`} icon={TrendingUp} color={totalProfit >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"} />
      </div>

      {/* Sales by period */}
      <SectionCard title="Vendas por período" icon={TrendingUp} action={<span className="text-xs text-muted-foreground">{label}</span>}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesByPeriod}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
              <Tooltip formatter={v => [`R$ ${v.toFixed(2)}`, 'Vendas']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
              <Line type="monotone" dataKey="vendas" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top selling products */}
        <SectionCard title="Produtos mais vendidos" icon={Award}>
          {productSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {productSales.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  <span className="text-sm font-bold text-primary flex-shrink-0">{p.qty}x</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">R$ {p.revenue.toFixed(0)}</span>
                  <span className={`text-xs font-semibold flex-shrink-0 w-14 text-right ${p.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>R$ {p.profit.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Top cancelled products */}
        <SectionCard title="Produtos mais cancelados" icon={AlertCircle}>
          {productCancels.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum cancelamento</p>
          ) : (
            <div className="space-y-2">
              {productCancels.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                  <span className="text-sm font-bold text-red-500 flex-shrink-0">{p.qty}x</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Top regions */}
        <SectionCard title="Regiões que mais vendem" icon={MapPin}>
          {regionSales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-2">
              {regionSales.slice(0, 10).map((r, i) => {
                const max = regionSales[0].count;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary flex-shrink-0">{r.count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Payment methods */}
        <SectionCard title="Formas de pagamento" icon={CreditCard}>
          {paymentStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <div className="space-y-3">
              {paymentStats.map((p, i) => {
                const max = paymentStats[0].count;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">{p.count}x · R$ {p.value.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.count / max) * 100}%`, backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Sales by origin */}
      <SectionCard title="Vendas por origem" icon={ShoppingBag}>
        {originStats.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
        ) : (
          <div className="space-y-3">
            {originStats.map((o, i) => {
              const max = originStats[0].count;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-muted-foreground">{o.count}x · R$ {o.value.toFixed(0)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(o.count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Time-based stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Horários com mais pedidos" icon={Clock}>
          {timeStats.hours.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeStats.hours}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="pedidos" fill="hsl(142, 71%, 45%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Dias com mais pedidos" icon={Clock}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeStats.days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="pedidos" fill="hsl(215, 28%, 17%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Top recurring customers */}
      <SectionCard title="Clientes recorrentes" icon={Users}>
        {customerStats.list.filter(c => c.count >= 2).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente recorrente ainda</p>
        ) : (
          <div className="space-y-2">
            {customerStats.list.filter(c => c.count >= 2).slice(0, 10).map((c, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className="text-sm font-bold text-primary">{c.count} pedidos</span>
                <span className="text-xs text-muted-foreground w-24 text-right">R$ {c.spent.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}