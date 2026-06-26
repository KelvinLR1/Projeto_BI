"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchWithCache, readCache } from '@/utils/api';
import { 
  Save, 
  Trash2, 
  Settings, 
  Keyboard, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  GripHorizontal,
  Move,
  Maximize2,
  Zap,
  TrendingUp,
  AlertCircle,
  X,
  ChevronRight as RightIcon,
  Library,
  RefreshCcw,
  Plus
} from 'lucide-react';

export default function KpiSettingsPage() {
  const [activeTab, setActiveTab] = useState<"home" | "noc">("home");

  // Inicializa do cache síncrono para evitar flash na grade
  const cachedHomeLayout = readCache<any>('http://127.0.0.1:8000/api/layouts/home');
  const cachedLibrary = readCache<any[]>('http://127.0.0.1:8000/api/library');
  const hasCachedData = !!(cachedHomeLayout && cachedLibrary);

  const [layout, setLayout] = useState<{cards: any[], charts: any[], components: any[], config: {columns: number | "", rowHeight: number}}>(
    cachedHomeLayout
      ? { cards: cachedHomeLayout.cards || [], charts: cachedHomeLayout.charts || [], components: cachedHomeLayout.components || [], config: cachedHomeLayout.config || { columns: 12, rowHeight: 80 } }
      : { cards: [], charts: [], components: [], config: {columns: 12, rowHeight: 80} }
  );
  const [availableAssets, setAvailableAssets] = useState<any[]>(cachedLibrary ?? []);
  const [loading, setLoading] = useState(!hasCachedData);
  const [saving, setSaving] = useState(false);
  
  const [showSelector, setShowSelector] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{x: number, y: number} | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [home, noc, libData] = await Promise.all([
        fetchWithCache<any>('http://127.0.0.1:8000/api/layouts/home'),
        fetchWithCache<any>('http://127.0.0.1:8000/api/layouts/noc'),
        fetchWithCache<any[]>('http://127.0.0.1:8000/api/library'),
      ]);
      const current = activeTab === 'home' ? home : noc;
      setLayout({
        cards: Array.isArray(current.cards) ? current.cards : [],
        charts: Array.isArray(current.charts) ? current.charts : [],
        components: Array.isArray(current.components) ? current.components : [],
        config: current.config || { columns: 12, rowHeight: 80 }
      });
      setAvailableAssets(Array.isArray(libData) ? libData : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const isPositionAvailable = useCallback((assetId: string, x: number, y: number, w: number, h: number) => {
    const maxRows = activeTab === 'noc' ? 8 : 25;
    const maxCols = layout.config?.columns || 12;
    if (x < 1 || x + w - 1 > maxCols || y < 1 || y + h - 1 > maxRows) return false;
    const allAssets = [...layout.cards, ...layout.charts, ...layout.components];
    for (const asset of allAssets) {
        if (asset.id === assetId) continue;
        const xOverlap = x < asset.x + asset.w && x + w > asset.x;
        const yOverlap = y < asset.y + asset.h && y + h > asset.y;
        if (xOverlap && yOverlap) return false;
    }
    return true;
  }, [layout, activeTab]);

  const updateAsset = useCallback((type: string, id: string, updates: any) => {
    setLayout(prev => {
        let actualType = type;
        if (type === 'kpi') actualType = 'cards';
        const collection = prev[actualType as keyof typeof prev] as any[];
        const asset = collection.find(a => a.id === id);
        if (!asset) return prev;
        const nextX = updates.x !== undefined ? updates.x : asset.x;
        const nextY = updates.y !== undefined ? updates.y : asset.y;
        const nextW = updates.w !== undefined ? updates.w : asset.w;
        const nextH = updates.h !== undefined ? updates.h : asset.h;
        if (isPositionAvailable(id, nextX, nextY, nextW, nextH)) {
            return { ...prev, [actualType]: collection.map(item => item.id === id ? { ...item, ...updates } : item) };
        }
        return prev;
    });
  }, [isPositionAvailable]);

  const removeAsset = useCallback((id: string) => {
    setLayout(prev => ({
      ...prev,
      cards: prev.cards.filter(a => a.id !== id),
      charts: prev.charts.filter(a => a.id !== id),
      components: prev.components.filter(a => a.id !== id),
    }));
    setSelectedAssetId(null);
  }, []);

  const selectedAsset = [...layout.cards, ...layout.charts, ...layout.components].find(a => a.id === selectedAssetId);
  const selectedType = selectedAsset ? (layout.cards.some(a => a.id === selectedAsset.id) ? 'cards' : layout.charts.some(a => a.id === selectedAsset.id) ? 'charts' : 'components') : '';

  // KEYBOARD SUPPORT
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedAssetId || !selectedAsset || !selectedType) return;
      const step = e.shiftKey ? 2 : 1;
      switch(e.key) {
        case 'ArrowUp': e.preventDefault(); updateAsset(selectedType, selectedAsset.id, { y: Math.max(1, selectedAsset.y - step) }); break;
        case 'ArrowDown': e.preventDefault(); updateAsset(selectedType, selectedAsset.id, { y: selectedAsset.y + step }); break;
        case 'ArrowLeft': e.preventDefault(); updateAsset(selectedType, selectedAsset.id, { x: Math.max(1, selectedAsset.x - step) }); break;
        case 'ArrowRight': e.preventDefault(); updateAsset(selectedType, selectedAsset.id, { x: selectedAsset.x + step }); break;
        case 'Escape': setSelectedAssetId(null); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAssetId, selectedAsset, selectedType, updateAsset]);

  const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLayout(prev => ({
        ...prev,
        config: { ...prev.config, columns: e.target.value === "" ? "" : Number(e.target.value) }
    }));
  };

  const handleColumnsBlur = () => {
    setLayout(prev => {
        const allItems = [...prev.cards, ...prev.charts, ...prev.components];
        const minRequiredCols = allItems.length > 0 ? Math.max(...allItems.map(item => item.x + item.w - 1)) : 4;
        let val = Number(prev.config?.columns || 12);
        val = Math.max(Math.max(4, minRequiredCols), Math.min(24, val));
        return { ...prev, config: { ...prev.config, columns: val } };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/layouts/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layout)
      });
      alert("Layout salvo!");
    } catch (e) { alert("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-[var(--foreground)] mb-2 uppercase tracking-tighter italic">Designer de <span className="text-neon-red">Grade</span></h1>
          <p className="text-[var(--text-secondary)] font-bold text-xs uppercase tracking-widest flex items-center gap-2">
            <Keyboard size={14} className="text-neon-red" /> Selecione um item e use a paleta de ferramentas flutuante.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-[var(--input-bg)] border border-[var(--card-border)] p-2 rounded-2xl flex items-center gap-4 px-4 mr-2">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Colunas</span>
                <input type="number" min="4" max="24" value={layout.config?.columns === "" ? "" : (layout.config?.columns || 12)} onChange={handleColumnsChange} onBlur={handleColumnsBlur} className="w-14 bg-transparent border-b border-neon-red/30 text-[var(--foreground)] text-xs text-center font-black outline-none focus:border-neon-red transition-colors" />
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-widest">Altura</span>
                <input type="number" min="40" max="300" value={layout.config?.rowHeight || 80} onChange={e => setLayout(p => ({...p, config: {...p.config, rowHeight: Number(e.target.value)}}))} className="w-14 bg-transparent border-b border-neon-red/30 text-[var(--foreground)] text-xs text-center font-black outline-none focus:border-neon-red transition-colors" />
             </div>
          </div>
          <div className="bg-[var(--input-bg)] border border-[var(--card-border)] p-1 rounded-2xl flex gap-1">
            <button onClick={() => setActiveTab("home")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'home' ? 'bg-neon-red text-white' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>Home</button>
            <button onClick={() => setActiveTab("noc")} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'noc' ? 'bg-neon-red text-white' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}>NOC</button>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-[var(--foreground)] text-[var(--background)] px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neon-red hover:text-white transition-all shadow-xl flex items-center gap-3">
            {saving ? <RefreshCcw className="animate-spin" /> : <Save size={18} />} Salvar Alterações
          </button>
        </div>
      </div>

      <div
        className={`relative bg-[var(--card-bg)] rounded-[40px] p-10 border-2 border-[var(--card-border)] overflow-hidden shadow-xl transition-all duration-500 ${activeTab === 'noc' ? 'h-[850px]' : 'min-h-[1200px]'}`}
        onClick={() => setSelectedAssetId(null)}
      >
        {/* LOADING SKELETON */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--card-bg)] rounded-[40px]"
            >
              <motion.div
                animate={{ opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-3xl bg-neon-red/20 border-2 border-neon-red/30 flex items-center justify-center"
              >
                <RefreshCcw size={24} className="text-neon-red" />
              </motion.div>
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Carregando layout...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* GRID OF CELLS */}
        <div
          className={`absolute inset-0 grid gap-4 p-10`}
          style={{ gridTemplateColumns: `repeat(${layout.config?.columns || 12}, minmax(0, 1fr))`, gridAutoRows: `${layout.config?.rowHeight || 80}px` }}
        >
          {Array.from({ length: (layout.config?.columns || 12) * (activeTab === 'noc' ? 8 : 25) }).map((_, i) => {
            const cols = layout.config?.columns || 12;
            const x = (i % cols) + 1; const y = Math.floor(i / cols) + 1;
            const isOccupied = [...layout.cards, ...layout.charts, ...layout.components].some(a => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h);
            if (isOccupied) return <div key={i} />;
            return (
              <button key={i} onClick={(e) => { e.stopPropagation(); setSelectedCell({x,y}); setShowSelector(true); }} className="rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] hover:border-neon-red/30 hover:bg-neon-red/5 transition-all flex items-center justify-center group shadow-inner">
                <Plus size={14} className="text-[var(--text-secondary)] opacity-10 group-hover:text-neon-red group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* ASSETS CONTAINER — fade in uma vez após carregar */}
        <AnimatePresence>
          {!loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative grid gap-4 pointer-events-none"
              style={{ gridTemplateColumns: `repeat(${layout.config?.columns || 12}, minmax(0, 1fr))`, gridAutoRows: `${layout.config?.rowHeight || 80}px` }}
            >
              {layout.cards.map((kpi) => <CleanAsset key={kpi.id} type="cards" item={kpi} icon={Zap} isSelected={selectedAssetId === kpi.id} onSelect={setSelectedAssetId} />)}
              {layout.charts.map((chart) => <CleanAsset key={chart.id} type="charts" item={chart} icon={TrendingUp} isSelected={selectedAssetId === chart.id} onSelect={setSelectedAssetId} />)}
              {layout.components.map((comp) => <CleanAsset key={comp.id} type="components" item={comp} icon={AlertCircle} isSelected={selectedAssetId === comp.id} onSelect={setSelectedAssetId} />)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* DRAGGABLE CONTROL PALETTE */}
      <AnimatePresence>
        {selectedAsset && (
            <motion.div 
                drag
                dragMomentum={false}
                initial={{ opacity: 0, x: 100, y: 100 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed bottom-10 right-10 w-72 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-[32px] shadow-2xl backdrop-blur-2xl z-[200] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="p-4 bg-[var(--input-bg)] border-b border-[var(--card-border)] flex items-center gap-3 cursor-grab active:cursor-grabbing">
                    <GripHorizontal size={16} className="text-neon-red" />
                    <div className="flex-1 overflow-hidden">
                        <span className="text-[10px] font-black text-[var(--foreground)] uppercase truncate block pr-2">{selectedAsset.title}</span>
                        <span className="text-[7px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">{selectedType}</span>
                    </div>
                    <button onClick={() => setSelectedAssetId(null)} className="p-1.5 hover:bg-[var(--card-border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"><X size={14} /></button>
                </div>

                <div className="p-6 space-y-8">
                    {/* POSITION D-PAD */}
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase mb-4 tracking-widest flex items-center gap-2"><Move size={10} /> Movimentação</span>
                        <div className="grid grid-cols-3 gap-2">
                            <div />
                            <button onClick={() => updateAsset(selectedType, selectedAsset.id, { y: selectedAsset.y - 1 })} className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl hover:bg-neon-red hover:text-white hover:border-neon-red transition-all"><ChevronUp size={18} /></button>
                            <div />
                            <button onClick={() => updateAsset(selectedType, selectedAsset.id, { x: selectedAsset.x - 1 })} className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl hover:bg-neon-red hover:text-white hover:border-neon-red transition-all"><ChevronLeft size={18} /></button>
                            <div className="bg-neon-red/10 border border-neon-red/20 rounded-xl flex items-center justify-center text-[10px] font-black text-neon-red tabular-nums shadow-inner">{selectedAsset.x},{selectedAsset.y}</div>
                            <button onClick={() => updateAsset(selectedType, selectedAsset.id, { x: selectedAsset.x + 1 })} className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl hover:bg-neon-red hover:text-white hover:border-neon-red transition-all"><ChevronRight size={18} /></button>
                            <div />
                            <button onClick={() => updateAsset(selectedType, selectedAsset.id, { y: selectedAsset.y + 1 })} className="p-3 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl hover:bg-neon-red hover:text-white hover:border-neon-red transition-all"><ChevronDown size={18} /></button>
                            <div />
                        </div>
                    </div>

                    {/* SIZE CONTROLS */}
                    <div className="space-y-4">
                        <span className="text-[8px] font-black text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2"><Maximize2 size={10} /> Dimensionamento</span>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[var(--input-bg)] p-3 rounded-2xl border border-[var(--card-border)]">
                                <span className="text-[7px] font-black text-[var(--text-secondary)] uppercase block mb-2">Largura</span>
                                <div className="flex items-center justify-between text-[var(--foreground)]">
                                    <button onClick={() => updateAsset(selectedType, selectedAsset.id, { w: selectedAsset.w - 1 })} className="hover:text-neon-red transition-colors font-black">-</button>
                                    <span className="text-xs font-black">{selectedAsset.w}</span>
                                    <button onClick={() => updateAsset(selectedType, selectedAsset.id, { w: selectedAsset.w + 1 })} className="hover:text-neon-red transition-colors font-black">+</button>
                                </div>
                            </div>
                            <div className="bg-[var(--input-bg)] p-3 rounded-2xl border border-[var(--card-border)]">
                                <span className="text-[7px] font-black text-[var(--text-secondary)] uppercase block mb-2">Altura</span>
                                <div className="flex items-center justify-between text-[var(--foreground)]">
                                    <button onClick={() => updateAsset(selectedType, selectedAsset.id, { h: selectedAsset.h - 1 })} className="hover:text-neon-red transition-colors font-black">-</button>
                                    <span className="text-xs font-black">{selectedAsset.h}</span>
                                    <button onClick={() => updateAsset(selectedType, selectedAsset.id, { h: selectedAsset.h + 1 })} className="hover:text-neon-red transition-colors font-black">+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DELETE BUTTON */}
                    <button 
                        onClick={() => removeAsset(selectedAsset.id)}
                        className="w-full py-3 bg-critical/10 border border-critical/20 rounded-xl text-critical text-[10px] font-black uppercase tracking-widest hover:bg-critical hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} /> Excluir Ativo
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSelector && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    onClick={() => setShowSelector(false)} 
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]" 
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: 20 }} 
                    className="fixed inset-0 flex items-center justify-center z-[201] p-10 pointer-events-none"
                >
                    <div className="bg-[#0d0d12] border border-white/10 w-full max-w-5xl h-[80vh] rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col pointer-events-auto relative">
                        {/* DECORATIVE BACKGROUND */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-neon-red/5 rounded-full blur-[100px] -mr-48 -mt-48" />

                        {/* HEADER */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01] relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                    Biblioteca de <span className="text-neon-red">Ativos</span>
                                </h2>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
                                    <div className="w-2 h-2 bg-neon-red rounded-full animate-pulse" /> Inserir na Posição {selectedCell?.x}, {selectedCell?.y}
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSelector(false)} 
                                className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-neon-red/20 transition-all border border-white/5"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* CATEGORY TABS */}
                        <div className="px-8 pt-6 flex gap-4 relative z-10">
                            {[
                                { id: 'kpi', label: 'Métricas & KPIs', icon: Zap, color: 'text-neon-red' },
                                { id: 'charts', label: 'Visualização (Gráficos)', icon: TrendingUp, color: 'text-blue-500' },
                                { id: 'components', label: 'Componentes de Sistema', icon: AlertCircle, color: 'text-warning' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSelectedAssetId(tab.id)} // Reusing selectedAssetId as category filter temporarily
                                    className={`px-6 py-3 rounded-2xl flex items-center gap-3 border transition-all ${
                                        (selectedAssetId === tab.id || (!selectedAssetId && tab.id === 'kpi')) 
                                        ? 'bg-white text-black border-white' 
                                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                                    }`}
                                >
                                    <tab.icon size={18} className={(selectedAssetId === tab.id || (!selectedAssetId && tab.id === 'kpi')) ? 'text-black' : tab.color} />
                                    <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* ASSETS GRID */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
                            <div className="grid grid-cols-3 gap-6">
                                {availableAssets
                                    .filter(asset => {
                                        const cat = selectedAssetId || 'kpi';
                                        if (cat === 'kpi') return asset.type === 'kpi';
                                        if (cat === 'charts') return asset.type === 'charts';
                                        if (cat === 'components') return asset.type === 'components';
                                        return asset.type === cat;
                                    })
                                    .map(asset => {
                                        const canPlace = isPositionAvailable('temp', selectedCell!.x, selectedCell!.y, asset.w || 3, asset.h || 1);
                                        return (
                                            <motion.div 
                                                whileHover={canPlace ? { scale: 1.02, y: -8 } : {}}
                                                whileTap={canPlace ? { scale: 0.98 } : {}}
                                                key={asset.id} 
                                                onClick={() => { 
                                                    if (!canPlace) return;
                                                    const newAsset = { ...asset, x: selectedCell!.x, y: selectedCell!.y, w: asset.w || 3, h: asset.h || 1 };
                                                    const typeMap = { kpi: 'cards', charts: 'charts', components: 'components' };
                                                    const type = (typeMap[asset.type as keyof typeof typeMap] || 'components') as 'cards' | 'charts' | 'components';
                                                    setLayout(prev => ({ ...prev, [type]: [...prev[type], newAsset] }));
                                                    setShowSelector(false);
                                                }} 
                                                className={`group relative h-64 rounded-[40px] border transition-all cursor-pointer overflow-hidden flex flex-col ${
                                                    canPlace 
                                                    ? 'bg-[#15151e] border-white/10 hover:border-neon-red/50 shadow-2xl' 
                                                    : 'bg-black/40 border-transparent opacity-40 grayscale cursor-not-allowed'
                                                }`}
                                            >
                                                {/* ASSET PREVIEW (SKELETON) */}
                                                <div className="flex-1 bg-black/40 p-6 flex items-center justify-center relative overflow-hidden">
                                                    {/* Background Pattern */}
                                                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                                                         style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                                    
                                                    {/* THE PREVIEW */}
                                                    <div className="relative z-10 w-full h-full flex flex-col items-center justify-center gap-2">
                                                        {asset.type === 'kpi' && (
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="w-12 h-1 bg-neon-red/20 rounded-full" />
                                                                <span className="text-2xl font-black text-neon-red tabular-nums drop-shadow-[0_0_10px_rgba(255,45,85,0.5)]">84.2%</span>
                                                                <div className="w-20 h-1.5 bg-white/5 rounded-full" />
                                                            </div>
                                                        )}
                                                        {asset.type === 'charts' && (
                                                            <div className="w-full flex flex-col gap-2 px-4">
                                                                <div className="flex items-end gap-1 h-12 justify-center">
                                                                    {[40, 70, 45, 90, 65, 80].map((h, i) => (
                                                                        <div key={i} className="w-2 bg-neon-red/40 rounded-t-sm" style={{ height: `${h}%` }} />
                                                                    ))}
                                                                </div>
                                                                <div className="h-1 bg-white/5 rounded-full w-full" />
                                                            </div>
                                                        )}
                                                        {asset.type === 'components' && (
                                                            <div className="flex flex-col gap-1.5 w-full px-6">
                                                                <div className="h-2 bg-white/10 rounded-full w-full" />
                                                                <div className="h-2 bg-white/5 rounded-full w-[80%]" />
                                                                <div className="h-2 bg-white/5 rounded-full w-[90%]" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Type Icon Badge */}
                                                    <div className="absolute top-4 left-4 p-2 bg-black/60 rounded-xl border border-white/5 text-gray-400 group-hover:text-neon-red transition-colors">
                                                        {asset.type === 'charts' ? <TrendingUp size={16} /> : asset.type === 'kpi' ? <Zap size={16} /> : <AlertCircle size={16} />}
                                                    </div>

                                                    {/* Status Badge */}
                                                    {!canPlace && (
                                                        <div className="absolute top-4 right-4 bg-critical/20 text-critical border border-critical/30 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest backdrop-blur-md">
                                                            Ocupado
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* INFO PANEL */}
                                                <div className="p-6 bg-white/[0.02] border-t border-white/5 group-hover:bg-neon-red/5 transition-colors">
                                                    <div className="flex justify-between items-end">
                                                        <div className="min-w-0 flex-1">
                                                            <span className="text-[11px] font-black text-white uppercase block mb-1 truncate group-hover:text-neon-red transition-colors">{asset.title}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[8px] text-neon-red font-black uppercase tracking-widest">{asset.type}</span>
                                                                <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                                                <span className="text-[8px] text-gray-500 font-bold uppercase tabular-nums">{asset.w}x{asset.h} BLOCO</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-600 group-hover:bg-neon-red group-hover:text-white transition-all shadow-inner">
                                                            <RightIcon size={14} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Hover Glow Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-neon-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            </motion.div>
                                        );
                                    })}
                                
                                {availableAssets.filter(a => (selectedAssetId || 'kpi') === a.type || ((selectedAssetId || 'kpi') === 'charts' && a.type === 'charts')).length === 0 && (
                                    <div className="col-span-3 py-20 text-center opacity-20">
                                        <Library size={64} className="mx-auto mb-4" />
                                        <p className="text-sm font-black uppercase tracking-[0.4em]">Nenhum ativo nesta categoria</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center relative z-10">
                            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                                Os ativos exibidos são baseados nas suas publicações no Designer de Ativos.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </>
  );
}

function CleanAsset({ item, type, icon: Icon, isSelected, onSelect }: any) {
  return (
    <div 
      onClick={(e) => { e.stopPropagation(); onSelect(item.id); }}
      style={{ gridColumn: `${item.x} / span ${item.w}`, gridRow: `${item.y} / span ${item.h}` }}
      className={`relative group border flex flex-col items-center justify-center pointer-events-auto transition-all duration-500 cursor-pointer p-4 rounded-[32px] overflow-hidden
        ${isSelected 
            ? 'bg-[var(--input-bg)] border-neon-red shadow-[0_0_50px_rgba(255,45,85,0.25)] z-50 -translate-y-1' 
            : 'bg-[var(--card-bg)] border-[var(--card-border)] hover:border-[var(--neon-red)] hover:bg-[var(--input-bg)] shadow-lg'}
      `}
    >
        {/* Subtle Inner Glow */}
        {isSelected && <div className="absolute inset-0 bg-gradient-to-br from-neon-red/10 to-transparent opacity-50" />}
        
        <div className={`flex items-center gap-3 overflow-hidden w-full relative z-10 ${item.h === 1 ? 'flex-row px-2' : 'flex-col text-center'}`}>
            <div className={`rounded-2xl transition-all duration-500 flex-shrink-0 flex items-center justify-center ${item.h === 1 ? 'p-2' : 'p-3'} ${isSelected ? 'bg-neon-red/20 shadow-[0_0_15px_rgba(255,45,85,0.4)]' : 'bg-[var(--input-bg)] border border-[var(--card-border)]'}`}>
                <Icon size={item.h === 1 ? 16 : 22} className={isSelected ? 'text-neon-red' : 'text-[var(--text-secondary)]'} />
            </div>
            <div className={`flex flex-col gap-0.5 min-w-0 ${item.h === 1 ? 'items-start flex-1' : 'items-center w-full'}`}>
                <span className={`font-black uppercase tracking-widest text-[var(--foreground)] truncate w-full ${item.h === 1 ? 'text-[9px]' : 'text-[10px]'}`}>
                    {item.title}
                </span>
                {item.h > 1 && (
                    <span className="text-[7px] font-black text-neon-red/50 uppercase tracking-[0.3em] mt-1">
                        {type === 'cards' ? 'Metric' : type === 'charts' ? 'Visual' : 'System'}
                    </span>
                )}
            </div>
        </div>

        {/* Decorative corner accent */}
        {isSelected && (
            <div className="absolute top-0 right-0 w-8 h-8 bg-neon-red/20 rounded-bl-3xl flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-neon-red rounded-full animate-pulse shadow-[0_0_8px_#ff2d55]" />
            </div>
        )}
    </div>
  );
}
