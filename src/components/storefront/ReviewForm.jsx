import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { peddiApi } from '@/services/api/peddiApi';
import { Star, Loader2, Check } from 'lucide-react';

export default function ReviewForm({ productId, onReviewSubmitted, user }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.CustomerProfile.filter({ user_id: user.id }).then(res => {
      if (res[0]) setProfile(res[0]);
    });
  }, [user]);

  const displayName = profile?.name || user?.full_name || '';
  const displayPhoto = profile?.photo_url || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    setSaving(true);
    const customerName = user ? (displayName || 'Cliente') : (name || 'Anônimo');
    await base44.entities.Review.create({
      product_id: productId,
      customer_name: customerName,
      rating,
      comment,
      is_approved: true,
    });
    if (!peddiApi.isConfigured) {
    const reviews = await base44.entities.Review.filter({ product_id: productId, is_approved: true });
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    await base44.entities.Product.update(productId, {
      rating_avg: Math.round(avg * 10) / 10,
      rating_count: reviews.length,
    });
    }
    setSaving(false);
    setDone(true);
    setRating(0);
    setComment('');
    if (onReviewSubmitted) onReviewSubmitted();
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2 text-green-600">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <Check size={24} />
        </div>
        <p className="font-semibold text-sm">{peddiApi.isConfigured ? 'Avaliação enviada para aprovação. Obrigado!' : 'Avaliação enviada! Obrigado.'}</p>
        <button type="button" onClick={() => setDone(false)} className="text-xs text-primary font-medium mt-1">Avaliar novamente</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deixe sua avaliação</p>

      {/* Logged-in user info — auto-filled */}
      {user && displayName && (
        <div className="flex items-center gap-2.5 bg-muted/50 rounded-xl p-2.5">
          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {displayPhoto
              ? <img src={displayPhoto} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-500">{displayName[0]?.toUpperCase()}</div>
            }
          </div>
          <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
        </div>
      )}

      {/* Star picker */}
      <div className="flex gap-1 items-center">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s} type="button"
            onClick={() => setRating(s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
          >
            <Star size={28} className={`transition-colors ${(hover || rating) >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-sm font-semibold text-gray-600">{['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][rating]}</span>}
      </div>

      {/* Name input only for non-logged-in users */}
      {!user && (
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Seu nome (opcional)"
          className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}

      <textarea
        value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Conte o que achou..."
        rows={3}
        className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
      />

      <button
        type="submit" disabled={!rating || saving}
        className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enviar Avaliação'}
      </button>
    </form>
  );
}
