import React from 'react';
export default function TypingIndicator() {
  return <div role="status" className="flex items-center gap-2 px-4 py-2 text-xs text-[#6B7280]">
    <span className="flex gap-1" aria-hidden="true">{[0,1,2].map(i=><span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22C55E] motion-reduce:animate-none" style={{animationDelay:`${i*180}ms`}}/>)}</span>Digitando...
  </div>;
}
