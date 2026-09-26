import React from 'react';
import { Star } from 'lucide-react';

const demoRatingFor = (product) => {
  const seed = String(product?.id || product?.name || 'peddi-product');
  const hash = Array.from(seed).reduce((total, character) => ((total * 31) + character.codePointAt(0)) >>> 0, 7);
  const ratings = [4.6, 4.7, 4.8, 4.9];

  return {
    rating: ratings[hash % ratings.length],
    count: 18 + (hash % 73),
  };
};

export default function ProductRating({ product, showNew = false, className = '' }) {
  const realRating = Number(product?.rating_avg || 0);
  const realCount = Number(product?.rating_count || 0);
  const hasRealRating = realRating > 0 && realCount > 0;
  const demoRating = demoRatingFor(product);
  const rating = hasRealRating ? realRating : demoRating.rating;
  const count = hasRealRating ? realCount : demoRating.count;

  if (!product && showNew) return <span className={`text-[10px] font-medium text-gray-400 ${className}`}>Novo</span>;
  if (!product) return null;

  return (
    <span aria-label={`Avaliação ${rating.toFixed(1)} de 5, baseada em ${count} avaliações`} className={`inline-flex min-h-4 items-center gap-1 text-gray-500 ${className}`}>
      <Star size={11} aria-hidden="true" className="fill-amber-400 text-amber-400" />
      <span className="text-[11px] font-semibold text-gray-600">{rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
      <span className="text-[10px] text-gray-400">({count.toLocaleString('pt-BR')})</span>
    </span>
  );
}
