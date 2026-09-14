import React from 'react';
import { Heart, Star, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { Link, useNavigate } from 'react-router-dom';

const BADGE_COLORS = {
  red: 'bg-red-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
};

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const navigate = useNavigate();
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const wishlisted = isWishlisted(product.id);
  const displayPrice = hasPromo ? product.promo_price : product.price;
  const discountPct = hasPromo ? Math.round((1 - product.promo_price / product.price) * 100) : null;
  const badgeColor = BADGE_COLORS[product.badge_color] || BADGE_COLORS.red;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      <Link to={`/item/${product.id}`} className="block relative">
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>

        {product.badge_label && (
          <span className={`absolute top-2 left-2 ${badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`}>
            {product.badge_label}
          </span>
        )}

        {!product.badge_label && discountPct && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            -{discountPct}%
          </span>
        )}

        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm"
        >
          <Heart size={14} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
      </Link>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>

        {product.description && (
          <p className="text-[11px] text-gray-400 leading-tight line-clamp-1 min-h-[14px]">{product.description}</p>
        )}

        {product.rating_avg > 0 && (
          <div className="flex items-center gap-1 min-h-[16px]">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-semibold text-gray-600">{product.rating_avg?.toFixed(1)}</span>
            {product.rating_count > 0 && <span className="text-[10px] text-gray-400">({product.rating_count})</span>}
          </div>
        )}

        <div className="flex items-baseline gap-1.5 mt-0.5 min-w-0">
          {hasPromo && (
            <span className="text-xs text-gray-400 line-through flex-shrink-0">R$ {product.price?.toFixed(2)}</span>
          )}
          <span className="text-base font-extrabold text-primary whitespace-nowrap">R$ {displayPrice?.toFixed(2)}</span>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-1.5">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product); navigate('/checkout'); }}
            className="flex-1 h-9 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Comprar
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); addItem(product); }}
            title="Adicionar ao carrinho"
            className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <ShoppingCart size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}