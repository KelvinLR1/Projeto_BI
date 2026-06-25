"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { fetchWithCache, clearCache } from '@/utils/api';
import Link from 'next/link';
import KpiCard from '@/components/BI/KpiCard';
import { useAlerts } from '@/context/AlertContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  BarChart, 
  LineChart as LineIcon, 
  PieChart as PieIcon, 
  Database, 
  RefreshCcw,
  LayoutDashboard,
  Save,
  Library,
  Trash2,
  Trophy,
  ListOrdered,
  Zap,
  Target,
  Eye,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Info,
  Bell,
  Layers,
  Search
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import SafeResponsiveContainer from '@/components/BI/SafeResponsiveContainer';

export default function DesignerPage() {
  const { isSidebarTransitioning } = useAlerts();
  const [activeTab, setActiveTab] = useState<"charts" | "kpis" | "components">("charts");
  const [scripts, setScripts] = useState<any[]>([]);
  const [savedAssets, setSavedAssets] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // CHART CONFIG
  const [chartName, setChartName] = useState("");
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "ranking">("bar");
  const [xAxis, setXAxis] = useState("");
  const [selectedYAxes, setSelectedYAxes] = useState<string[]>([]);
  const [targetPageChart, setTargetPageChart] = useState<"home" | "noc">("home");

  // KPI CONFIG
  const [kpiTitle, setKpiTitle] = useState("");
  const [kpiMode, setKpiMode] = useState<"monitoring" | "info">("monitoring");
  const [selectedKpiColumn, setSelectedKpiColumn] = useState("");
  const [thresholdSuccess, setThresholdSuccess] = useState(100000);
  const [thresholdWarning, setThresholdWarning] = useState(50000);
  const [targetPageKpi, setTargetPageKpi] = useState<"home" | "noc">("home");

  // COMPONENT CONFIG (ALERTS / REPORT)
  const [compType, setCompType] = useState<"alerts" | "report">("alerts");
  const [compTitle, setCompTitle] = useState("");
  const [compScriptId, setCompScriptId] = useState("");
  const [targetPageComp, setTargetPageComp] = useState<"home" | "noc">("noc");

  const processedChartData = useMemo(() => {
    if (!rawData.length || !xAxis || !selectedYAxes.length) return [];
    const agg: Record<string, any> = {};
    rawData.forEach(row => {
        const key = String(row[xAxis] || "N/A");
        if (!agg[key]) {
            agg[key] = { [xAxis]: key };
            selectedYAxes.forEach(y => agg[key][y] = 0);
        }
        selectedYAxes.forEach(y => {
            const val = parseFloat(row[y]) || 0;
            agg[key][y] += val;
        });
    });
    let result = Object.values(agg);
    if (chartType === "ranking") result = result.sort((a, b) => (b[selectedYAxes[0]] || 0) - (a[selectedYAxes[0]] || 0));
    return result;
  }, [rawData, xAxis, selectedYAxes, chartType]);

  // FILTERED ASSETS FOR SIDEBAR
  const filteredAssets = useMemo(() => {
    if (activeTab === 'charts') return savedAssets.filter(a => a.type === 'charts');
    if (activeTab === 'kpis') return savedAssets.filter(a => a.type === 'kpi');
    if (activeTab === 'components') return savedAssets.filter(a => a.type === 'components');
    return [];
  }, [savedAssets, activeTab]);

  const loadScripts = async () => {
    try {
        await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts', undefined, (data) => {
          setScripts(Array.isArray(data) ? data : []);
        });
    } catch (e) { setScripts([]); }
  };

  const loadAssets = async () => {
    try {
        await fetchWithCache<any[]>('http://127.0.0.1:8000/api/library', undefined, (data) => {
          setSavedAssets(Array.isArray(data) ? data : []);
        });
    } catch (e) { setSavedAssets([]); }
  };

  useEffect(() => {
    loadScripts();
    loadAssets();
  }, []);

  const handleScriptSelect = async (id: string, preserveConfig = false) => {
    setSelectedScriptId(id);
    const script = scripts.find(s => s.id === id);
    if (!script) return;
    setLoading(true);
    try {
      await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: script.query })
      }, (result) => {
        setRawData(result);
        if (result.length > 0 && !preserveConfig) {
          const keys = Object.keys(result[0]);
          if (activeTab === 'charts') { setXAxis(keys[0] || ""); setSelectedYAxes([keys[1] || ""]); }
          else { setSelectedKpiColumn(keys[0]); }
        }
      });
    } finally { setLoading(false); }
  };

  const handleEditAsset = async (asset: any) => {
    setEditingId(asset.id);
    if (asset.type === 'charts') {
        setActiveTab('charts');
        setChartName(asset.title);
        setChartType(asset.chartType);
        setXAxis(asset.xAxis);
        setSelectedYAxes(asset.yAxes);
        setTargetPageChart(asset.page);
        await handleScriptSelect(asset.script_id, true);
    } else if (asset.type === 'kpi') {
        setActiveTab('kpis');
        setKpiTitle(asset.title);
        setKpiMode(asset.kpi_mode || "monitoring");
        setSelectedKpiColumn(asset.column);
        setThresholdSuccess(asset.threshold_success);
        setThresholdWarning(asset.threshold_warning);
        setTargetPageKpi(asset.page);
        await handleScriptSelect(asset.script_id, true);
    } else {
        setActiveTab('components');
        setCompTitle(asset.title);
        setCompType(asset.compType || 'alerts');
        setTargetPageComp(asset.page);
        if (asset.compType === 'report' && asset.script_id) {
            setCompScriptId(asset.script_id);
            await handleScriptSelect(asset.script_id, true);
        } else {
            setCompScriptId("");
        }
    }
  };

  const syncAssetToLayout = async ({ id, type, page, data }: { id: string, type: 'cards' | 'charts' | 'components', page: 'home' | 'noc', data: any }) => {
    const targetPages: ('home' | 'noc')[] = ['home', 'noc'];
    
    for (const pageName of targetPages) {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/layouts/${pageName}`);
        if (!res.ok) continue;
        const layout = await res.json();
        
        if (!layout.cards) layout.cards = [];
        if (!layout.charts) layout.charts = [];
        if (!layout.components) layout.components = [];
        
        let changed = false;
        
        if (pageName === page) {
          const index = layout[type].findIndex((i: any) => i.id === id);
          if (index !== -1) {
            const existing = layout[type][index];
            layout[type][index] = { 
              ...existing, 
              ...data,
              x: existing.x || data.x || 1,
              y: existing.y || data.y || 1,
              w: existing.w || data.w || 3,
              h: existing.h || data.h || 1
            };
          } else {
            layout[type].push({
              ...data,
              x: data.x || 1,
              y: data.y || 1
            });
          }
          changed = true;
        } else {
          const index = layout[type].findIndex((i: any) => i.id === id);
          if (index !== -1) {
            layout[type] = layout[type].filter((i: any) => i.id !== id);
            changed = true;
          }
        }
        
        if (changed) {
          await fetch(`http://127.0.0.1:8000/api/layouts/${pageName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layout)
          });
        }
      } catch (e) {
        console.error("Erro ao sincronizar layout para " + pageName, e);
      }
    }
    clearCache();
  };

  const handleDeleteAsset = async (e: React.MouseEvent, asset: any) => {
    e.stopPropagation();
    if (!confirm(`Excluir "${asset.title}"?`)) return;
    
    await fetch(`http://127.0.0.1:8000/api/library/${asset.id}`, { method: 'DELETE' });
    
    const typeMap: Record<string, string> = {
      'charts': 'charts',
      'kpi': 'cards',
      'components': 'components'
    };
    const layoutType = typeMap[asset.type] || 'components';
    
    for (const pageName of ['home', 'noc']) {
      try {
        const layoutRes = await fetch(`http://127.0.0.1:8000/api/layouts/${pageName}`);
        if (layoutRes.ok) {
          const layout = await layoutRes.json();
          if (layout && layout[layoutType]) {
            const initialLen = layout[layoutType].length;
            layout[layoutType] = layout[layoutType].filter((i: any) => i.id !== asset.id);
            if (layout[layoutType].length !== initialLen) {
              await fetch(`http://127.0.0.1:8000/api/layouts/${pageName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(layout)
              });
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    clearCache();
    loadAssets();
  };

  const handleSaveChart = async () => {
    if (!chartName || !selectedScriptId || !xAxis || !selectedYAxes.length) return alert("Preencha tudo!");
    const id = editingId || `chart-${Date.now()}`;
    const page = targetPageChart;
    const config = { 
        id, 
        type: 'charts', 
        title: chartName, 
        script_id: selectedScriptId, 
        chartType, 
        xAxis, 
        yAxes: selectedYAxes, 
        w: 6, h: 4,
        page
    };
    await fetch('http://127.0.0.1:8000/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    await syncAssetToLayout({ id, type: 'charts', page, data: config });
    alert("Gráfico Salvo!"); 
    setEditingId(null);
    loadAssets();
  };

  const handleSaveKpi = async () => {
    if (!kpiTitle || !selectedScriptId || !selectedKpiColumn) return alert("Preencha tudo!");
    const id = editingId || `kpi-${Date.now()}`;
    const page = targetPageKpi;
    const config = { 
        id, 
        type: 'kpi', 
        title: kpiTitle, 
        kpi_mode: kpiMode, 
        script_id: selectedScriptId, 
        column: selectedKpiColumn, 
        threshold_success: thresholdSuccess, 
        threshold_warning: thresholdWarning, 
        w: 3, h: 1,
        page
    };
    await fetch('http://127.0.0.1:8000/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    await syncAssetToLayout({ id, type: 'cards', page, data: config });
    alert("KPI Salvo!"); 
    setEditingId(null);
    loadAssets();
  };

  const handleSaveComp = async () => {
    if (!compTitle) return alert("Dê um título!");
    if (compType === 'report' && !compScriptId) return alert("Escolha uma fonte de dados para o relatório!");
    const id = editingId || `comp-${Date.now()}`;
    const page = targetPageComp;
    const config: any = { 
        id, 
        type: 'components', 
        compType: compType, 
        title: compTitle, 
        w: compType === 'report' ? 6 : 4, h: 4,
        page
    };
    if (compType === 'report') config.script_id = compScriptId;
    await fetch('http://127.0.0.1:8000/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
    await syncAssetToLayout({ id, type: 'components', page, data: config });
    alert("Componente Salvo!"); 
    setEditingId(null);
    loadAssets();
  };

  const COLORS = ['#ff2d55', '#00ff88', '#ffb700', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

  const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

  const RankingPreview = ({ data, nameKey, valueKey }: { data: any[], nameKey: string, valueKey: string }) => {
    const top = data.slice(0, 8);
    const maxVal = Math.max(...top.map(d => parseFloat(d[valueKey]) || 0), 1);
    return (
      <div className="w-full h-full overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {top.map((row, idx) => {
          const val = parseFloat(row[valueKey]) || 0;
          const pct = (val / maxVal) * 100;
          const color = idx < 3 ? MEDAL_COLORS[idx] : COLORS[idx % COLORS.length];
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3, ease: 'easeOut' }}
              className="group"
            >
              {/* Name row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-black w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, color }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-black text-[var(--foreground)] uppercase tracking-wide truncate max-w-[140px]">
                    {String(row[nameKey])}
                  </span>
                </div>
                <span className="text-[10px] font-black tabular-nums" style={{ color }}>
                  {val.toLocaleString('pt-BR')}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-[var(--input-bg)] overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ delay: idx * 0.05 + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const DonutPreview = ({ data, nameKey, valueKey }: { data: any[], nameKey: string, valueKey: string }) => {
    const top = data.slice(0, 7);
    const vals = top.map(d => Math.abs(parseFloat(d[valueKey]) || 0));
    const total = vals.reduce((a, b) => a + b, 0) || 1;
    const SIZE = 160;
    const STROKE = 28;
    const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;
    let offset = 0;
    const slices = top.map((row, i) => {
      const pct = vals[i] / total;
      const dash = pct * CIRC;
      const gap = CIRC - dash;
      const slice = { offset, dash, gap, color: COLORS[i % COLORS.length], name: String(row[nameKey]), val: vals[i], pct };
      offset += dash;
      return slice;
    });
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-6">
        {/* SVG Donut */}
        <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="var(--card-border)" strokeWidth={STROKE} />
            {/* Slices */}
            {slices.map((s, i) => (
              <motion.circle
                key={i}
                cx={SIZE/2} cy={SIZE/2} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE - 4}
                strokeDasharray={`${s.dash - 3} ${s.gap + 3}`}
                strokeDashoffset={-s.offset}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${CIRC}` }}
                animate={{ strokeDasharray: `${s.dash - 3} ${s.gap + 3}` }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ filter: `drop-shadow(0 0 6px ${s.color}66)` }}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Total</span>
            <span className="text-lg font-black text-[var(--foreground)] tabular-nums">{total.toLocaleString('pt-BR')}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="w-full space-y-2 px-2">
          {slices.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 + 0.3, duration: 0.3 }}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                <span className="text-[10px] font-bold text-[var(--text-secondary)] truncate uppercase tracking-wide">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-black tabular-nums" style={{ color: s.color }}>{(s.pct * 100).toFixed(1)}%</span>
                <span className="text-[9px] text-[var(--text-secondary)] font-bold tabular-nums opacity-60">{s.val.toLocaleString('pt-BR')}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] mb-2 uppercase tracking-tighter italic">Designer de <span className="text-neon-red">Ativos</span></h1>
          <div className="flex gap-4">
              <button onClick={() => { setActiveTab("charts"); setEditingId(null); }} className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg transition-all ${activeTab === 'charts' ? 'bg-neon-red text-white' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] bg-[var(--input-bg)]'}`}>Gráficos</button>
              <button onClick={() => { setActiveTab("kpis"); setEditingId(null); }} className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg transition-all ${activeTab === 'kpis' ? 'bg-neon-red text-white' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] bg-[var(--input-bg)]'}`}>Métricas KPI</button>
              <button onClick={() => { setActiveTab("components"); setEditingId(null); }} className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg transition-all ${activeTab === 'components' ? 'bg-neon-red text-white' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)] bg-[var(--input-bg)]'}`}>Componentes NOC</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-3">
            <div className="glass-card flex flex-col h-[700px] border-[var(--card-border)] bg-[var(--card-bg)]">
                <div className="p-4 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Library size={16} className="text-neon-red" />
                        <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Publicados</span>
                    </div>
                    <span className="text-[10px] font-black bg-neon-red/10 text-neon-red px-2 py-0.5 rounded-full">{filteredAssets.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    <AnimatePresence mode="popLayout">
                        {filteredAssets.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-center p-8">
                                <Search size={32} className="text-gray-800 mb-4" />
                                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-relaxed">Nenhum ativo nesta categoria ainda.</p>
                            </motion.div>
                        ) : (
                             filteredAssets.map(c => (
                                <motion.div 
                                    key={`${c.page}-${c.id}`} 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: 10 }}
                                    onClick={() => handleEditAsset(c)} 
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${editingId === c.id ? "bg-neon-red/10 border-neon-red" : "bg-[var(--input-bg)] border-[var(--card-border)] hover:bg-[var(--card-bg)] hover:shadow-md"}`}
                                >
                                    <button onClick={(e) => handleDeleteAsset(e, c)} className="absolute top-3 right-3 p-1.5 bg-black/40 text-gray-500 hover:text-critical rounded-lg opacity-0 group-hover:opacity-100 transition-all border border-white/5"><Trash2 size={12} /></button>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${editingId === c.id ? 'bg-neon-red/20 border-neon-red' : 'bg-[var(--card-bg)] border-[var(--card-border)]'}`}>
                                            {activeTab === 'charts' ? <BarChart size={18} className={editingId === c.id ? 'text-neon-red' : 'text-[var(--text-secondary)]'} /> : activeTab === 'kpis' ? <Zap size={18} className={editingId === c.id ? 'text-neon-red' : 'text-[var(--text-secondary)]'} /> : <Bell size={18} className={editingId === c.id ? 'text-neon-red' : 'text-[var(--text-secondary)]'} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs font-black uppercase tracking-tight text-[var(--foreground)] block mb-0.5 truncate pr-6">{c.title}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black bg-[var(--card-border)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded uppercase">{c.page}</span>
                                                <span className="text-[8px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">{c.chartType || c.kpi_mode || c.type || 'ALERTA'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
         </div>

         <div className="lg:col-span-9">
            <AnimatePresence mode="wait">
                {activeTab === 'charts' && (
                    <motion.div key="charts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="glass-card p-8 border-neon-red/10 bg-[var(--card-bg)]">
                            <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-8 flex items-center gap-2"><Database size={16} className="text-neon-red" /> Configuração Gráfica</h3>
                            <div className="space-y-6">
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Fonte SQL</label><select value={selectedScriptId} onChange={(e) => handleScriptSelect(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50 transition-colors"><option value="">-- Escolha --</option>{scripts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Estilo</label><div className="grid grid-cols-4 gap-2">{[{ id: "bar", icon: BarChart }, { id: "line", icon: LineIcon }, { id: "pie", icon: PieIcon }, { id: "ranking", icon: ListOrdered }].map(t => (<button key={t.id} onClick={() => setChartType(t.id as any)} className={`p-3 rounded-xl border flex justify-center transition-all ${chartType === t.id ? "bg-neon-red/20 border-neon-red text-white" : "bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-neon-red/30"}`}><t.icon size={18} /></button>))}</div></div>
                                {rawData.length > 0 && (<div className="space-y-6"><div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Eixo X</label><select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50">{Object.keys(rawData[0]).map(k => <option key={k} value={k}>{k}</option>)}</select></div><div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Métricas</label><div className="space-y-2">{Object.keys(rawData[0]).filter(k => k !== xAxis).map(k => (<label key={k} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all ${selectedYAxes.includes(k) ? 'bg-neon-red/10 border-neon-red/40' : 'bg-[var(--input-bg)] border-[var(--card-border)] hover:bg-[var(--card-bg)]'}`}><input type="checkbox" checked={selectedYAxes.includes(k)} onChange={() => setSelectedYAxes(prev => prev.includes(k) ? prev.filter(y => y !== k) : [...prev, k])} className="accent-neon-red w-4 h-4" /><span className={`text-[10px] font-black uppercase ${selectedYAxes.includes(k) ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'}`}>{k}</span></label>))}</div></div></div>)}
                                <div className="pt-6 border-t border-[var(--card-border)] space-y-4">
                                    <input type="text" value={chartName} onChange={(e) => setChartName(e.target.value)} placeholder="Título do Gráfico" className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50" />
                                    <select value={targetPageChart} onChange={(e) => setTargetPageChart(e.target.value as any)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none"><option value="home">Dashboard Principal</option><option value="noc">Página de Monitoramento</option></select>
                                    <button onClick={handleSaveChart} className="w-full bg-neon-red text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-neon-red/20 flex items-center justify-center gap-2"><Save size={16} /> {editingId ? 'Atualizar Ativo' : 'Publicar Gráfico'}</button>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-8 bg-[var(--card-bg)] border-[var(--card-border)] flex flex-col shadow-sm"><h3 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter italic mb-8">Preview</h3><div className="flex-1 w-full bg-[var(--background)] rounded-3xl p-6 border border-[var(--card-border)] shadow-inner">{processedChartData.length > 0 ? (chartType === 'ranking' && selectedYAxes.length > 0 ? (<RankingPreview data={processedChartData} nameKey={xAxis} valueKey={selectedYAxes[0]} />) : chartType === 'pie' && selectedYAxes.length > 0 ? (<DonutPreview data={processedChartData} nameKey={xAxis} valueKey={selectedYAxes[0]} />) : (<SafeResponsiveContainer width="100%" height="100%" minWidth={0} debounce={isSidebarTransitioning ? 1000 : 150}>{chartType === 'bar' ? (<ReBarChart data={processedChartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} /><XAxis dataKey={xAxis} stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--neon-red)", borderRadius: "12px", color: "var(--foreground)" }} />{selectedYAxes.map((y, i) => <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />)}</ReBarChart>) : (<ReLineChart data={processedChartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} /><XAxis dataKey={xAxis} stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} /><YAxis stroke="var(--text-secondary)" fontSize={10} tickLine={false} axisLine={false} /><Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--neon-red)", borderRadius: "12px", color: "var(--foreground)" }} />{selectedYAxes.map((y, i) => <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 4 }} />)}</ReLineChart>)}</SafeResponsiveContainer>)) : (<div className="h-full flex items-center justify-center opacity-10"><BarChart size={100} className="text-[var(--foreground)]" /></div>)}</div></div>
                    </motion.div>
                )}

                {activeTab === 'kpis' && (
                    <motion.div key="kpis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-card p-8 border-neon-red/10 bg-[var(--card-bg)]">
                            <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-8 flex items-center gap-2"><Zap size={16} className="text-neon-red" /> Configuração KPI</h3>
                            <div className="space-y-6">
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Nome da Métrica</label><input type="text" value={kpiTitle} onChange={(e) => setKpiTitle(e.target.value)} placeholder="Ex: Vendas Totais" className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50" /></div>
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Modo</label><div className="grid grid-cols-2 gap-4"><button onClick={() => setKpiMode("monitoring")} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${kpiMode === 'monitoring' ? 'bg-neon-red/20 border-neon-red text-white' : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)]'}`}><Zap size={18} /><span className="text-[9px] font-black uppercase">Monitoramento</span></button><button onClick={() => setKpiMode("info")} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${kpiMode === 'info' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)]'}`}><Info size={18} /><span className="text-[9px] font-black uppercase">Informativo</span></button></div></div>
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Fonte SQL</label><select value={selectedScriptId} onChange={(e) => handleScriptSelect(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50"><option value="">-- Escolha --</option>{scripts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                {rawData.length > 0 && (<div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Coluna Valor</label><select value={selectedKpiColumn} onChange={(e) => setSelectedKpiColumn(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50">{Object.keys(rawData[0]).map(k => <option key={k} value={k}>{k}</option>)}</select></div>)}
                                {kpiMode === 'monitoring' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest flex items-center gap-1">
                                                <span className="inline-block w-2 h-2 rounded-full bg-success"></span> Valor de Sucesso
                                            </label>
                                            <input
                                                type="number"
                                                value={thresholdSuccess}
                                                onChange={(e) => setThresholdSuccess(Number(e.target.value))}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-success/50 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest flex items-center gap-1">
                                                <span className="inline-block w-2 h-2 rounded-full bg-warning"></span> Valor de Alerta
                                            </label>
                                            <input
                                                type="number"
                                                value={thresholdWarning}
                                                onChange={(e) => setThresholdWarning(Number(e.target.value))}
                                                className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-warning/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="pt-6 border-t border-[var(--card-border)] space-y-4">
                                    <select value={targetPageKpi} onChange={(e) => setTargetPageKpi(e.target.value as any)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50"><option value="home">Dashboard Principal</option><option value="noc">Página de Monitoramento</option></select>
                                    <button onClick={handleSaveKpi} className="w-full bg-neon-red text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-neon-red/20 flex items-center justify-center gap-2"><Save size={16} /> {editingId ? 'Atualizar Ativo' : 'Publicar KPI'}</button>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-8 bg-[var(--card-bg)] border-[var(--card-border)] flex flex-col items-center justify-center shadow-sm"><h3 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter italic mb-8">Preview</h3><div className="w-full max-w-sm"><KpiCard title={kpiTitle || "Métrica"} value={rawData.length > 0 ? (rawData[0][selectedKpiColumn] || 0) : "0"} trend={kpiMode === 'info' ? 0 : 12.5} status={kpiMode === 'info' ? 'info' : 'success'} sparkData={[10, 20, 15, 30, 25, 40, 35]} w={3} h={1} /></div></div>
                    </motion.div>
                )}

                {activeTab === 'components' && (
                    <motion.div key="components" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="glass-card p-8 border-neon-red/10 bg-[var(--card-bg)]">
                            <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-8 flex items-center gap-2"><Bell size={16} className="text-neon-red" /> Componente Dashboard</h3>
                            <div className="space-y-6">
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Tipo de Componente</label><div className="grid grid-cols-2 gap-4"><button onClick={() => setCompType("alerts")} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${compType === 'alerts' ? 'bg-neon-red/20 border-neon-red text-white' : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)]'}`}><AlertCircle size={18} /><span className="text-[9px] font-black uppercase">Alertas</span></button><button onClick={() => setCompType("report")} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${compType === 'report' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)]'}`}><Database size={18} /><span className="text-[9px] font-black uppercase">Relatório (Tabela)</span></button></div></div>
                                <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Título do Componente</label><input type="text" value={compTitle} onChange={(e) => setCompTitle(e.target.value)} placeholder="Ex: Central de Alertas NOC" className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50" /></div>
                                {compType === 'report' && (
                                    <div><label className="block text-[9px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">Fonte SQL</label><select value={compScriptId} onChange={(e) => {setCompScriptId(e.target.value); handleScriptSelect(e.target.value);}} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50"><option value="">-- Escolha --</option>{scripts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                )}
                                <div className="pt-6 border-t border-[var(--card-border)] space-y-4">
                                    <select value={targetPageComp} onChange={(e) => setTargetPageComp(e.target.value as any)} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-xs text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50"><option value="noc">Página de Monitoramento</option><option value="home">Dashboard Principal</option></select>
                                    <button onClick={handleSaveComp} className="w-full bg-neon-red text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-neon-red/20 flex items-center justify-center gap-2"><Save size={16} /> {editingId ? 'Atualizar Ativo' : 'Publicar Componente'}</button>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card p-8 bg-[var(--card-bg)] border-[var(--card-border)] flex flex-col shadow-sm"><h3 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter italic mb-8">Preview do Componente</h3><div className="flex-1 bg-[var(--background)] rounded-3xl border border-[var(--card-border)] p-6 flex flex-col gap-4 shadow-inner"><div className="flex items-center gap-2 text-neon-red mb-2">{compType === 'alerts' ? <AlertCircle size={18} /> : <Database size={18} />}<span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">{compTitle || (compType === 'alerts' ? 'CENTRAL DE ALERTAS' : 'RELATÓRIO DE DADOS')}</span></div><div className="space-y-3 opacity-30">{compType === 'alerts' ? [1,2,3].map(i => (<div key={i} className="p-3 bg-[var(--input-bg)] rounded-xl border border-[var(--card-border)]"><div className="h-2 w-24 bg-[var(--text-secondary)] rounded mb-2 opacity-50" /><div className="h-1.5 w-full bg-[var(--card-border)] rounded" /></div>)) : <div className="w-full h-32 rounded-xl border border-[var(--card-border)] border-dashed flex items-center justify-center"><span className="text-[10px] font-bold tracking-widest uppercase text-[var(--text-secondary)]">Grid de Dados</span></div>}</div></div></div>
                    </motion.div>
                )}
            </AnimatePresence>
         </div>
      </div>
    </>
  );
}
