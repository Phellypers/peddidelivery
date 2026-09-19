import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { Link, useNavigate } from 'react-router-dom';
import ProductRating from '@/components/storefront/ProductRating';
import { getPriceDropBadge } from '@/lib/productHighlights';

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
  const priceDropBadge = getPriceDropBadge(product);

  return (
    <div data-product-id={product.id} className="peddi-product-card bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col">
      <Link to={`/item/${product.id}`} className="block relative">
        <div className="aspect-square overflow-hidden bg-gray-100">
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>

        <span className="absolute left-2 top-2 flex max-w-[calc(100%-3rem)] flex-col items-start gap-1">
          {priceDropBadge && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">{priceDropBadge}</span>}
          {product.badge_label
            ? <span className={`${badgeColor} rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm`}>{product.badge_label}</span>
            : !priceDropBadge && discountPct
              ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">-{discountPct}%</span>
              : null}
        </span>

        <button
          aria-label={`${wishlisted ? 'Remover' : 'Adicionar'} ${product.name} ${wishlisted ? 'dos' : 'aos'} favoritos`}
          aria-pressed={wishlisted}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product.id); }}
          className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center shadow-sm"
        >
          <Heart size={14} className={wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
        </button>
      </Link>

      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 min-h-[2.5rem]">{product.name}</p>

        {product.description && (
          <p className="peddi-product-description text-[11px] text-gray-400 leading-tight line-clamp-2 min-h-[14px]">{product.description}</p>
        )}

        <ProductRating product={product} />

        <div className="peddi-product-price flex flex-wrap items-baseline gap-1.5 mt-0.5 min-w-0">
          {hasPromo && (
            <span className="text-xs text-gray-400 line-through flex-shrink-0">R$ {product.price?.toFixed(2).replace('.', ',')}</span>
          )}
          <span className="text-base font-extrabold text-primary whitespace-nowrap">R$ {displayPrice?.toFixed(2).replace('.', ',')}</span>
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
            aria-label={`Adicionar ${product.name} ao carrinho`}
            className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <ShoppingCart size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
