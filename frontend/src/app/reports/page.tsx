"use client";

import React, { useEffect, useState, useMemo } from 'react';
import BILayout from '@/components/BI/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FileText, 
  LayoutList,
  Database,
  ArrowLeftRight,
  Filter
} from 'lucide-react';

export default function ReportsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedSubgroups, setExpandedSubgroups] = useState<string[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/scripts')
      .then(res => res.json())
      .then(data => {
        const visible = data.filter((s: any) => s.show_in_reports !== false);
        setScripts(visible);
      });
  }, []);

  const hierarchicalData = useMemo(() => {
    const groups: any = {};
    scripts.forEach(s => {
        const g = s.group || "Geral";
        const sg = s.subgroup || "Geral";
        if (!groups[g]) groups[g] = {};
        if (!groups[g][sg]) groups[g][sg] = [];
        groups[g][sg].push(s);
    });
    return groups;
  }, [scripts]);

  const handleSelectScript = async (script: any) => {
    setSelectedScript(script);
    setLoading(true);
    setReportData([]);
    try {
      const res = await fetch('http://localhost:8000/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: script.query })
      });
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => prev.includes(g) ? prev.filter(i => i !== g) : [...prev, g]);
  };

  const toggleSubgroup = (sg: string) => {
    setExpandedSubgroups(prev => prev.includes(sg) ? prev.filter(i => i !== sg) : [...prev, sg]);
  };

  return (
    <BILayout>
      <div className="flex h-[calc(100vh-48px)] gap-6">
        {/* Hierarchical Sidebar */}
        <div className="w-80 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black text-[var(--foreground)] uppercase italic tracking-tighter">Hub de <span className="text-neon-red">Relatórios</span></h1>
                <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em]">Exploração de Dados Estruturada</p>
            </div>

            <div className="glass-card flex-1 flex flex-col overflow-hidden border-[var(--card-border)]">
                <div className="p-4 bg-[var(--input-bg)] border-b border-[var(--card-border)] relative">
                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={14} />
                    <input 
                        type="text" 
                        placeholder="BUSCAR RELATÓRIO..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl py-2 pl-10 pr-4 text-[10px] font-black tracking-widest outline-none focus:border-neon-red/50 transition-all uppercase text-[var(--foreground)] placeholder:text-[var(--text-secondary)]"
                    />
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {Object.entries(hierarchicalData).map(([group, subgroups]: [string, any]) => (
                        <div key={group} className="space-y-1">
                            <button 
                                onClick={() => toggleGroup(group)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--input-bg)] transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Folder size={16} className={expandedGroups.includes(group) ? "text-neon-red" : "text-[var(--text-secondary)]"} />
                                    <span className={`text-xs font-black uppercase tracking-widest ${expandedGroups.includes(group) ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"}`}>{group}</span>
                                </div>
                                {expandedGroups.includes(group) ? <ChevronDown size={14} className="text-[var(--text-secondary)]" /> : <ChevronRight size={14} className="text-[var(--text-secondary)]" />}
                            </button>

                            <AnimatePresence>
                                {expandedGroups.includes(group) && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden ml-4 border-l border-[var(--card-border)] space-y-1"
                                    >
                                        {Object.entries(subgroups).map(([subgroup, reports]: [string, any]) => (
                                            <div key={subgroup}>
                                                <button 
                                                    onClick={() => toggleSubgroup(`${group}-${subgroup}`)}
                                                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--input-bg)] transition-all"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Folder size={14} className={expandedSubgroups.includes(`${group}-${subgroup}`) ? "text-neon-red/70" : "text-[var(--text-secondary)] opacity-50"} />
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${expandedSubgroups.includes(`${group}-${subgroup}`) ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"}`}>{subgroup}</span>
                                                    </div>
                                                </button>

                                                {expandedSubgroups.includes(`${group}-${subgroup}`) && (
                                                    <div className="ml-4 border-l border-[var(--card-border)] mt-1 space-y-1">
                                                        {reports.map((s: any) => (
                                                            <button 
                                                                key={s.id}
                                                                onClick={() => handleSelectScript(s)}
                                                                className={`w-full text-left p-2 rounded-lg text-[11px] font-medium transition-all flex items-center gap-2 ${selectedScript?.id === s.id ? "bg-neon-red/10 text-[var(--foreground)] border-l-2 border-neon-red" : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]"}`}
                                                            >
                                                                <FileText size={12} className={selectedScript?.id === s.id ? "text-neon-red" : "text-[var(--text-secondary)] opacity-50"} />
                                                                {s.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Report Content */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[var(--input-bg)] rounded-2xl flex items-center justify-center border border-[var(--card-border)]">
                        <LayoutList size={24} className="text-neon-red" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[var(--foreground)] uppercase tracking-tighter">
                            {selectedScript ? selectedScript.name : "Selecione um Relatório"}
                        </h2>
                        {selectedScript && (
                            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                                {selectedScript.group} › {selectedScript.subgroup}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-[var(--card-bg)] border border-[var(--card-border)] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-all">
                        <Filter size={16} /> Filtros
                    </button>
                    <button className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neon-red hover:text-white transition-all shadow-xl">
                        <FileDown size={16} /> Exportar
                    </button>
                </div>
            </div>

            <div className="glass-card flex-1 flex flex-col overflow-hidden border-white/5">
                <div className="flex-1 overflow-auto bg-[var(--background)]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <div className="h-12 w-12 border-t-2 border-neon-red rounded-full animate-spin" />
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] animate-pulse">Processando Query...</span>
                        </div>
                    ) : selectedScript ? (
                        reportData.length > 0 ? (
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[var(--background)] text-[var(--text-secondary)] border-b border-[var(--card-border)] z-20">
                                    <tr>
                                        {Object.keys(reportData[0]).map(k => (
                                            <th key={k} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">{k}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--card-border)]">
                                    {reportData.map((row, i) => (
                                        <tr key={i} className="hover:bg-[var(--input-bg)] group transition-colors">
                                            {Object.values(row).map((v: any, j) => (
                                                <td key={j} className="px-6 py-4 text-xs text-[var(--text-secondary)] group-hover:text-[var(--foreground)] font-medium truncate max-w-[200px]">
                                                    {String(v)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700 gap-4">
                                <ArrowLeftRight size={48} className="opacity-20" />
                                <span className="text-xs font-black uppercase tracking-widest opacity-50">Nenhum dado retornado para esta consulta</span>
                            </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--text-secondary)] gap-6 opacity-30">
                            <div className="relative">
                                <Database size={80} className="opacity-10" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Search size={32} className="text-neon-red opacity-40 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-black text-[var(--foreground)] opacity-40 uppercase tracking-widest">Navegação por Árvore Ativa</h3>
                                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-2">Selecione um item no menu lateral para visualizar</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </BILayout>
  );
}
