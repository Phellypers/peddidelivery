import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Heart, CornerDownRight, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

async function createNotification({ user_id, type, title, message, reference_id, reference_type }) {
  if (!user_id) return;
  try {
    await base44.entities.Notification.create({ user_id, type, title, message, is_read: false, reference_id, reference_type });
  } catch (e) { /* silent */ }
}

function CommentItem({ comment, currentUser, onLike, onReply, replies = [] }) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState(currentUser?.full_name || '');
  const [sending, setSending] = useState(false);

  const hasLiked = currentUser?.id && comment.liked_by?.includes(currentUser.id);
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    await onReply(comment, replyText.trim(), replyName.trim() || 'Anônimo');
    setReplyText('');
    setShowReplyInput(false);
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
          {comment.author_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2">
            <p className="text-xs font-bold text-gray-800">{comment.author_name}</p>
            <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            <span className="text-[10px] text-gray-400">{timeAgo(comment.created_date)}</span>
            <button
              onClick={() => onLike(comment)}
              className={`flex items-center gap-1 text-[11px] font-semibold transition-colors ${hasLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
            >
              <Heart size={12} className={hasLiked ? 'fill-red-500' : ''} />
              {comment.likes > 0 && <span>{comment.likes}</span>}
              Curtir
            </button>
            <button
              onClick={() => setShowReplyInput(v => !v)}
              className="text-[11px] font-semibold text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
            >
              <CornerDownRight size={11} /> Responder
            </button>
          </div>

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-100">
              {replies.map(reply => (
                <div key={reply.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
                    {reply.author_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="bg-primary/5 rounded-2xl rounded-tl-sm px-3 py-2">
                      <p className="text-[11px] font-bold text-gray-800">{reply.author_name}</p>
                      <p className="text-xs text-gray-700 mt-0.5">{reply.content}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 ml-1">{timeAgo(reply.created_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          <AnimatePresence>
            {showReplyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-2 pl-3 border-l-2 border-primary/30"
              >
                {!currentUser && (
                  <input
                    value={replyName}
                    onChange={e => setReplyName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3 py-1.5 bg-gray-100 rounded-xl text-xs mb-1.5 border-0 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                )}
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                    placeholder={`Responder a ${comment.author_name}...`}
                    className="flex-1 px-3 py-1.5 bg-gray-100 rounded-xl text-xs border-0 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
                  >
                    {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function ReviewComments({ reviewId, productId, reviewAuthorUserId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState(user?.full_name || '');
  const [sending, setSending] = useState(false);

  const load = () => {
    base44.entities.ReviewComment.filter({ review_id: reviewId }, 'created_date').then(setComments);
  };

  useEffect(() => { load(); }, [reviewId]);

  const topComments = comments.filter(c => !c.is_reply);
  const repliesMap = comments.filter(c => c.is_reply).reduce((acc, r) => {
    if (!acc[r.reply_to_id]) acc[r.reply_to_id] = [];
    acc[r.reply_to_id].push(r);
    return acc;
  }, {});

  const handleLike = async (comment) => {
    const likedBy = comment.liked_by || [];
    const userId = user?.id || 'anon_' + Math.random().toString(36).slice(2);
    const hasLiked = user?.id && likedBy.includes(user.id);

    if (hasLiked) {
      await base44.entities.ReviewComment.update(comment.id, {
        likes: Math.max(0, (comment.likes || 0) - 1),
        liked_by: likedBy.filter(id => id !== user.id),
      });
    } else {
      const newLikes = (comment.likes || 0) + 1;
      const newLikedBy = user?.id ? [...likedBy, user.id] : likedBy;
      await base44.entities.ReviewComment.update(comment.id, { likes: newLikes, liked_by: newLikedBy });
      // Notify comment author
      if (comment.author_user_id && comment.author_user_id !== user?.id) {
        await createNotification({
          user_id: comment.author_user_id,
          type: 'review_like',
          title: '❤️ Curtida no seu comentário',
          message: `${user?.full_name || 'Alguém'} curtiu seu comentário.`,
          reference_id: reviewId,
          reference_type: 'review',
        });
      }
    }
    load();
  };

  const handleReply = async (parentComment, text, name) => {
    await base44.entities.ReviewComment.create({
      review_id: reviewId,
      product_id: productId,
      author_name: user?.full_name || name,
      author_user_id: user?.id || null,
      content: text,
      likes: 0,
      liked_by: [],
      reply_to_id: parentComment.id,
      is_reply: true,
    });
    // Notify parent comment author
    if (parentComment.author_user_id && parentComment.author_user_id !== user?.id) {
      await createNotification({
        user_id: parentComment.author_user_id,
        type: 'review_reply',
        title: '💬 Resposta ao seu comentário',
        message: `${user?.full_name || name} respondeu: "${text.slice(0, 60)}${text.length > 60 ? '...' : ''}"`,
        reference_id: reviewId,
        reference_type: 'review',
      });
    }
    load();
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    await base44.entities.ReviewComment.create({
      review_id: reviewId,
      product_id: productId,
      author_name: user?.full_name || authorName.trim() || 'Anônimo',
      author_user_id: user?.id || null,
      content: newComment.trim(),
      likes: 0,
      liked_by: [],
      is_reply: false,
    });
    setNewComment('');
    setSending(false);
    load();
  };

  return (
    <div className="mt-3">
      {/* Comment list */}
      {topComments.length > 0 && (
        <div className="space-y-3 mb-3">
          {topComments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUser={user}
              onLike={handleLike}
              onReply={handleReply}
              replies={repliesMap[c.id] || []}
            />
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="space-y-1.5">
        {!user && (
          <input
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Seu nome (opcional)"
            className="w-full px-3 py-2 bg-gray-50 rounded-xl text-xs border border-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        )}
        <div className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-primary mt-0.5">
            {(user?.full_name || authorName)?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              placeholder="Comentar nesta avaliação..."
              className="flex-1 px-3 py-2 bg-gray-50 rounded-xl text-xs border border-gray-100 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <button
              onClick={handleSendComment}
              disabled={sending || !newComment.trim()}
              className="w-8 h-8 bg-primary text-white rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}