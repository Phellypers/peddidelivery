import React from 'react';
import { getCategoryCover } from '@/lib/categoryCovers';

export default function CategoryBar({ categories, activeCategory, onSelect }) {
  return (
    <div className="overflow-x-auto scrollbar-hide py-3 border-b border-gray-100">
      <div className="flex gap-4 px-4">
        {/* "Todos" story bubble */}
        <button onClick={() => onSelect(null)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className={`w-16 h-16 rounded-full p-0.5 ${!activeCategory ? 'bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600' : 'bg-gray-200'}`}>
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl border-2 border-white">
              🏠
            </div>
          </div>
          <span className={`text-[11px] font-medium truncate max-w-[64px] ${!activeCategory ? 'text-gray-900' : 'text-gray-500'}`}>Todos</span>
        </button>

        {categories?.filter(c => c.is_active !== false).sort((a,b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)) || Number(a.sort_order || 0) - Number(b.sort_order || 0))?.map(cat => {
          const isActive = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => onSelect(cat.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div className={`w-16 h-16 rounded-full p-0.5 ${isActive ? 'bg-gradient-to-tr from-orange-400 via-pink-500 to-purple-600' : 'bg-gray-200'}`}>
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl border-2 border-white">
                  {getCategoryCover(cat)
                    ? <img src={getCategoryCover(cat)} alt={cat.name} className="w-full h-full rounded-full object-cover" />
                    : cat.icon
                  }
                </div>
              </div>
              <span className={`text-[11px] font-medium truncate max-w-[64px] ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
