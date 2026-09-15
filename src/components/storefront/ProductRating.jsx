import React from 'react';
import { Star } from 'lucide-react';

export default function ProductRating({ product, showNew = false, className = '' }) {
  const rating = Number(product?.rating_avg || 0);
  const count = Number(product?.rating_count || 0);

  if (rating <= 0 || count <= 0) {
    return showNew ? <span className={`text-[10px] font-medium text-gray-400 ${className}`}>Novo</span> : null;
  }

  return (
    <span aria-label={`Avaliação ${rating.toFixed(1)} de 5, baseada em ${count} avaliações`} className={`inline-flex min-h-4 items-center gap-1 text-gray-500 ${className}`}>
      <Star size={11} aria-hidden="true" className="fill-amber-400 text-amber-400" />
      <span className="text-[11px] font-semibold text-gray-600">{rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      <span className="text-[10px] text-gray-400">({count.toLocaleString('pt-BR')})</span>
    </span>
  );
}
