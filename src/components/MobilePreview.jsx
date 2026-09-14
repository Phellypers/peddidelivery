import { useState } from 'react';

const isDevelopmentFrameEnabled = import.meta.env.DEV && import.meta.env.VITE_DEV_MOBILE_FRAME === 'true';

export default function MobilePreview({ children }) {
  const [enabled, setEnabled] = useState(isDevelopmentFrameEnabled);

  if (!import.meta.env.DEV) return children;

  if (!enabled) {
    return (
      <>
        <button
          type="button"
          onClick={() => setEnabled(true)}
          className="fixed bottom-4 right-4 z-[100] rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
        >
          Ativar moldura mobile
        </button>
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto flex min-h-[844px] w-full max-w-[390px] flex-col overflow-hidden rounded-[2rem] border-8 border-slate-900 bg-white shadow-2xl">
        <div className="h-6 shrink-0 bg-slate-900" aria-hidden="true" />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
      <button
        type="button"
        onClick={() => setEnabled(false)}
        className="mx-auto mt-4 block rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
      >
        Desativar moldura mobile
      </button>
    </div>
  );
}