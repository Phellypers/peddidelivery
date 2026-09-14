import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { ArrowLeft, Heart, Star, Clock, Minus, Plus, ShoppingBag, ShoppingCart, Check, Loader2, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReviewForm from '@/components/storefront/ReviewForm';
import ReviewComments from '@/components/storefront/ReviewComments';
import CartDrawer from '@/components/storefront/CartDrawer';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { emitLiveEvent } from '@/lib/liveSession';
import { isProductAvailable } from '@/lib/productAvailability';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, setIsOpen } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState({});
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [store, setStore] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const [purchaseError, setPurchaseError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    base44.entities.Product.filter({ id }).then(prods => {
      if (prods[0]) {
        setProduct(prods[0]);
        const vars = {};
        prods[0].variations?.forEach(v => { vars[v.name] = v.options?.[0]?.label || ''; });
        setSelectedVariations(vars);
      }
      setLoading(false);
    });
    base44.entities.Review.filter({ product_id: id, is_approved: true }, '-created_date', 10).then(setReviews);
    base44.entities.Store.list().then(stores => setStore(stores[0]));
  }, [id]);

  useEffect(() => {
    if (product) {
      emitLiveEvent('interessado', { current_product: product.name });
    }
  }, [product?.id]);

  const reloadReviews = () => {
    base44.entities.Review.filter({ product_id: id, is_approved: true }, '-created_date', 10).then(setReviews);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!product) {
    return <div className="min-h-screen flex flex-col items-center justify-center bg-background"><p className="text-muted-foreground">Item não encontrado</p><Link to="/loja" className="text-primary mt-2">Voltar ao cardápio</Link></div>;
  }

  const hasPromo = product.promo_price && product.promo_price < product.price;
  const basePrice = hasPromo ? product.promo_price : product.price;
  const variationExtra = Object.entries(selectedVariations).reduce((sum, [name, label]) => {
    const v = product.variations?.find(v => v.name === name);
    const opt = v?.options?.find(o => o.label === label);
    return sum + (opt?.price_modifier || 0);
  }, 0);
  const addonTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const totalPrice = (basePrice + variationExtra + addonTotal) * quantity;

  const variationString = Object.values(selectedVariations).filter(Boolean).join(', ');
  const fakeReviews = store?.fake_reviews_enabled ? (store?.fake_reviews || []) : [];
  const available = !product.is_paused && isProductAvailable(product) && Number(product.stock ?? 999) >= quantity;

  const handleAdd = () => {
    if (!available) { setPurchaseError('Produto indisponível neste horário ou sem estoque para a quantidade escolhida.'); return false; }
    const missing = (product.custom_fields || []).find(field => field.required && !String(customValues[field.label] ?? '').trim());
    if (missing) { setPurchaseError(`Preencha o campo obrigatório: ${missing.label}.`); return false; }
    setPurchaseError('');
    addItem(product, quantity, variationString, selectedAddons, notes, { custom_fields:customValues,unit_price:basePrice+variationExtra });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
    return true;
  };

  const toggleAddon = (addon) => {
    setSelectedAddons(prev =>
      prev.find(a => a.name === addon.name) ? prev.filter(a => a.name !== addon.name) : [...prev, addon]
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <CartDrawer />

      {/* Desktop: side-by-side layout; Mobile: stacked */}
      <div className="max-w-5xl mx-auto md:flex md:gap-8 md:px-8 md:pt-8">

        {/* Image column */}
        <div className="md:w-1/2 md:flex-shrink-0">
          <div className="relative md:rounded-2xl md:overflow-hidden">
            <div className="aspect-square overflow-hidden md:rounded-2xl">
              <img
                src={product.images?.[activeImage] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute left-4 right-4 flex justify-between" style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}>
              <Link to="/loja" className="w-10 h-10 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                <ArrowLeft size={20} />
              </Link>
              <button
                onClick={() => toggleWishlist(product.id)}
                className="w-10 h-10 bg-card/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
              >
                <Heart size={20} className={isWishlisted(product.id) ? 'fill-destructive text-destructive' : ''} />
              </button>
            </div>
            {product.images?.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {product.images.map((_, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`w-2 h-2 rounded-full transition-all ${i === activeImage ? 'bg-white w-6' : 'bg-white/50'}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content column */}
        <div className="md:w-1/2 md:flex-1 px-4 md:px-0 -mt-6 md:mt-0 relative z-10">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card rounded-2xl p-5 shadow-lg border border-border/50">
          <div className="flex items-start justify-between mb-2">
            <div>
              {hasPromo && <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">PROMOÇÃO</span>}
              <h1 className="font-heading font-bold text-xl text-foreground mt-1">{product.name}</h1>
            </div>
            <div className="text-right">
              {hasPromo && <p className="text-sm text-muted-foreground line-through">R$ {product.price?.toFixed(2)}</p>}
              <p className="font-heading font-bold text-xl text-primary">R$ {basePrice?.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            {product.rating_count > 0 && (
              <div className="flex items-center gap-1">
                <Star size={14} className="fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{product.rating_avg?.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({product.rating_count} avaliações)</span>
              </div>
            )}
            {product.prep_time_min && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock size={14} />
                <span className="text-sm">{product.prep_time_min} min</span>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{product.description}</p>

          {product.variations?.map(variation => (
            <div key={variation.name} className="mb-5">
              <h3 className="font-heading font-semibold text-sm text-foreground mb-2">{variation.name}</h3>
              <div className="flex flex-wrap gap-2">
                {variation.options?.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedVariations(prev => ({ ...prev, [variation.name]: opt.label }))}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedVariations[variation.name] === opt.label
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-foreground hover:bg-accent'
                    }`}
                  >
                    {opt.label}
                    {opt.price_modifier > 0 && <span className="ml-1 opacity-75">+R${opt.price_modifier.toFixed(0)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {product.addons?.length > 0 && (
            <div className="mb-5">
              <h3 className="font-heading font-semibold text-sm text-foreground mb-2">Adicionais</h3>
              <div className="space-y-2">
                {product.addons.map(addon => {
                  const isSelected = selectedAddons.find(a => a.name === addon.name);
                  return (
                    <button
                      key={addon.name}
                      onClick={() => toggleAddon(addon)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm transition-all ${
                        isSelected ? 'bg-primary/10 border-2 border-primary' : 'bg-muted border-2 border-transparent hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <Check size={16} className="text-primary" />}
                        <span className="font-medium">{addon.name}</span>
                      </div>
                      <span className="text-muted-foreground">+ R$ {addon.price?.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(product.custom_fields || []).length > 0 && <div className="mb-4 space-y-3">
            <h3 className="font-heading font-semibold text-sm">Personalize seu produto</h3>
            {product.custom_fields.map((field,index) => <label key={index} className="block text-sm" htmlFor={`product-field-${index}`}>
              {field.label}{field.required ? ' *' : ''}
              {field.type === 'select' ? <select id={`product-field-${index}`} value={customValues[field.label] || ''} onChange={e => setCustomValues(previous => ({...previous,[field.label]:e.target.value}))} className="block w-full p-3 bg-muted rounded-xl mt-1">
                <option value="">Selecione</option>{(field.options || []).filter(Boolean).map(option => <option key={option} value={option}>{option}</option>)}
              </select> : <input id={`product-field-${index}`} type={field.type === 'number' ? 'number' : 'text'} value={customValues[field.label] ?? ''} onChange={e => setCustomValues(previous => ({...previous,[field.label]:e.target.value}))} className="block w-full p-3 bg-muted rounded-xl mt-1" />}
            </label>)}
          </div>}
          {purchaseError && <p role="alert" className="text-red-600 text-sm mb-3">{purchaseError}</p>}
          {!available && <p className="text-orange-700 text-sm mb-3">Produto indisponível neste horário ou sem estoque para a quantidade escolhida.</p>}
          <div className="mb-4">
            <h3 className="font-heading font-semibold text-sm text-foreground mb-2">Observações</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex.: Sem cebola, molho à parte..."
              className="w-full px-4 py-3 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              rows={2}
            />
          </div>
        </motion.div>

        {/* Reviews section */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-5 shadow-sm border border-border/50 mt-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className="text-primary" />
            <h3 className="font-heading font-semibold text-sm text-foreground">
              Avaliações {reviews.length > 0 && `(${reviews.length})`}
            </h3>
          </div>
          {(reviews.length > 0 || fakeReviews.length > 0) && (
            <div className="space-y-4 mb-5">
              {fakeReviews.map((fr, fi) => (
                <div key={`fake-${fi}`} className="border-b border-border/30 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                        {fr.avatar
                          ? <img src={fr.avatar} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{fr.name?.[0]?.toUpperCase()}</div>
                        }
                      </div>
                      <p className="text-sm font-semibold text-foreground">{fr.name}</p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11} className={s <= (fr.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                  {fr.comment && <p className="text-xs text-muted-foreground leading-relaxed mb-2">{fr.comment}</p>}
                </div>
              ))}
              {reviews.map(review => (
                <div key={review.id} className="border-b border-border/30 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{review.customer_name || 'Cliente'}</p>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={11} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="text-xs text-muted-foreground leading-relaxed mb-2">{review.comment}</p>}
                  <ReviewComments
                    reviewId={review.id}
                    productId={id}
                    reviewAuthorUserId={review.created_by_id}
                  />
                </div>
              ))}
            </div>
          )}
          <ReviewForm productId={id} onReviewSubmitted={reloadReviews} user={user} />
        </motion.div>
        </div>{/* end content column */}
      </div>{/* end desktop flex */}

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border p-4 md:pb-4 pb-safe">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-muted rounded-xl p-1 flex-shrink-0">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
                <Minus size={16} />
              </button>
              <span className="font-bold text-base w-5 text-center">{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-1 gap-2">
              <button
                onClick={handleAdd}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-heading font-bold text-sm transition-all ${
                  added ? 'bg-green-500 text-white' : 'bg-muted text-foreground hover:bg-accent'
                }`}
              >
                {added ? <><Check size={16} /> Adicionado!</> : <><ShoppingCart size={16} /> Carrinho</>}
              </button>
              <button
                onClick={() => { if (handleAdd()) navigate('/checkout'); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-heading font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <ShoppingBag size={16} /> Comprar · R$ {totalPrice.toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
