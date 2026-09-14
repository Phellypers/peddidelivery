import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, X, Loader2, Check, Bike } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DelivererRatingModal({ order, onClose, onRated }) {
  const [deliverer, setDeliverer] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (order?.deliverer_user_id) {
      base44.entities.Deliverer.filter({ user_id: order.deliverer_user_id }).then(dels => setDeliverer(dels[0]));
    } else if (order?.tracking_code) {
      base44.entities.Deliverer.list('name').then(all => {
        setDeliverer(all.find(d => d.name === order.tracking_code));
      });
    }
  }, [order]);

  const submit = async () => {
    if (rating === 0 || !deliverer) return;
    setSubmitting(true);
    try {
      await base44.entities.DelivererRating.create({
        deliverer_id: deliverer.id,
        deliverer_user_id: deliverer.user_id || '',
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_email: order.customer_email || '',
        rating,
        comment,
      });
      const newCount = (deliverer.rating_count || 0) + 1;
      const newAvg = ((deliverer.rating_avg || 0) * (deliverer.rating_count || 0) + rating) / newCount;
      await base44.entities.Deliverer.update(deliverer.id, {
        rating_avg: Math.round(newAvg * 10) / 10,
        rating_count: newCount,
      });
      setDone(true);
      setTimeout(() => onRated(), 1500);
    } catch (_) {}
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="font-heading font-bold text-lg">Obrigado pela avaliação!</h3>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg">Avaliar Entregador</h3>
              <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
            </div>
            {deliverer && (
              <div className="flex items-center gap-3 py-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {deliverer.photo_url
                    ? <img src={deliverer.photo_url} className="w-full h-full object-cover" alt="" />
                    : <Bike size={22} className="text-gray-400" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{deliverer.name}</p>
                  <p className="text-xs text-gray-500">Pedido #{order.order_number}</p>
                </div>
              </div>
            )}
            <div className="text-center py-2">
              <p className="text-sm text-gray-600 mb-3">Como foi sua entrega?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
                    <Star size={32} className={(hover || rating) >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Comentário (opcional)..."
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" rows={3} />
            </div>
            <button onClick={submit} disabled={rating === 0 || submitting}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Enviar avaliação'}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}