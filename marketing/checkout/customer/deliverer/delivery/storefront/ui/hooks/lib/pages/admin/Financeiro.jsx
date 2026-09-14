import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Wallet, ArrowUpCircle, FileBarChart, Package, BarChart3, ShoppingBag } from 'lucide-react';
import AccountsTab from '@/components/admin/finance/AccountsTab';
import CashBalance from '@/components/admin/finance/CashBalance';
import DRE from '@/components/admin/finance/DRE';
import CMV from '@/components/admin/finance/CMV';
import FinancialReport from '@/components/admin/finance/FinancialReport';
import SalesReport from '@/components/admin/finance/SalesReport';

const PERIODS = [
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'this_quarter', label: 'Este trimestre' },
  { id: 'this_year', label: 'Este ano' },
  { id: 'all', label: 'Tudo' },
];

function getPeriodRange(period) {
  const now = new Date();
  if (period === 'this_month') return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) };
  if (period === 'last_month') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
  if (period === 'this_quarter') { const q = Math.floor(now.getMonth() / 3); return { start: new Date(now.getFullYear(), q * 3, 1), end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999) }; }
  if (period === 'this_year') return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) };
  return { start: null, end: null };
}

function getPrevPeriodRange(period) {
  const now = new Date();
  if (period === 'this_month') return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
  if (period === 'last_month') return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), end: new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999) };
  if (period === 'this_quarter') { const q = Math.floor(now.getMonth() / 3); return { start: new Date(now.getFullYear(), (q - 1) * 3, 1), end: new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999) }; }
  if (period === 'this_year') return { start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999) };
  return { start: null, end: null };
}

const TABS = [
  { id: 'cash', label: 'Saldo de Caixa', icon: Wallet },
  { id: 'accounts', label: 'Lançamentos', icon: ArrowUpCircle },
  { id: 'dre', label: 'DRE', icon: FileBarChart },
  { id: 'cmv', label: 'CMV', icon: Package },
  { id: 'fin_report', label: 'Rel. Financeiro', icon: BarChart3 },
  { id: 'sales_report', label: 'Rel. Vendas', icon: ShoppingBag },
];

export default function Financeiro() {
  const [tab, setTab] = useState('cash');
  const [period, setPeriod] = useState('this_month');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadFinancialData = async () => {
    setLoadingData(true);
    try {
      const [allOrders, prods, accs, cats] = await Promise.all([
        base44.entities.Order.list('-created_date', 500),
        base44.entities.Product.list(),
        base44.entities.Account.list(),
        base44.entities.Category.list(),
      ]);
      setOrders(allOrders);
      setProducts(prods);
      setAccounts(accs);
      setCategories(cats);
    } catch (_) {}
    setLoadingData(false);
  };

  useEffect(() => { loadFinancialData(); }, []);

  const range = getPeriodRange(period);
  const prevRange = getPrevPeriodRange(period);

  const inPeriod = (dateStr, r) => {
    if (!r.start) return true;
    const d = new Date(dateStr);
    return d >= r.start && d <= r.end;
  };

  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const salesOrders = orders.filter(o => o.status !== 'cancelled');

  const periodDelivered = deliveredOrders.filter(o => inPeriod(o.created_date, range));
  const prevDelivered = deliveredOrders.filter(o => inPeriod(o.created_date, prevRange));
  const periodSales = salesOrders.filter(o => inPeriod(o.created_date, range));

  const periodAccounts = accounts.filter(a => {
    const refDate = a.paid_date || a.due_date;
    return (a.status === 'paid' || a.status === 'received') && inPeriod(refDate, range);
  });
  const prevAccounts = accounts.filter(a => {
    const refDate = a.paid_date || a.due_date;
    return (a.status === 'paid' || a.status === 'received') && inPeriod(refDate, prevRange);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestão financeira da operação</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-2xl w-fit overflow-x-auto max-w-full">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${tab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Period selector (hidden on accounts tab) */}
      {tab !== 'accounts' && (
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'cash' && <CashBalance orders={periodDelivered} products={products} accounts={periodAccounts} loading={loadingData} />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'dre' && <DRE orders={periodDelivered} products={products} accounts={periodAccounts} loading={loadingData} prevOrders={prevDelivered} prevAccounts={prevAccounts} period={period} />}
      {tab === 'cmv' && <CMV orders={periodDelivered} products={products} loading={loadingData} />}
      {tab === 'fin_report' && <FinancialReport orders={periodDelivered} products={products} accounts={periodAccounts} loading={loadingData} />}
      {tab === 'sales_report' && <SalesReport orders={periodSales} products={products} categories={categories} loading={loadingData} />}
    </div>
  );
}