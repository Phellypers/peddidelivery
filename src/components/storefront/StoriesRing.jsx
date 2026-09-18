import React, { useState, useEffect } from 'react';
import ImageUrlInput from '@/components/admin/ImageUrlInput';
import { X, Plus, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { createPortal } from 'react-dom';

const STORY_DURATION_MS = 24 * 60 * 60 * 1000;

// Viewer modal for a story
function StoryViewer({ stories, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex || 0);

  const prev = () => setCurrent(c => Math.max(0, c - 1));
  const next = () => {
    if (current < stories.length - 1) setCurrent(c => c + 1);
    else onClose();
  };

  const story = stories[current];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      onClick={onClose}
    >
      <div className="relative w-full max-w-sm h-full max-h-[700px]" onClick={e => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-10">
          {stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30">
              <div className={`h-full rounded-full bg-white transition-all ${i < current ? 'w-full' : i === current ? 'w-1/2' : 'w-0'}`} />
            </div>
          ))}
        </div>

        {/* Close */}
        <button onClick={onClose} className="absolute top-6 right-3 z-10 p-2 text-white">
          <X size={22} />
        </button>

        {/* Story content */}
        <div className="w-full h-full bg-gray-900 rounded-none overflow-hidden">
          {story?.video_url ? (
            <video src={story.video_url} className="w-full h-full object-cover" autoPlay muted playsInline onEnded={next} />
          ) : story?.image_url ? (
            <img src={story.image_url} alt="" className="w-full h-full object-cover" />
          ) : null}
          {story?.text && (
            <div className="absolute bottom-12 left-4 right-4 text-center">
              <p className="text-white font-bold text-lg drop-shadow">{story.text}</p>
            </div>
          )}
        </div>

        {/* Nav areas */}
        <button onClick={prev} className="absolute left-0 top-0 w-1/3 h-full" />
        <button onClick={next} className="absolute right-0 top-0 w-1/3 h-full" />
      </div>
    </motion.div>
  );
}

