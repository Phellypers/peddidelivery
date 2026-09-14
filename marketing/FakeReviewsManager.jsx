import React from 'react';
import { Plus, Trash2, RefreshCw, MessageSquare } from 'lucide-react';

export default function FakeReviewsManager({ form, set }) {
  const fakeReviews = form.fake_reviews || [];
  const enabled = form.fake_reviews_enabled || false;

  const addReview = () => {
    const imgNum = Math.floor(Math.random() * 70) + 1;
    set('fake_reviews', [...fakeReviews, { name: 'Cliente', rating: 5, comment: '', avatar: `https://i.pravatar.cc/100?img=${imgNum}` }]);
  };

  const updateReview = (idx, field, value) => {
    set('fake_reviews', fakeReviews.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeReview = (idx) => {
    set('fake_reviews', fakeReviews.filter((_, i) => i !== idx));
  };

  const randomizeAvatar = (idx) => {
    const imgNum = Math.floor(Math.random() * 70) + 1;
    updateReview(idx, 'avatar', `https://i.pravatar.cc/100?img=${imgNum}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-primary" />
        <h2 className="font-heading font-semibold text-gray-900">Comentários de prova social</h2>
      </div>
      <p className="text-xs text-gray-400">Comentários demonstrativos exibidos nos produtos para estimular interação dos clientes.</p>

      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={e => set('fake_reviews_enabled', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
        <span className="font-medium">Ativar comentários fake</span>
      </label>

      {enabled && (
        <div className="space-y-3">
          {fakeReviews.map((r, idx) => (
            <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
              <div className="flex items-start gap-2">
                <img src={r.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input value={r.name} onChange={e => updateReview(idx, 'name', e.target.value)} placeholder="Nome do cliente" className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30" />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} type="button" onClick={() => updateReview(idx, 'rating', s)} className={`text-sm ${(r.rating || 0) >= s ? 'text-amber-400' : 'text-gray-300'}`}>★</button>
                    ))}
                  </div>
                  <textarea value={r.comment} onChange={e => updateReview(idx, 'comment', e.target.value)} placeholder="Comentário..." rows={2} className="w-full px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button type="button" onClick={() => randomizeAvatar(idx)} className="p-1 text-gray-400 hover:text-primary"><RefreshCw size={12} /></button>
                  <button type="button" onClick={() => removeReview(idx)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addReview} className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-primary/40 rounded-xl text-primary text-sm font-semibold hover:bg-primary/5 w-full justify-center">
            <Plus size={14} /> Adicionar comentário
          </button>
        </div>
      )}
    </div>
  );
}