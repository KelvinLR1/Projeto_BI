"use client";

import React, { useState, useEffect, useMemo } from 'react';
import BILayout from '@/components/BI/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Play, 
    Save, 
    Database, 
    Table as TableIcon, 
    CheckCircle2, 
    FolderTree, 
    Eye, 
    EyeOff,
    ChevronDown,
    ChevronRight,
    Folder,
    FileCode
} from 'lucide-react';

export default function ScriptEditor() {
  const [query, setQuery] = useState("SELECT * FROM Sales_Detailed");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedScripts, setSavedScripts] = useState<any[]>([]);
  const [scriptName, setScriptName] = useState("");
  const [group, setGroup] = useState("Geral");
  const [subgroup, setSubgroup] = useState("Geral");
  const [showInReports, setShowInReports] = useState(true);
  
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedSubgroups, setExpandedSubgroups] = useState<string[]>([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/scripts').then(res => res.json()).then(setSavedScripts);
  }, []);

  const hierarchicalData = useMemo(() => {
    const groups: any = {};
    savedScripts.forEach(s => {
        const g = s.group || "Geral";
        const sg = s.subgroup || "Geral";
        if (!groups[g]) groups[g] = {};
        if (!groups[g][sg]) groups[g][sg] = [];
        groups[g][sg].push(s);
    });
    return groups;
  }, [savedScripts]);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!scriptName) return alert("Dê um nome ao script!");
    const res = await fetch('http://localhost:8000/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          name: scriptName, 
          query,
          group,
          subgroup,
          show_in_reports: showInReports
      })
    });
    const newScript = await res.json();
    setSavedScripts([...savedScripts, newScript]);
    setScriptName("");
    alert("Script salvo com sucesso!");
  };

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => prev.includes(g) ? prev.filter(i => i !== g) : [...prev, g]);
  };

  const toggleSubgroup = (sg: string) => {
    setExpandedSubgroups(prev => prev.includes(sg) ? prev.filter(i => i !== sg) : [...prev, sg]);
  };

  return (
    <BILayout>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter italic">Editor de <span className="text-neon-red">Scripts</span></h1>
          <p className="text-gray-400 font-medium">Extraia inteligência do banco de dados com queries SQL personalizadas.</p>
        </div>
        <div className="flex gap-4">
           <div className="flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
              <Database size={18} className="text-neon-red" />
              <span className="text-xs font-black tracking-widest uppercase">Cluster Alpha-1</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[750px]">
        {/* Editor Panel */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-card flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Console SQL</span>
               <button 
                  onClick={handleRun}
                  disabled={loading}
                  className="flex items-center gap-2 bg-neon-red px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,45,85,0.2)]"
               >
                 <Play size={14} fill="white" />
                 {loading ? "Processando..." : "Executar"}
               </button>
            </div>
            <textarea 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-[#050505] p-8 font-mono text-neon-red text-sm outline-none resize-none leading-relaxed"
              placeholder="SELECT * FROM Analytics..."
            />
          </div>

          {/* Results Preview */}
          <div className="glass-card h-80 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
               <TableIcon size={16} className="text-gray-500" />
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Dataset Resultante ({results.length} registros)</span>
            </div>
            <div className="flex-1 overflow-auto bg-[#0b0e14]">
               {results.length > 0 ? (
                 <table className="w-full text-[11px] text-left">
                   <thead className="sticky top-0 bg-[#161b22] text-gray-500 border-b border-white/5">
                     <tr>
                       {Object.keys(results[0]).map(k => <th key={k} className="px-5 py-3 uppercase font-black tracking-widest">{k}</th>)}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {results.map((row, i) => (
                       <tr key={i} className="hover:bg-white/[0.02] text-gray-300">
                         {Object.values(row).map((v: any, j) => <td key={j} className="px-5 py-3 truncate max-w-[200px] font-medium">{String(v)}</td>)}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-30">
                    <Database size={48} />
                    <span className="text-xs font-bold uppercase tracking-widest">Aguardando execução...</span>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Sidebar Panel */}
        <div className="flex flex-col gap-6 overflow-hidden">
           <div className="glass-card p-6 border-neon-red/10 bg-gradient-to-br from-white/[0.02] to-transparent shrink-0">
              <h3 className="text-xs font-black mb-6 flex items-center gap-2 text-white uppercase tracking-widest">
                <Save size={16} className="text-neon-red" /> Organizar & Salvar
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Nome do Relatório</label>
                  <input 
                    type="text" 
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    placeholder="Ex: Resumo de Vendas"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-neon-red/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Grupo</label>
                    <input 
                      type="text" 
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-neon-red/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 block">Subgrupo</label>
                    <input 
                      type="text" 
                      value={subgroup}
                      onChange={(e) => setSubgroup(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-neon-red/50 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setShowInReports(!showInReports)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${showInReports ? 'bg-neon-red/10 border-neon-red/30 text-neon-red' : 'bg-white/5 border-white/10 text-gray-500'}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Visível em Relatórios</span>
                  {showInReports ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                <button 
                  onClick={handleSave}
                  className="w-full bg-white text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-neon-red hover:text-white transition-all shadow-xl"
                >
                  Confirmar e Salvar
                </button>
              </div>
           </div>

           <div className="glass-card flex-1 flex flex-col overflow-hidden border-white/5">
              <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center gap-2">
                 <FolderTree size={14} className="text-gray-500" />
                 <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Biblioteca Técnica</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                 {Object.entries(hierarchicalData).map(([g, subgroups]: [string, any]) => (
                    <div key={g} className="space-y-1">
                        <button 
                            onClick={() => toggleGroup(g)}
                            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <Folder size={14} className={expandedGroups.includes(g) ? "text-neon-red" : "text-gray-600"} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${expandedGroups.includes(g) ? "text-white" : "text-gray-500"}`}>{g}</span>
                            </div>
                            {expandedGroups.includes(g) ? <ChevronDown size={12} className="text-gray-700" /> : <ChevronRight size={12} className="text-gray-700" />}
                        </button>

                        <AnimatePresence>
                            {expandedGroups.includes(g) && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden ml-3 border-l border-white/5 space-y-1"
                                >
                                    {Object.entries(subgroups).map(([sg, scripts]: [string, any]) => (
                                        <div key={sg}>
                                            <button 
                                                onClick={() => toggleSubgroup(`${g}-${sg}`)}
                                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Folder size={12} className={expandedSubgroups.includes(`${g}-${sg}`) ? "text-neon-red/70" : "text-gray-700"} />
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${expandedSubgroups.includes(`${g}-${sg}`) ? "text-gray-300" : "text-gray-600"}`}>{sg}</span>
                                                </div>
                                            </button>

                                            {expandedSubgroups.includes(`${g}-${sg}`) && (
                                                <div className="ml-3 border-l border-white/5 mt-1 space-y-1">
                                                    {scripts.map((s: any) => (
                                                        <button 
                                                            key={s.id}
                                                            onClick={() => {
                                                                setQuery(s.query);
                                                                setScriptName(s.name);
                                                                setGroup(s.group || "Geral");
                                                                setSubgroup(s.subgroup || "Geral");
                                                                setShowInReports(s.show_in_reports !== false);
                                                            }}
                                                            className="w-full text-left p-2 rounded-lg text-[10px] font-medium text-gray-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-between group"
                                                        >
                                                            <div className="flex items-center gap-2 truncate">
                                                                <FileCode size={10} className="text-gray-700 group-hover:text-neon-red" />
                                                                <span className="truncate">{s.name}</span>
                                                            </div>
                                                            {s.show_in_reports !== false ? <Eye size={10} className="text-neon-red/40" /> : <EyeOff size={10} className="text-gray-800" />}
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

                 {savedScripts.length === 0 && (
                   <div className="h-full flex items-center justify-center text-gray-700 text-[10px] font-black uppercase italic mt-10">Biblioteca Vazia</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </BILayout>
  );
}
