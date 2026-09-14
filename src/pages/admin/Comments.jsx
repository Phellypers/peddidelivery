import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, MessageSquare, Heart, Reply, Search, ExternalLink, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Comments() {
  const [comments, setComments] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    const [cs, ps, rs] = await Promise.all([
      base44.entities.ReviewComment.list('-created_date', 200),
      base44.entities.Product.list(),
      base44.entities.Review.list('-created_date', 200),
    ]);
    setComments(cs);
    setProducts(ps);
    setReviews(rs);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.ReviewComment.subscribe((event) => {
      if (event.type === 'create') setComments(prev => [event.data, ...prev]);
      else if (event.type === 'update') setComments(prev => prev.map(c => c.id === event.id ? { ...c, ...event.data } : c));
      else if (event.type === 'delete') setComments(prev => prev.filter(c => c.id !== event.id));
    });
    return () => unsub();
  }, []);

  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });
  const reviewMap = {};
  reviews.forEach(r => { reviewMap[r.id] = r; });

  // Build comment threads — top-level comments grouped with replies
  const topLevel = comments.filter(c => !c.is_reply || !c.reply_to_id);
  const repliesByParent = {};
  comments.filter(c => c.is_reply && c.reply_to_id).forEach(r => {
    if (!repliesByParent[r.reply_to_id]) repliesByParent[r.reply_to_id] = [];
    repliesByParent[r.reply_to_id].push(r);
  });

  const filtered = topLevel.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    const prod = productMap[reviewMap[c.review_id]?.product_id];
    return c.content?.toLowerCase().includes(q) ||
      c.author_name?.toLowerCase().includes(q) ||
      prod?.name?.toLowerCase().includes(q);
  });

  const toggleLike = async (comment) => {
    const likes = comment.likes || 0;
    const likedBy = comment.liked_by || [];
    const hasLiked = likedBy.includes('admin');
    await base44.entities.ReviewComment.update(comment.id, {
      likes: hasLiked ? likes - 1 : likes + 1,
      liked_by: hasLiked ? likedBy.filter(x => x !== 'admin') : [...likedBy, 'admin'],
    });
  };

  const submitReply = async (parentId) => {
    if (!replyText.trim()) return;
    setSending(true);
    const parent = comments.find(c => c.id === parentId);
    await base44.entities.ReviewComment.create({
      review_id: parent.review_id,
      product_id: parent.product_id,
      author_name: 'Loja',
      author_user_id: 'admin',
      content: replyText,
      is_reply: true,
      reply_to_id: parentId,
    });
    setReplyText('');
    setReplyTo(null);
    setSending(false);
  };

  const removeComment = async (id) => {
    if (!confirm('Excluir este comentário?')) return;
    await base44.entities.ReviewComment.delete(id);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Central de Comentários</h1>
        <p className="text-sm text-muted-foreground mt-1">{comments.length} comentários · {topLevel.length} conversas</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por comentário, autor ou produto..." className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum comentário encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(comment => {
            const review = reviewMap[comment.review_id];
            const product = productMap[comment.product_id || review?.product_id];
            const replies = repliesByParent[comment.id] || [];
            return (
              <motion.div key={comment.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
                {/* Product info */}
                {product && (
                  <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                    {product.images?.[0] && <img src={product.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                    <Link to={`/item/${product.id}`} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      {product.name} <ExternalLink size={11} />
                    </Link>
                  </div>
                )}
                {/* Comment */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {(comment.author_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{comment.author_name}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{comment.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(comment.created_date).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleLike(comment)} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent transition-colors text-xs">
                      <Heart size={14} className={(comment.liked_by || []).includes('admin') ? 'fill-red-500 text-red-500' : 'text-muted-foreground'} />
                      <span className="text-muted-foreground">{comment.likes || 0}</span>
                    </button>
                    <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                      <Reply size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => removeComment(comment.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
                {/* Replies */}
                {replies.length > 0 && (
                  <div className="pl-12 space-y-2 border-l-2 border-border/30 ml-4">
                    {replies.map(r => (
                      <div key={r.id} className="flex items-start gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-primary">LOJA</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-foreground">{r.author_name}</p>
                          <p className="text-sm text-gray-600">{r.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_date).toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="pl-12 ml-4 flex gap-2">
                    <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escreva uma resposta..." autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') submitReply(comment.id); }}
                      className="flex-1 px-3 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button onClick={() => submitReply(comment.id)} disabled={sending || !replyText.trim()} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-50">
                      {sending ? <Loader2 size={14} className="animate-spin" /> : 'Enviar'}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}