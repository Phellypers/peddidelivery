import React, { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function FinancialReportModal({ user, clientName, onClose }) {
  const [periodType, setPeriodType] = useState('month');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const getRange = () => {
    if (periodType === 'month') {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      return { start, end, label: `${MONTHS[month - 1]} de ${year}` };
    }
    if (periodType === 'year') {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return { start, end, label: `Ano de ${year}` };
    }
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    return {
      start, end,
      label: `${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`,
    };
  };

  const handleGenerate = async () => {
    setError('');
    if (periodType === 'custom' && (!startDate || !endDate)) {
      setError('Selecione as datas inicial e final.');
      return;
    }
    setGenerating(true);
    try {
      const { start, end, label } = getRange();
      const orders = await base44.entities.Order.filter({ customer_email: user.email, status: 'delivered' }, '-created_date');
      const filtered = orders.filter(o => {
        const d = new Date(o.created_date);
        return d >= start && d <= end;
      });
      const totalSpent = filtered.reduce((sum, o) => sum + (o.total || 0), 0);

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 20;
      doc.setFontSize(16);
      doc.text('Relatório Financeiro', 14, y);
      y += 10;
      doc.setFontSize(11);
      doc.text(`Cliente: ${clientName}`, 14, y); y += 7;
      doc.text(`Período: ${label}`, 14, y); y += 7;
      doc.text(`Total gasto: R$ ${totalSpent.toFixed(2)}`, 14, y); y += 7;
      doc.text(`Quantidade de pedidos concluídos: ${filtered.length}`, 14, y); y += 12;

      doc.setFontSize(12);
      doc.text('Pedidos', 14, y); y += 8;
      doc.setFontSize(10);
      doc.text('Data', 14, y);
      doc.text('Valor', 160, y);
      y += 2;
      doc.line(14, y, 196, y);
      y += 6;

      filtered.forEach(o => {
        if (y > 280) { doc.addPage(); y = 20; }
        const dateStr = new Date(o.created_date).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        doc.text(dateStr, 14, y);
        doc.text(`R$ ${(o.total || 0).toFixed(2)}`, 160, y);
        y += 7;
      });

      if (filtered.length === 0) {
        doc.text('Nenhum pedido concluído neste período.', 14, y);
      }

      doc.save(`relatorio-financeiro-${label.replace(/\s/g, '-').toLowerCase()}.pdf`);
      onClose();
    } catch (e) {
      setError('Erro ao gerar relatório.');
    }
    setGenerating(false);
  };

  return (
    <div data-peddi-modal="" className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-lg">Relatório financeiro</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <div className="flex gap-2">
          {[{ k: 'month', l: 'Mês' }, { k: 'year', l: 'Ano' }, { k: 'custom', l: 'Período' }].map(opt => (
            <button key={opt.k} onClick={() => setPeriodType(opt.k)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${periodType === opt.k ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-500'}`}>
              {opt.l}
            </button>
          ))}
        </div>

        {periodType === 'month' && (
          <div className="grid grid-cols-2 gap-2">
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {periodType === 'year' && (
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}

        {periodType === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">De</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Até</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={handleGenerate} disabled={generating}
          className="w-full py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          {generating ? 'Gerando...' : 'Gerar PDF'}
        </button>
      </motion.div>
    </div>
  );
}
