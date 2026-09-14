import React, { useState, useEffect } from 'react';
import { X, Plus, Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';

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
  const [text, setText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setMediaUrl(file_url);
    setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
    setUploading(false);
  };

  const handleAdd = async () => {
    if (!mediaUrl) return;
    const newStory = {
      image_url: mediaType === 'image' ? mediaUrl : '',
      video_url: mediaType === 'video' ? mediaUrl : '',
      text,
      created_at: new Date().toISOString(),
    };
    onSave([...stories, newStory]);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
        onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-sm rounded-t-3xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-gray-900">Novo Story</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="h-40 bg-gray-100 rounded-2xl overflow-hidden relative">
          {mediaUrl
            ? (mediaType === 'video'
                ? <video src={mediaUrl} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                : <img src={mediaUrl} alt="" className="w-full h-full object-cover" />)
            : <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer gap-2 text-gray-400">
                {uploading
                  ? <Loader2 size={28} className="animate-spin text-primary" />
                  : <><Upload size={28} /><span className="text-sm">Foto ou vídeo</span></>
                }
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
          }
          {mediaUrl && (
            <button onClick={() => { setMediaUrl(''); setMediaType(''); }} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"><X size={14} /></button>
          )}
        </div>

        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Texto do story (opcional)"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <button
          onClick={handleAdd}
          disabled={!mediaUrl}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm disabled:opacity-40"
        >
          Publicar Story
        </button>
      </motion.div>
    </motion.div>
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