// Admin story uploader — accepts photo or video
function StoryUploader({ stories, onSave, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setMediaUrl(file_url);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!mediaUrl || saving) return;
    setError('');
    setSaving(true);
    const newStory = {
      image_url: mediaType === 'image' ? mediaUrl : '',
      video_url: mediaType === 'video' ? mediaUrl : '',
      text,
      created_at: new Date().toISOString(),
    };
    try {
      await onSave([...stories, newStory]);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível publicar o story.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = event => { if (event.key === 'Escape' && !uploading && !saving) onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = priorOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, saving, uploading]);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      data-peddi-story-modal=""
      className="peddi-story-modal fixed left-0 right-0 top-0 z-[100] flex items-end justify-center overflow-hidden bg-black/60 p-3 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={() => { if (!uploading && !saving) onClose(); }}
    >
      <motion.div
        initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: 24 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-story-title"
        className="peddi-story-panel flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 id="new-story-title" className="font-heading font-bold text-gray-900">Novo Story</h3>
            <p className="mt-0.5 text-xs text-gray-500">Compartilhe uma foto ou vídeo por 24 horas</p>
          </div>
          <button type="button" aria-label="Fechar novo story" onClick={onClose} disabled={uploading || saving} className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"><X size={20} /></button>
        </div>

        <form onSubmit={event => { event.preventDefault(); handleAdd(); }} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
            <div className="peddi-story-media relative overflow-hidden rounded-2xl bg-gray-100">
              {mediaUrl
                ? (mediaType === 'video'
                    ? <video src={mediaUrl} className="h-full w-full object-cover" muted playsInline autoPlay loop />
                    : <img src={mediaUrl} alt="Prévia do story" className="h-full w-full object-cover" />)
                : <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 text-gray-400 transition-colors hover:bg-gray-200/60 hover:text-primary">
                    {uploading
                      ? <><Loader2 size={28} className="animate-spin text-primary" /><span className="text-sm">Enviando arquivo...</span></>
                      : <><Upload size={28} /><span className="text-sm font-medium">Foto ou vídeo</span><span className="text-xs">Toque para escolher</span></>
                    }
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading || saving} />
                  </label>
              }
              {mediaUrl && <button type="button" aria-label="Remover mídia" onClick={() => { setMediaUrl(''); setMediaType(''); }} className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"><X size={17} /></button>}
            </div>

            <ImageUrlInput onApply={url => { setMediaUrl(url); setMediaType('image'); }} disabled={uploading || saving} />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600">Texto do story <span className="font-normal text-gray-400">(opcional)</span></span>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={2} maxLength={180} placeholder="Escreva uma mensagem para seus clientes" className="min-h-20 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <span className="mt-1 block text-right text-[11px] text-gray-400">{text.length}/180</span>
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 bg-white px-5 py-4">
            <button type="submit" disabled={!mediaUrl || uploading || saving} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
              {saving && <Loader2 size={18} className="animate-spin" />}
              {saving ? 'Publicando...' : 'Publicar Story'}
            </button>
            {!mediaUrl && <p className="mt-2 text-center text-xs text-gray-400">Adicione uma foto ou vídeo para publicar</p>}
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

export default function StoriesRing({ store, isAdmin, onUpdateStore }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const allStories = store?.stories || [];
  // Only stories from the last 24h are considered active
  const activeStories = allStories.filter(s => s.created_at && (Date.now() - new Date(s.created_at).getTime()) < STORY_DURATION_MS);
  const hasStories = activeStories.length > 0;

  const notifyCustomers = async () => {
    try {
      const profiles = await base44.entities.CustomerProfile.list();
      const targets = profiles.filter(p => p.user_id && !p.user_id.startsWith('manual_'));
      if (targets.length === 0) return;
      await base44.entities.Notification.bulkCreate(targets.map(p => ({
        user_id: p.user_id,
        type: 'story_posted',
        title: `${store?.name || 'Loja'} postou um novo Story`,
        message: `${store?.name || 'A loja'} postou um novo Story. Clique aqui para ver.`,
        is_read: false,
        reference_type: 'story',
      })));
    } catch (_) { /* silent */ }
  };

  const handleSave = async (newStories) => {
    await base44.entities.Store.update(store.id, { stories: newStories });
    onUpdateStore({ ...store, stories: newStories });
    notifyCustomers();
  };

  // Allow the notification bell to open the viewer directly
  useEffect(() => {
    const handler = () => { if (hasStories) setViewerOpen(true); };
    window.addEventListener('open-store-story', handler);
    return () => window.removeEventListener('open-store-story', handler);
  }, [hasStories]);

  return (
    <>
      <div className="relative inline-block">
        {/* Ring gradient when has active stories */}
        <div
          className={`w-24 h-24 rounded-full p-[3px] ${hasStories ? 'stories-ring' : 'ring-4 ring-primary/30'}`}
          style={hasStories ? { background: 'linear-gradient(135deg, #22c55e, #10b981, #34d399, #6ee7b7, #22c55e)', boxShadow: '0 0 12px 3px rgba(34,197,94,0.45)' } : {}}
        >
          <div className="w-full h-full rounded-full ring-2 ring-white overflow-hidden bg-gray-100">
            <button onClick={() => hasStories && setViewerOpen(true)} className="w-full h-full">
              {store?.logo_url
                ? <img src={store.logo_url} alt={store?.name} className="w-full h-full object-cover" />
                : <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&h=200&fit=crop&crop=center" alt="Restaurante" className="w-full h-full object-cover" />
              }
            </button>
          </div>
        </div>

        {/* Admin: add story button */}
        {isAdmin && (
          <button
            type="button"
            aria-label="Criar novo story"
            onClick={() => setUploaderOpen(true)}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {viewerOpen && hasStories && (
          <StoryViewer stories={activeStories} startIndex={0} onClose={() => setViewerOpen(false)} />
        )}
        {uploaderOpen && (
          <StoryUploader stories={allStories} onSave={handleSave} onClose={() => setUploaderOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
