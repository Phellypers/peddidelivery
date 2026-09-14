import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, ShoppingCart, Eye, Package, Clock, ArrowUpRight, Users, CheckCircle2, XCircle, TrendingUp, MapPin, BarChart3, LayoutList, Wallet, TrendingDown, Receipt } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AdvancedReports from '@/components/admin/AdvancedReports';
import LiveNowBlock from '@/components/admin/LiveNowBlock';

const statusLabels = {
  pending: 'Pendente', confirmed: 'Confirmado', preparing: 'Preparando',
  shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado'
};
const statusColors = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-cyan-100 text-cyan-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
};

const ORIGIN_LABELS = {
  catalog: 'Catálogo online',
  pdv_balcao: 'PDV — Balcão',
  pdv_quick: 'PDV — Venda rápida',
  pdv_table: 'Mesas/Comandas',
  pdv_pickup: 'PDV — Retirada',
  pdv_delivery: 'PDV — Delivery',
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      base44.entities.Order.list('-created_date', 500),
      base44.entities.Product.list(),
      base44.entities.CustomerProfile.list(),
      base44.entities.Account.list(),
    ]).then(([o, p, c, a]) => {
      setOrders(o); setProducts(p); setCustomers(c); setAccounts(a);
      setLoading(false);
    });
  }, []);

  const finalized = orders.filter(o => o.status !== 'pending' && o.status !== 'cancelled');
  const cancelled = orders.filter(o => o.status === 'cancelled');
  const totalSales = finalized.reduce((s, o) => s + (o.total || 0), 0);
  const totalCancelled = cancelled.reduce((s, o) => s + (o.total || 0), 0);
  const itemsSold = finalized.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0), 0);
  const itemsCancelled = cancelled.reduce((s, o) => s + (o.items?.reduce((ss, i) => ss + (i.quantity || 0), 0) || 0), 0);
  const totalViews = products.reduce((sum, p) => sum + (p.views || 0), 0);
  const activeCustomers = customers.filter(c => (c.total_orders || 0) > 0).length || new Set(orders.map(o => o.customer_email).filter(Boolean)).size;

  // Financial indicators
  const productCostMap = {};
  products.forEach(p => { productCostMap[p.id] = p.cost || 0; });
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const todayDelivered = orders.filter(o => o.status === 'delivered' && new Date(o.created_date) >= todayStart);
  const todayFaturamento = todayDelivered.reduce((s, o) => s + (o.total || 0), 0);
  const todayCMV = todayDelivered.reduce((s, o) => s + (o.items || []).reduce((si, i) => si + (productCostMap[i.product_id] || 0) * (i.quantity || 0), 0), 0);
  const todayTicketMedio = todayDelivered.length > 0 ? todayFaturamento / todayDelivered.length : 0;
  const monthDespesas = accounts.filter(a => a.type === 'payable' && a.status === 'paid' && new Date(a.paid_date || a.due_date) >= monthStart).reduce((s, a) => s + (a.amount || 0), 0);
  const monthReceitas = accounts.filter(a => a.type === 'receivable' && a.status === 'received' && new Date(a.paid_date || a.due_date) >= monthStart).reduce((s, a) => s + (a.amount || 0), 0);
  const lucroHoje = todayFaturamento - todayCMV - monthDespesas + monthReceitas;
  const saldoCaixa = accounts.filter(a => a.status === 'paid' || a.status === 'received').reduce((s, a) => s + (a.type === 'receivable' ? (a.amount || 0) : -(a.amount || 0)), 0);

  // Region ranking
  const regionRank = useMemo(() => {
    const map = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      const region = o.delivery_city || (o.delivery_method === 'pickup' ? 'Retirada' : 'Sem região');
      if (!map[region]) map[region] = 0;
      map[region]++;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [orders]);

  // Weekly sales chart (real data)
  const weeklyData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dayOrders = orders.filter(o => {
        const od = new Date(o.created_date).toISOString().split('T')[0];
        return od === key && o.status !== 'cancelled';
      });
      days.push({
        name: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        vendas: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
        pedidos: dayOrders.length,
      });
    }
    return days;
  }, [orders]);

  const stats = [
    { label: 'Total vendido', value: `R$ ${totalSales.toFixed(0)}`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'Pedidos concluídos', value: finalized.length, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
    { label: 'Pedidos cancelados', value: cancelled.length, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Total cancelado', value: `R$ ${totalCancelled.toFixed(0)}`, icon: TrendingUp, color: 'text-red-600 bg-red-50' },
    { label: 'Clientes ativos', value: activeCustomers, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { label: 'Itens vendidos', value: itemsSold, icon: Package, color: 'text-orange-600 bg-orange-50' },
    { label: 'Itens cancelados', value: itemsCancelled, icon: XCircle, color: 'text-red-600 bg-red-50' },
    { label: 'Visualizações', value: totalViews, icon: Eye, color: 'text-blue-600 bg-blue-50' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral e relatórios do seu negócio</p>
        </div>
        {/* Tab toggle */}
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          <button onClick={() => setTab('overview')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'overview' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutList size={16} /> Visão Geral
          </button>
          <button onClick={() => setTab('reports')} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'reports' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <BarChart3 size={16} /> Relatórios
          </button>
        </div>
      </div>

      {tab === 'reports' ? (
        <AdvancedReports orders={orders} products={products} customers={customers} />
      ) : (
        <>
          <LiveNowBlock />

          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-card rounded-2xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <p className="font-heading font-bold text-xl text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>

          {/* Financial indicators */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="text-primary" />
              <h2 className="font-heading font-semibold text-foreground">Indicadores Financeiros</h2>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">Hoje</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={14} className="text-green-600" /><span className="text-[10px] text-green-700 uppercase font-semibold">Faturamento</span></div>
                <p className="font-heading font-bold text-lg text-green-700">R$ {todayFaturamento.toFixed(2)}</p>
                <p className="text-[10px] text-green-600 mt-0.5">{todayDelivered.length} venda(s) hoje</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><TrendingDown size={14} className="text-red-600" /><span className="text-[10px] text-red-700 uppercase font-semibold">CMV</span></div>
                <p className="font-heading font-bold text-lg text-red-700">R$ {todayCMV.toFixed(2)}</p>
                <p className="text-[10px] text-red-600 mt-0.5">{todayFaturamento > 0 ? `${((todayCMV/todayFaturamento)*100).toFixed(0)}% da receita` : '—'}</p>
              </div>
              <div className={`rounded-xl p-3 ${lucroHoje >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-1.5 mb-1"><DollarSign size={14} className={lucroHoje >= 0 ? 'text-blue-600' : 'text-red-600'} /><span className={`text-[10px] uppercase font-semibold ${lucroHoje >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Lucro</span></div>
                <p className={`font-heading font-bold text-lg ${lucroHoje >= 0 ? 'text-blue-700' : 'text-red-700'}`}>R$ {lucroHoje.toFixed(2)}</p>
                <p className={`text-[10px] mt-0.5 ${lucroHoje >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{todayFaturamento > 0 ? `${((lucroHoje/todayFaturamento)*100).toFixed(0)}% margem` : '—'}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Receipt size={14} className="text-purple-600" /><span className="text-[10px] text-purple-700 uppercase font-semibold">Ticket Médio</span></div>
                <p className="font-heading font-bold text-lg text-purple-700">R$ {todayTicketMedio.toFixed(2)}</p>
                <p className="text-[10px] text-purple-600 mt-0.5">por venda</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><TrendingDown size={14} className="text-orange-600" /><span className="text-[10px] text-orange-700 uppercase font-semibold">Despesas (mês)</span></div>
                <p className="font-heading font-bold text-lg text-orange-700">R$ {monthDespesas.toFixed(2)}</p>
                <p className="text-[10px] text-orange-600 mt-0.5">contas pagas no mês</p>
              </div>
              <div className="bg-cyan-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Wallet size={14} className="text-cyan-600" /><span className="text-[10px] text-cyan-700 uppercase font-semibold">Saldo de Caixa</span></div>
                <p className={`font-heading font-bold text-lg ${saldoCaixa >= 0 ? 'text-cyan-700' : 'text-red-700'}`}>R$ {saldoCaixa.toFixed(2)}</p>
                <p className="text-[10px] text-cyan-600 mt-0.5">acumulado total</p>
              </div>
            </div>
          </div>

          {/* Origin breakdown */}
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <h2 className="font-heading font-semibold text-foreground mb-4">Vendas por origem</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(ORIGIN_LABELS).map(([key, label]) => {
                const count = finalized.filter(o => (o.sale_origin || 'catalog') === key).length;
                const revenue = finalized.filter(o => (o.sale_origin || 'catalog') === key).reduce((s, o) => s + (o.total || 0), 0);
                if (count === 0) return null;
                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">R$ {revenue.toFixed(0)}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">{count}</span>
                  </div>
                );
              })}
              {finalized.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-4">Sem vendas finalizadas</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly sales chart */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-5">
              <h2 className="font-heading font-semibold text-foreground mb-4">Vendas da Semana</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `R$${v}`} />
                    <Tooltip formatter={(v) => [`R$ ${v.toFixed(2)}`, 'Vendas']} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }} />
                    <Area type="monotone" dataKey="vendas" stroke="hsl(142, 71%, 45%)" fill="url(#colorVendas)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Region ranking */}
            <div className="bg-card rounded-2xl border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-primary" />
                <h2 className="font-heading font-semibold text-foreground">Regiões que mais vendem</h2>
              </div>
              {regionRank.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <div className="space-y-2.5">
                  {regionRank.map((r, i) => {
                    const max = regionRank[0].count;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${i < 3 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{r.name}</p>
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
            </div>
          </div>

          {/* Recent orders */}
          <div className="bg-card rounded-2xl border border-border/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-semibold text-foreground">Pedidos Recentes</h2>
              <a href="/admin/pedidos" className="text-sm text-primary font-medium">Ver todos</a>
            </div>
            <div className="sm:hidden space-y-2">
              {orders.slice(0, 10).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold">#{order.order_number} · {order.customer_name}</p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-primary">R$ {order.total?.toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">#</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Cliente</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Total</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map(order => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="py-3 px-2 font-medium">#{order.order_number}</td>
                      <td className="py-3 px-2">{order.customer_name}</td>
                      <td className="py-3 px-2 font-medium">R$ {order.total?.toFixed(2)}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[order.status] || 'bg-muted text-muted-foreground'}`}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">{order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'credit_card' ? 'Cartão' : order.payment_method === 'cash' ? 'Dinheiro' : order.payment_method?.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}