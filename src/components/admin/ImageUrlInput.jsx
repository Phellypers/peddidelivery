import React, { useState } from 'react';
import { Link } from 'lucide-react';

// The URL draft is deliberately separate from the persisted storage address.
export default function ImageUrlInput({ onApply, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const apply = () => {
    try {
      const url = new URL(draft.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      onApply(url.href);
      setDraft(''); setError(''); setOpen(false);
    } catch { setError('Informe uma URL de imagem válida, iniciando com https:// ou http://.'); }
  };
  return <div className="min-w-0 space-y-2">
    <button type="button" disabled={disabled} aria-expanded={open} onClick={() => { setOpen(!open); setDraft(''); setError(''); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-50"><Link size={16} />Adicionar imagem por URL</button>
    {open && <div className="space-y-2 rounded-xl bg-gray-50 p-3">
      <label className="block text-sm text-gray-600">URL externa da imagem
        <input type="url" value={draft} onChange={event => setDraft(event.target.value)} placeholder="https://..." disabled={disabled} className="mt-1 min-h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900" />
      </label>
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={apply} disabled={disabled || !draft.trim()} className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Usar imagem</button>
    </div>}
  </div>;
}
