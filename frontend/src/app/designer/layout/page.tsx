"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { 
  LayoutGrid, 
  Save, 
  Maximize2, 
  Move,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Monitor
} from 'lucide-react';
import Link from 'next/link';
import { clearCache } from '@/utils/api';

export default function LayoutDesignerPage() {
  const [layout, setLayout] = useState<any>({ cards: [], charts: [], components: [] });
  const [loading, setLoading] = useState(true);
  const [targetPage, setTargetPage] = useState<"home" | "noc">("home");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`http://127.0.0.1:8000/api/layouts/${targetPage}`)
      .then(res => res.json())
      .then(data => {
        const formatted = Array.isArray(data) ? { cards: data, charts: [] } : data;
        // Ensure defaults for grid properties
        const cleaned = {
            cards: (formatted.cards || []).map((c: any) => ({ ...c, x: c.x || 1, y: c.y || 1, w: c.w || 3, h: c.h || 1 })),
            charts: (formatted.charts || []).map((c: any) => ({ ...c, x: c.x || 1, y: c.y || 2, w: c.w || 6, h: c.h || 3 })),
            components: (formatted.components || []).map((c: any) => ({ ...c, x: c.x || 1, y: c.y || 1, w: c.w || 4, h: c.h || 4 }))
        };
        setLayout(cleaned);
        setLoading(false);
      });
  }, [targetPage]);

  const updateItem = (type: 'cards' | 'charts' | 'components', id: string, field: string, value: number) => {
    const newItems = layout[type].map((item: any) => {
      if (item.id === id) {
        let val = value;
        // Constraints
        if (field === 'x') val = Math.max(1, Math.min(12, value));
        if (field === 'y') val = Math.max(1, value);
        if (field === 'w') val = Math.max(1, Math.min(12, value));
        if (field === 'h') val = Math.max(1, value);
        
        return { ...item, [field]: val };
      }
      return item;
    });
    setLayout({ ...layout, [type]: newItems });
  };

  const removeItem = (type: 'cards' | 'charts' | 'components', id: string) => {
      setLayout({
          ...layout,
          [type]: layout[type].filter((item: any) => item.id !== id)
      });
  };

  const handleSave = async () => {
    await fetch(`http://127.0.0.1:8000/api/layouts/${targetPage}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layout)
    });
    clearCache();
    alert("Layout salvo com sucesso!");
  };

  // Drag and Drop Logic
  const onDragEnd = (e: any, info: any, type: 'cards' | 'charts' | 'components', id: string) => {
    if (!gridRef.current) return;
    
    const gridRect = gridRef.current.getBoundingClientRect();
    const cellWidth = gridRect.width / 12;
    const cellHeight = 80; // Approximate height of our grid units in preview

    const item = layout[type].find((i: any) => i.id === id);
    if (!item) return;

    // Calculate new X and Y based on drag offset
    const deltaX = Math.round(info.offset.x / cellWidth);
    const deltaY = Math.round(info.offset.y / cellHeight);

    const newX = Math.max(1, Math.min(12 - item.w + 1, item.x + deltaX));
    const newY = Math.max(1, item.y + deltaY);

    updateItem(type, id, 'x', newX);
    updateItem(type, id, 'y', newY);
  };

  return (
    <>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/designer">
                <button className="p-2 bg-[var(--input-bg)] rounded-lg hover:bg-[var(--card-border)] text-[var(--text-secondary)] border border-[var(--card-border)]">
                    <ArrowLeft size={16} />
                </button>
            </Link>
            <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Designer <span className="text-neon-red">2.0</span></h1>
          </div>
          <p className="text-[var(--text-secondary)]">Arraste os blocos para posicionar e use +/- para redimensionar.</p>
        </div>

        <div className="flex gap-4">
           <div className="flex bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--card-border)]">
                <button 
                    onClick={() => setTargetPage('home')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${targetPage === 'home' ? 'bg-neon-red text-white shadow-lg shadow-neon-red/20' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}
                >
                    <LayoutGrid size={14} /> HOME
                </button>
                <button 
                    onClick={() => setTargetPage('noc')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${targetPage === 'noc' ? 'bg-neon-red text-white shadow-lg shadow-neon-red/20' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}
                >
                    <Monitor size={14} /> NOC
                </button>
           </div>
            <button 
                onClick={handleSave}
                className="bg-[var(--foreground)] text-[var(--background)] font-black px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-neon-red hover:text-white transition-all shadow-lg"
            >
                <Save size={18} /> SALVAR ALTERAÇÕES
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Interactive Workspace */}
        <div className="relative">
           <div 
             ref={gridRef}
             className="glass-card p-10 bg-[var(--background)] border-[var(--card-border)] min-h-[800px] relative overflow-hidden"
             style={{
                 backgroundImage: `
                    linear-gradient(to right, rgba(128,128,128,0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(128,128,128,0.1) 1px, transparent 1px)
                 `,
                 backgroundSize: 'calc(100% / 12) 80px'
             }}
           >
              {/* Items Grid Container */}
              <div 
                className="grid grid-cols-12 auto-rows-[80px] gap-4 relative z-10"
              >
                 {/* EMPTY GRID SLOTS HELPER */}
                 {Array.from({ length: 120 }).map((_, i) => (
                    <div key={i} className="border border-[var(--card-border)] rounded-xl bg-[var(--input-bg)]" />
                 ))}
                 
                 {/* ABSOLUTE OVERLAY FOR ITEMS */}
                 <div className="absolute inset-0 grid grid-cols-12 auto-rows-[80px] gap-4 pointer-events-none">
                 {/* CARDS */}
                 {layout.cards.map((card: any) => (
                    <motion.div 
                        key={card.id}
                        drag
                        dragMomentum={false}
                        dragElastic={0.05}
                        onDragEnd={(e, info) => onDragEnd(e, info, 'cards', card.id)}
                        layout
                        style={{
                            gridColumnStart: card.x,
                            gridColumnEnd: `span ${card.w}`,
                            gridRowStart: card.y,
                            gridRowEnd: `span ${card.h}`,
                            zIndex: 20
                        }}
                        className="bg-[var(--card-bg)] border-[3px] border-[var(--card-border)] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-move hover:border-neon-red hover:shadow-[0_0_40px_rgba(255,45,85,0.3)] transition-all pointer-events-auto relative group shadow-2xl"
                    >
                        {/* Controls Overlay */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); removeItem('cards', card.id); }} className="p-1 bg-critical/20 text-critical rounded hover:bg-critical hover:text-white transition-colors">
                                <Trash2 size={12} />
                            </button>
                        </div>

                        <LayoutGrid size={20} className="text-neon-red mb-2 opacity-50" />
                        <span className="text-xs font-bold text-[var(--foreground)] line-clamp-1">{card.title}</span>
                        
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 bg-[var(--foreground)] text-[var(--background)] rounded-full px-2 py-1 shadow-lg">
                                <button onClick={(e) => { e.stopPropagation(); updateItem('cards', card.id, 'w', card.w - 1); }} className="hover:text-neon-red"><Minus size={10}/></button>
                                <span className="text-[10px] font-mono w-4 font-black">{card.w}</span>
                                <button onClick={(e) => { e.stopPropagation(); updateItem('cards', card.id, 'w', card.w + 1); }} className="hover:text-neon-red"><Plus size={10}/></button>
                            </div>
                        </div>
                    </motion.div>
                 ))}

                 {/* CHARTS */}
                 {layout.charts.map((chart: any) => (
                    <motion.div 
                        key={chart.id}
                        drag
                        dragMomentum={false}
                        dragElastic={0.05}
                        onDragEnd={(e, info) => onDragEnd(e, info, 'charts', chart.id)}
                        layout
                        style={{
                            gridColumnStart: chart.x,
                            gridColumnEnd: `span ${chart.w}`,
                            gridRowStart: chart.y,
                            gridRowEnd: `span ${chart.h}`,
                            zIndex: 10
                        }}
                        className="bg-[var(--card-bg)] border-[3px] border-neon-red/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-move hover:border-neon-red hover:shadow-[0_0_50px_rgba(255,45,85,0.4)] transition-all pointer-events-auto relative group shadow-2xl"
                    >
                        {/* Controls Overlay */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); removeItem('charts', chart.id); }} className="p-2 bg-critical/20 text-critical rounded-lg hover:bg-critical hover:text-white transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <Maximize2 size={32} className="text-neon-red mb-3 opacity-30" />
                        <span className="text-sm font-black text-[var(--foreground)] uppercase tracking-wider line-clamp-2">{chart.title}</span>
                        
                        {/* Resize Controls */}
                        <div className="mt-4 flex gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Largura</span>
                                <div className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] rounded-xl px-3 py-1 shadow-lg">
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('charts', chart.id, 'w', chart.w - 1); }} className="hover:text-neon-red"><Minus size={12}/></button>
                                    <span className="text-xs font-mono font-black w-4 text-center">{chart.w}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('charts', chart.id, 'w', chart.w + 1); }} className="hover:text-neon-red"><Plus size={12}/></button>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Altura</span>
                                <div className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] rounded-xl px-3 py-1 shadow-lg">
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('charts', chart.id, 'h', chart.h - 1); }} className="hover:text-neon-red"><Minus size={12}/></button>
                                    <span className="text-xs font-mono font-black w-4 text-center">{chart.h}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('charts', chart.id, 'h', chart.h + 1); }} className="hover:text-neon-red"><Plus size={12}/></button>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-4 flex items-center gap-1 text-[10px] text-gray-600 font-mono">
                            <Move size={12} />
                            {chart.x}, {chart.y}
                        </div>
                    </motion.div>
                 ))}

                 {/* COMPONENTS (ALERTS/REPORTS) */}
                 {layout.components.map((comp: any) => (
                    <motion.div 
                        key={comp.id}
                        drag
                        dragMomentum={false}
                        dragElastic={0.05}
                        onDragEnd={(e, info) => onDragEnd(e, info, 'components', comp.id)}
                        layout
                        style={{
                            gridColumnStart: comp.x,
                            gridColumnEnd: `span ${comp.w}`,
                            gridRowStart: comp.y,
                            gridRowEnd: `span ${comp.h}`,
                            zIndex: 15
                        }}
                        className={`bg-[var(--card-bg)] border-[3px] rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-move transition-all pointer-events-auto relative group shadow-2xl ${comp.type === 'alerts' ? 'border-critical/40 hover:border-critical hover:shadow-[0_0_30px_rgba(255,45,85,0.2)]' : 'border-blue-500/40 hover:border-blue-500 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]'}`}
                    >
                        {/* Controls Overlay */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); removeItem('components', comp.id); }} className="p-2 bg-critical/20 text-critical rounded-lg hover:bg-critical hover:text-white transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {comp.type === 'alerts' ? <Plus size={32} className="text-critical mb-3 opacity-30" /> : <LayoutGrid size={32} className="text-blue-500 mb-3 opacity-30" />}
                        <span className="text-xs font-black text-[var(--foreground)] uppercase tracking-wider line-clamp-2">{comp.title}</span>
                        <span className="text-[8px] font-bold text-gray-600 uppercase mt-1 tracking-[0.2em]">{comp.type}</span>
                        
                        {/* Resize Controls */}
                        <div className="mt-4 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] rounded-xl px-2 py-1 shadow-lg">
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('components', comp.id, 'w', comp.w - 1); }} className="hover:text-neon-red"><Minus size={10}/></button>
                                    <span className="text-[10px] font-mono font-bold w-4 text-center">{comp.w}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('components', comp.id, 'w', comp.w + 1); }} className="hover:text-neon-red"><Plus size={10}/></button>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] rounded-xl px-2 py-1 shadow-lg">
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('components', comp.id, 'h', comp.h - 1); }} className="hover:text-neon-red"><Minus size={10}/></button>
                                    <span className="text-[10px] font-mono font-bold w-4 text-center">{comp.h}</span>
                                    <button onClick={(e) => { e.stopPropagation(); updateItem('components', comp.id, 'h', comp.h + 1); }} className="hover:text-neon-red"><Plus size={10}/></button>
                                </div>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-4 flex items-center gap-1 text-[8px] text-gray-700 font-mono">
                            <Move size={10} />
                            {comp.x}, {comp.y}
                        </div>
                    </motion.div>
                 ))}
                 </div>
              </div>

              {/* Empty State / Dropzone help */}
              {layout.cards.length === 0 && layout.charts.length === 0 && layout.components.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-700">
                      <LayoutGrid size={64} className="mb-4 opacity-10" />
                      <p className="text-xl font-bold italic">Layout vazio. Adicione componentes no Designer.</p>
                  </div>
              )}
           </div>
        </div>
      </div>
      
      {/* Help Footer */}
      <div className="mt-8 bg-[var(--card-bg)] border border-[var(--card-border)] p-6 rounded-2xl flex items-center gap-6 shadow-sm">
          <div className="w-12 h-12 bg-neon-red/10 rounded-xl flex items-center justify-center">
              <Move className="text-neon-red" />
          </div>
          <div>
              <h4 className="font-bold text-[var(--foreground)]">Como usar o Designer 2.0</h4>
              <p className="text-sm text-[var(--text-secondary)]">Clique e segure para arrastar os blocos. Use os controles de <span className="text-neon-red font-black">+/-</span> que aparecem ao passar o mouse para redimensionar. Lembre-se de salvar antes de sair.</p>
          </div>
      </div>
    </>
  );
}
