"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BILayout from '@/components/BI/Layout';
import KpiCard from '@/components/BI/KpiCard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  Save, 
  LayoutDashboard, 
  Target, 
  TrendingUp, 
  Zap,
  ChevronRight,
  AlertCircle,
  Eye,
  RefreshCcw
} from 'lucide-react';

export default function KpiDesignerPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState("");
  const [dataColumns, setDataColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  // KPI Config
  const [title, setTitle] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [thresholdSuccess, setThresholdSuccess] = useState(100000);
  const [thresholdWarning, setThresholdWarning] = useState(50000);
  const [targetPage, setTargetPage] = useState<"home" | "noc">("home");

  // Preview State
  const [previewValue, setPreviewValue] = useState("0");
  const [previewTrend, setPreviewTrend] = useState(0);

  useEffect(() => {
    fetch('http://localhost:8000/api/scripts')
      .then(res => res.json())
      .then(data => setScripts(Array.isArray(data) ? data : []));
  }, []);

  const handleScriptSelect = async (id: string) => {
    setSelectedScriptId(id);
    const script = scripts.find(s => s.id === id);
    if (!script) {
        setDataColumns([]);
        return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: script.query })
      });
      const result = await res.json();
      if (result.length > 0) {
        const keys = Object.keys(result[0]);
        setDataColumns(keys);
        setSelectedColumn(keys[0]);
        
        const val = parseFloat(result[0][keys[0]]) || 0;
        setPreviewValue(val.toString());
        setPreviewTrend(12.5);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKpi = async () => {
    if (!title || !selectedScriptId || !selectedColumn) {
        return alert("Preencha o título, selecione o script e a coluna do valor!");
    }

    const currentLayout = await fetch(`http://localhost:8000/api/layouts/${targetPage}`).then(res => res.json());
    const layoutObj = Array.isArray(currentLayout) ? { cards: currentLayout, charts: [] } : currentLayout;
    if (!layoutObj.cards) layoutObj.cards = [];

    const newKpiConfig = {
        id: `kpi-${Date.now()}`,
        title: title,
        script_id: selectedScriptId,
        column: selectedColumn,
        threshold_success: thresholdSuccess,
        threshold_warning: thresholdWarning,
        x: 1, y: 1, w: 3, h: 1
    };

    layoutObj.cards.push(newKpiConfig);

    await fetch(`http://localhost:8000/api/layouts/${targetPage}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(layoutObj)
    });

    alert(`KPI "${title}" publicado com sucesso! Vá em 'Layout e Grade' para posicioná-lo.`);
    setTitle("");
  };

  const getPreviewStatus = () => {
    const val = parseFloat(previewValue);
    if (val >= thresholdSuccess) return "success";
    if (val >= thresholdWarning) return "warning";
    return "critical";
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
        case "success": return "SUCESSO";
        case "warning": return "ATENÇÃO";
        case "critical": return "CRÍTICO";
        default: return "AGUARDANDO";
    }
  };

  return (
    <BILayout>
      <div className="mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-[var(--foreground)] mb-2 tracking-tighter uppercase italic">Designer de <span className="text-neon-red">Métricas KPI</span></h1>
          <p className="text-[var(--text-secondary)] font-bold text-xs uppercase tracking-widest">Configuração visual de metas e indicadores de performance.</p>
        </div>
        <div className="flex gap-4">
            <Link href="/designer">
                <button className="bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] px-6 py-3 rounded-2xl border border-[var(--card-border)] flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest">
                    Designer de Gráficos <ChevronRight size={14} />
                </button>
            </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-8">
            <div className="glass-card p-8 border-neon-red/10 bg-[var(--card-bg)] h-full">
                <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                    <Zap size={16} className="text-neon-red" /> Configuração Global
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">1. Nome da Métrica</label>
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex: Faturamento Bruto"
                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">2. Dataset (Script SQL)</label>
                        <select 
                            value={selectedScriptId}
                            onChange={(e) => handleScriptSelect(e.target.value)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50 appearance-none cursor-pointer"
                        >
                            <option value="">-- Selecione o Script --</option>
                            {scripts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>

                    <AnimatePresence>
                        {dataColumns.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">3. Coluna do Valor</label>
                                <select 
                                    value={selectedColumn}
                                    onChange={(e) => setSelectedColumn(e.target.value)}
                                    className="w-full bg-neon-red/10 border border-neon-red/20 rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-bold outline-none focus:border-neon-red/50 appearance-none cursor-pointer"
                                >
                                    {dataColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="pt-8 border-t border-[var(--card-border)] space-y-6">
                        <h4 className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest flex items-center gap-2">
                            <Target size={14} className="text-neon-red" /> 4. Regras de Cores (Metas)
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="group">
                                <label className="block text-[9px] font-black text-success uppercase mb-2 group-hover:translate-x-1 transition-transform">Sucesso (Verde) ≥</label>
                                <input 
                                    type="number" 
                                    value={thresholdSuccess}
                                    onChange={(e) => setThresholdSuccess(Number(e.target.value))}
                                    className="w-full bg-success/5 border border-success/20 rounded-xl px-4 py-3 text-xs text-success font-black outline-none focus:bg-success/10 transition-all"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[9px] font-black text-warning uppercase mb-2 group-hover:translate-x-1 transition-transform">Atenção (Amarelo) ≥</label>
                                <input 
                                    type="number" 
                                    value={thresholdWarning}
                                    onChange={(e) => setThresholdWarning(Number(e.target.value))}
                                    className="w-full bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 text-xs text-warning font-black outline-none focus:bg-warning/10 transition-all"
                                />
                            </div>
                        </div>
                        <div className="bg-[var(--input-bg)] p-4 rounded-2xl border border-[var(--card-border)]">
                             <p className="text-[9px] text-[var(--text-secondary)] font-bold uppercase italic leading-relaxed">
                                <span className="text-critical">Lógica Crítica:</span> Qualquer valor abaixo de {thresholdWarning.toLocaleString('pt-BR')} será exibido em <span className="text-critical">Vermelho</span>.
                             </p>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-[var(--card-border)] space-y-4">
                        <label className="block text-[10px] font-black text-[var(--text-secondary)] mb-2 uppercase tracking-widest">5. Destino no Dashboard</label>
                        <select 
                            value={targetPage}
                            onChange={(e) => setTargetPage(e.target.value as any)}
                            className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-bold outline-none"
                        >
                            <option value="home">Página Principal (Home)</option>
                            <option value="noc">Monitoramento (NOC)</option>
                        </select>
                        <button 
                            onClick={handleSaveKpi}
                            className="w-full bg-[var(--foreground)] text-[var(--background)] font-black py-4 rounded-2xl text-xs uppercase tracking-widest hover:bg-neon-red hover:text-white transition-all shadow-xl flex items-center justify-center gap-3 group"
                        >
                            <Save size={18} className="group-hover:scale-110 transition-transform" /> Publicar Métrica
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="glass-card p-10 flex-1 flex flex-col bg-[var(--card-bg)] border-[var(--card-border)] relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-8 text-[var(--foreground)] opacity-5">
                    <TrendingUp size={120} />
                </div>
                
                <div className="mb-12 relative z-10 flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter italic flex items-center gap-3">
                            <Eye className="text-neon-red" /> Preview Dinâmico
                        </h3>
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-1">A visualização do card reflete sua configuração em tempo real</p>
                    </div>
                    {loading && <RefreshCcw className="animate-spin text-neon-red" size={20} />}
                </div>

                <div className="flex-1 flex items-center justify-center relative z-10">
                    <div className="w-full max-w-sm transform hover:scale-105 transition-transform duration-500">
                        <KpiCard 
                            title={title || "Nome da Métrica"}
                            value={previewValue}
                            trend={previewTrend}
                            status={getPreviewStatus()}
                            sparkData={[10, 20, 15, 30, 25, 40, 35, 30, 45, 50]}
                            w={3}
                            h={1}
                        />
                    </div>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-6 relative z-10">
                    <div className="p-6 bg-[var(--input-bg)] border border-[var(--card-border)] rounded-3xl">
                        <div className="flex items-center gap-4 text-[var(--text-secondary)] mb-4">
                            <AlertCircle size={18} className="text-neon-red" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Vínculos de Dados</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase opacity-70">Script Original</span>
                                <p className="text-xs font-bold text-[var(--foreground)] truncate">{selectedScriptId || "---"}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase opacity-70">Coluna Selecionada</span>
                                <p className="text-xs font-bold text-neon-red">{selectedColumn || "Aguardando Seleção..."}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-neon-red/5 border border-neon-red/10 rounded-3xl flex flex-col justify-center text-center">
                        <span className="text-[10px] font-black text-neon-red uppercase tracking-widest mb-2">Avaliação da Meta</span>
                        <div className="text-2xl font-black text-[var(--foreground)] uppercase italic">
                            {getStatusLabel(getPreviewStatus())}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </BILayout>
  );
}
