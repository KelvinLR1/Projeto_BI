"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import CustomSelect from '@/components/BI/CustomSelect';
import { fetchWithCache } from '@/utils/api';
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
    FileCode,
    Plus,
    Trash2,
    ArrowUpDown,
    SlidersHorizontal,
    Code,
    Sparkles
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

  // States for Visual Query Builder
  const [schema, setSchema] = useState<any>(null);
  const [editorMode, setEditorMode] = useState<"sql" | "visual">("sql");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Array<{ column: string; operator: string; value: string }>>([]);
  const [orderByColumn, setOrderByColumn] = useState<string>("");
  const [orderByDirection, setOrderByDirection] = useState<"ASC" | "DESC">("ASC");
  const [queryLimit, setQueryLimit] = useState<number>(100);

  // New States for Joins and Calculations
  const [joins, setJoins] = useState<Array<{
    joinType: "LEFT JOIN" | "INNER JOIN";
    table: string;
    conditions: Array<{ onLeft: string; onRight: string }>;
  }>>([]);
  const [calculations, setCalculations] = useState<Array<{
    expression: string;
    alias: string;
  }>>([]);

  useEffect(() => {
    fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts', undefined, setSavedScripts);
    fetchWithCache<any>('http://127.0.0.1:8000/api/schema', undefined, setSchema);
  }, []);

  interface AvailableColumn {
    table: string;
    name: string;
    fullName: string;
  }

  // Dynamically calculate available columns from main table and joined tables
  const availableColumns = useMemo<AvailableColumn[]>(() => {
    if (!selectedTable || !schema?.tables) return [];
    
    // Columns from main table
    const cols: AvailableColumn[] = (schema.tables[selectedTable] || []).map((c: string) => ({
      table: selectedTable,
      name: c,
      fullName: `${selectedTable}.${c}`
    }));
    
    // Columns from joined tables
    joins.forEach(j => {
      if (j.table && schema.tables[j.table]) {
        schema.tables[j.table].forEach((c: string) => {
          cols.push({
            table: j.table,
            name: c,
            fullName: `${j.table}.${c}`
          });
        });
      }
    });
    
    return cols;
  }, [selectedTable, joins, schema]);

  // Auto-generate SQL from visual choices
  useEffect(() => {
    if (editorMode !== "visual" || !selectedTable) return;
    
    const dbType = schema?.db_type || "sqlserver";
    let colSelection = "*";
    const selectedList: string[] = [];
    
    if (selectedColumns.length > 0) {
      selectedColumns.forEach(c => selectedList.push(c));
    }
    
    if (calculations.length > 0) {
      calculations.forEach(calc => {
        if (calc.expression && calc.alias) {
          selectedList.push(`${calc.expression} AS ${calc.alias}`);
        }
      });
    }
    
    if (selectedList.length > 0) {
      colSelection = selectedList.join(", ");
    }
    
    let selectClause = `SELECT ${colSelection}`;
    if (queryLimit && dbType === "sqlserver") {
      selectClause = `SELECT TOP ${queryLimit} ${colSelection}`;
    }
    
    let sql = `${selectClause} FROM ${selectedTable}`;
    
    // Append JOINS
    joins.forEach(j => {
      if (j.table && j.conditions && j.conditions.length > 0) {
        const validConditions = j.conditions.filter(c => c.onLeft && c.onRight);
        if (validConditions.length > 0) {
          const conditionsStr = validConditions
            .map(c => `${c.onLeft} = ${j.table}.${c.onRight}`)
            .join(" AND ");
          sql += ` ${j.joinType} ${j.table} ON ${conditionsStr}`;
        }
      }
    });
    
    // Append WHERE filters
    if (filters.length > 0) {
      const clauses = filters
        .filter(f => f.column && f.operator)
        .map(f => {
          const val = f.value;
          if (f.operator === "IS NULL" || f.operator === "IS NOT NULL") {
            return `${f.column} ${f.operator}`;
          }
          if (f.operator === "LIKE") {
            return `${f.column} LIKE '%${val}%'`;
          }
          const isNum = !isNaN(Number(val)) && val !== "";
          const formattedVal = isNum ? val : `'${val}'`;
          return `${f.column} ${f.operator} ${formattedVal}`;
        });
      
      if (clauses.length > 0) {
        sql += ` WHERE ${clauses.join(" AND ")}`;
      }
    }
    
    // Append ORDER BY
    if (orderByColumn) {
      sql += ` ORDER BY ${orderByColumn} ${orderByDirection}`;
    }
    
    // Append LIMIT
    if (queryLimit && dbType !== "sqlserver") {
      sql += ` LIMIT ${queryLimit}`;
    }
    
    setQuery(sql);
  }, [editorMode, selectedTable, selectedColumns, joins, calculations, filters, orderByColumn, orderByDirection, queryLimit, schema]);

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
      await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      }, (data) => {
        setResults(Array.isArray(data) ? data : []);
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!scriptName) return alert("Dê um nome ao script!");
    await fetchWithCache<any>('http://127.0.0.1:8000/api/scripts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          name: scriptName, 
          query,
          group,
          subgroup,
          show_in_reports: showInReports
      })
    }, () => {
      // Força a recarga dos scripts após salvar
      fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts', undefined, setSavedScripts);
      alert("Script salvo com sucesso!");
    });
  };

  const toggleGroup = (g: string) => {
    setExpandedGroups(prev => prev.includes(g) ? prev.filter(i => i !== g) : [...prev, g]);
  };

  const toggleSubgroup = (sg: string) => {
    setExpandedSubgroups(prev => prev.includes(sg) ? prev.filter(i => i !== sg) : [...prev, sg]);
  };

  return (
    <>
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
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center select-none">
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditorMode("sql")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                      editorMode === "sql"
                        ? "bg-neon-red/15 text-neon-red border-neon-red/30 shadow-[0_0_15px_rgba(255,45,85,0.1)]"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Code size={14} /> Console SQL
                  </button>
                  <button
                    onClick={() => setEditorMode("visual")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                      editorMode === "visual"
                        ? "bg-neon-red/15 text-neon-red border-neon-red/30 shadow-[0_0_15px_rgba(255,45,85,0.1)]"
                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Sparkles size={14} /> Construtor Visual
                  </button>
                </div>
                <button 
                   onClick={handleRun}
                   disabled={loading}
                   className="flex items-center gap-2 bg-neon-red px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(255,45,85,0.2)]"
                >
                  <Play size={14} fill="white" />
                  {loading ? "Processando..." : "Executar"}
                </button>
             </div>
            {editorMode === "visual" ? (
              <div className="flex-1 bg-transparent p-6 overflow-y-auto space-y-6 text-xs text-gray-300">
                {/* 1. Selecionar Tabela e Joins */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Card Tabela Principal */}
                  <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Database size={14} className="text-neon-red" />
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Tabela Principal</label>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Selecione a tabela base para iniciar sua extração de dados.</p>
                    </div>
                    <CustomSelect
                       value={selectedTable}
                       onChange={v => {
                         setSelectedTable(v);
                         setSelectedColumns([]);
                         setJoins([]);
                         setCalculations([]);
                         setFilters([]);
                         setOrderByColumn("");
                       }}
                       options={schema && schema.tables ? Object.keys(schema.tables).map(t => ({ value: t, label: t })) : []}
                       placeholder="Selecione uma tabela..."
                     />
                  </div>

                  {/* Card Relações (Joins) */}
                  <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal size={14} className="text-neon-red" />
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Relações (JOIN)</label>
                      </div>
                      {selectedTable && (
                        <span className="text-[9px] bg-neon-red/10 text-neon-red px-2 py-0.5 rounded-full font-bold uppercase">
                          {joins.length} Ativa(s)
                        </span>
                      )}
                    </div>

                    {!selectedTable ? (
                      <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                        Selecione a tabela principal primeiro
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <AnimatePresence initial={false}>
                          {joins.length === 0 ? (
                            <motion.div
                              key="empty-joins"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="p-4 border border-dashed border-white/10 rounded-2xl text-center text-gray-500"
                            >
                              Nenhuma relação criada. Junte outras tabelas para enriquecer seu relatório.
                            </motion.div>
                          ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                              <AnimatePresence initial={false}>
                                {joins.map((j, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: "auto", y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl relative overflow-hidden"
                                  >
                                    {/* Join Header */}
                                    <div className="flex flex-wrap items-center gap-3">
                                      <CustomSelect compact value={j.joinType} onChange={v => { const next = [...joins]; next[index].joinType = v as any; setJoins(next); }} options={[{ value: 'LEFT JOIN', label: 'LEFT JOIN' }, { value: 'INNER JOIN', label: 'INNER JOIN' }]} />

                                      <CustomSelect compact value={j.table} onChange={v => { const next = [...joins]; next[index].table = v; next[index].conditions = [{ onLeft: '', onRight: '' }]; setJoins(next); }} options={schema && schema.tables ? Object.keys(schema.tables).filter(t => t !== selectedTable).map(t => ({ value: t, label: t })) : []} placeholder="Tabela..." className="min-w-[150px]" />

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setJoins(prev => prev.filter((_, idx) => idx !== index));
                                          if (j.table) {
                                            setSelectedColumns(prev => prev.filter(c => !c.startsWith(`${j.table}.`)));
                                          }
                                        }}
                                        className="ml-auto p-2 rounded-xl border border-white/10 text-gray-400 hover:text-neon-red hover:border-neon-red/30 transition-all cursor-pointer"
                                        title="Remover Tabela Relacionada"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>

                                    {/* Conditions List */}
                                    {j.table && (
                                      <div className="space-y-2.5 pl-4 border-l-2 border-white/5 mt-3">
                                        <AnimatePresence initial={false}>
                                          {j.conditions.map((cond, condIdx) => (
                                            <motion.div
                                              key={condIdx}
                                              initial={{ opacity: 0, x: -10 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              exit={{ opacity: 0, x: -10 }}
                                              transition={{ duration: 0.15 }}
                                              className="flex flex-col space-y-1.5"
                                            >
                                              {condIdx > 0 && (
                                                <div className="flex items-center my-1">
                                                  <span className="bg-neon-red/10 border border-neon-red/30 text-neon-red text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full select-none">
                                                    AND
                                                  </span>
                                                </div>
                                              )}
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest select-none">ON</span>
                                                <CustomSelect compact value={cond.onLeft} onChange={v => { const next = [...joins]; next[index].conditions[condIdx].onLeft = v; setJoins(next); }} options={[ ...(schema.tables[selectedTable]?.map((c: string) => ({ value: `${selectedTable}.${c}`, label: `${selectedTable}.${c}` })) || []), ...joins.slice(0, index).flatMap(pj => !pj.table || !schema.tables[pj.table] ? [] : schema.tables[pj.table].map((c: string) => ({ value: `${pj.table}.${c}`, label: `${pj.table}.${c}` }))) ]} placeholder="Coluna da Tabela Principal..." className="max-w-[200px]" />

                                                <span className="text-gray-600 text-xs font-bold select-none">=</span>

                                                <CustomSelect compact value={cond.onRight} onChange={v => { const next = [...joins]; next[index].conditions[condIdx].onRight = v; setJoins(next); }} options={schema.tables[j.table]?.map((c: string) => ({ value: c, label: c })) || []} placeholder={`Coluna de ${j.table}...`} className="max-w-[200px]" />

                                                {j.conditions.length > 1 && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const next = [...joins];
                                                      next[index].conditions = next[index].conditions.filter((_, idx) => idx !== condIdx);
                                                      setJoins(next);
                                                    }}
                                                    className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-neon-red hover:border-neon-red/30 transition-all cursor-pointer"
                                                    title="Remover Condição"
                                                  >
                                                    <Trash2 size={10} />
                                                  </button>
                                                )}
                                              </div>
                                            </motion.div>
                                          ))}
                                        </AnimatePresence>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = [...joins];
                                            next[index].conditions.push({ onLeft: "", onRight: "" });
                                            setJoins(next);
                                          }}
                                          className="flex items-center gap-1 mt-2 text-[9px] font-black uppercase text-gray-400 hover:text-white transition-all cursor-pointer"
                                        >
                                          <Plus size={10} /> Adicionar Condição (AND)
                                        </button>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>
                          )}
                        </AnimatePresence>

                        <button
                          type="button"
                          onClick={() => setJoins(prev => [...prev, { joinType: "LEFT JOIN", table: "", conditions: [{ onLeft: "", onRight: "" }] }])}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all font-black uppercase text-[9px] tracking-wider cursor-pointer"
                        >
                          <Plus size={12} /> Juntar outra tabela
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTable && schema && schema.tables && (
                  <motion.div
                    key={selectedTable}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="space-y-6"
                  >
                    {/* 2. Selecionar Colunas e Fórmulas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-white/5 pt-4">
                      {/* Colunas a Exibir */}
                      <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-neon-red" />
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Colunas a Exibir</label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allFullNameCols = availableColumns.map(c => c.fullName);
                                setSelectedColumns(allFullNameCols);
                              }}
                              className="text-[9px] font-black uppercase text-neon-red hover:underline cursor-pointer"
                            >
                              Todas
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                              type="button"
                              onClick={() => setSelectedColumns([])}
                              className="text-[9px] font-black uppercase text-gray-400 hover:underline cursor-pointer"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                          {/* Tabela Principal Colunas */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-black text-neon-red uppercase tracking-wider block opacity-95 text-shadow-sm">
                              {selectedTable} <span className="text-gray-500 font-medium lowercase font-sans">(tabela principal)</span>
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {schema.tables[selectedTable]?.map((c: string) => {
                                const fullName = `${selectedTable}.${c}`;
                                const isChecked = selectedColumns.includes(fullName);
                                return (
                                  <motion.button
                                    key={fullName}
                                    type="button"
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => {
                                      setSelectedColumns(prev =>
                                        prev.includes(fullName) ? prev.filter(x => x !== fullName) : [...prev, fullName]
                                      );
                                    }}
                                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isChecked
                                        ? "bg-neon-red/10 border-neon-red text-neon-red font-black shadow-[0_0_10px_rgba(255,45,85,0.15)]"
                                        : "bg-white/5 border-white/10 text-gray-400 hover:border-gray-500 hover:text-white"
                                    }`}
                                  >
                                    {c}
                                  </motion.button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Tabelas de JOIN Colunas */}
                          {joins.map((j, idx) => {
                            if (!j.table || !schema.tables[j.table]) return null;
                            return (
                              <div key={`${j.table}-${idx}`} className="space-y-2 border-t border-white/5 pt-3">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block opacity-95 text-shadow-sm">
                                  {j.table} <span className="text-gray-500 font-medium lowercase font-sans">({j.joinType.toLowerCase()})</span>
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {schema.tables[j.table].map((c: string) => {
                                    const fullName = `${j.table}.${c}`;
                                    const isChecked = selectedColumns.includes(fullName);
                                    return (
                                      <motion.button
                                        key={fullName}
                                        type="button"
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => {
                                          setSelectedColumns(prev =>
                                            prev.includes(fullName) ? prev.filter(x => x !== fullName) : [...prev, fullName]
                                          );
                                        }}
                                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                          isChecked
                                            ? "bg-blue-500/10 border-blue-400 text-blue-400 font-black shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:border-gray-500 hover:text-white"
                                        }`}
                                      >
                                        {c}
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Card Fórmulas / Cálculos */}
                      <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-2">
                            <FolderTree size={14} className="text-neon-red" />
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Fórmulas / Cálculos</label>
                          </div>
                          
                          <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                            <AnimatePresence initial={false}>
                              {calculations.length === 0 ? (
                                <motion.div
                                  key="empty-calcs"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-2xl text-[10px] text-gray-500 text-center uppercase tracking-wider font-bold"
                                >
                                  Nenhum cálculo criado
                                </motion.div>
                              ) : (
                                calculations.map((calc, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: "auto" }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex flex-col gap-2 bg-white/[0.02] border border-white/5 p-3 rounded-xl relative overflow-hidden"
                                  >
                                    <input
                                      type="text"
                                      value={calc.expression}
                                      onChange={e => {
                                        const next = [...calculations];
                                        next[index].expression = e.target.value;
                                        setCalculations(next);
                                      }}
                                      placeholder="Expressão (ex: valor * 0.1)"
                                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-neon-red/50 transition-all font-mono"
                                    />
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest select-none">AS</span>
                                      <input
                                        type="text"
                                        value={calc.alias}
                                        onChange={e => {
                                          const next = [...calculations];
                                          next[index].alias = e.target.value;
                                          setCalculations(next);
                                        }}
                                        placeholder="Apelido (ex: comissao)"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white outline-none focus:border-neon-red/50 transition-all"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setCalculations(prev => prev.filter((_, idx) => idx !== index))}
                                        className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-neon-red hover:border-neon-red/30 transition-all cursor-pointer"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </motion.div>
                                ))
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCalculations(prev => [...prev, { expression: "", alias: "" }])}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all font-black uppercase text-[9px] tracking-wider cursor-pointer mt-3"
                        >
                          <Plus size={10} /> Nova Fórmula
                        </button>
                      </div>
                    </div>

                    {/* 3. Filtros e Configurações */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-white/5 pt-4">
                      {/* Filtros */}
                      <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal size={14} className="text-neon-red" />
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Filtros (Opcional)</label>
                          </div>
                          <span className="text-[9px] text-gray-500 font-bold uppercase">
                            {filters.length} Filtro(s)
                          </span>
                        </div>

                        <div className="space-y-3">
                          <AnimatePresence initial={false}>
                            {filters.length === 0 ? (
                              <motion.div
                                key="empty-filters"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-4 border border-dashed border-white/10 rounded-2xl text-center text-gray-500"
                              >
                                Nenhum filtro aplicado. Os dados retornarão sem restrições.
                              </motion.div>
                            ) : (
                              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                                <AnimatePresence initial={false}>
                                  {filters.map((f, index) => (
                                    <motion.div
                                      key={index}
                                      initial={{ opacity: 0, x: -15, height: 0 }}
                                      animate={{ opacity: 1, x: 0, height: "auto" }}
                                      exit={{ opacity: 0, x: -15, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="flex items-center gap-3 bg-white/[0.01] border border-white/5 p-3 rounded-xl flex-wrap md:flex-nowrap overflow-hidden"
                                    >
                                      <CustomSelect compact value={f.column} onChange={v => { const next = [...filters]; next[index].column = v; setFilters(next); }} options={availableColumns.map(col => ({ value: col.fullName, label: col.fullName }))} placeholder="Coluna..." className="flex-1" />

                                      <CustomSelect compact value={f.operator} onChange={v => { const next = [...filters]; next[index].operator = v; setFilters(next); }} options={['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IS NULL', 'IS NOT NULL'].map(op => ({ value: op, label: op }))} className="w-28" />

                                      {f.operator !== "IS NULL" && f.operator !== "IS NOT NULL" ? (
                                        <input
                                          type="text"
                                          value={f.value}
                                          onChange={e => {
                                            const next = [...filters];
                                            next[index].value = e.target.value;
                                            setFilters(next);
                                          }}
                                          placeholder="Valor..."
                                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-neon-red/50 transition-all flex-1"
                                        />
                                      ) : (
                                        <div className="flex-1 px-4 py-2 bg-white/5 border border-dashed border-white/10 rounded-xl text-gray-500 text-[10px] uppercase font-bold text-center">
                                          Não requer valor
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setFilters(prev => prev.filter((_, idx) => idx !== index))}
                                        className="p-2 rounded-xl border border-white/10 text-gray-400 hover:text-neon-red hover:border-neon-red/30 transition-all cursor-pointer"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>
                            )}
                          </AnimatePresence>

                          <button
                            type="button"
                            onClick={() => setFilters(prev => [...prev, { column: "", operator: "=", value: "" }])}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all font-black uppercase text-[9px] tracking-wider cursor-pointer"
                          >
                            <Plus size={12} /> Adicionar Filtro
                          </button>
                        </div>
                      </div>

                      {/* Ordenação e Limite */}
                      <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-4 w-full">
                          <div className="flex items-center gap-2">
                            <SlidersHorizontal size={14} className="text-neon-red" />
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Ordenação & Limite</label>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Ordenar por</label>
                              <div className="flex gap-2">
                                <CustomSelect compact value={orderByColumn} onChange={setOrderByColumn} options={[{ value: '', label: 'Nenhum...' }, ...availableColumns.map(col => ({ value: col.fullName, label: col.fullName }))]} className="flex-1" />
                                {orderByColumn && (
                                  <button
                                    type="button"
                                    onClick={() => setOrderByDirection(prev => prev === "ASC" ? "DESC" : "ASC")}
                                    className="px-3 py-2 rounded-xl border border-white/10 text-white font-black hover:border-neon-red/30 transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <ArrowUpDown size={12} />
                                    <span className="text-[9px] uppercase tracking-wider">{orderByDirection}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Limite de Registros</label>
                              <input
                                type="number"
                                value={queryLimit}
                                onChange={e => setQueryLimit(Number(e.target.value))}
                                placeholder="Sem limite..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-neon-red/50 transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Query Preview Terminal */}
                    <div className="bg-[#0b0f19] border border-white/10 rounded-2xl overflow-hidden flex flex-col font-mono text-xs shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
                      {/* Terminal Header */}
                      <div className="bg-white/[0.02] border-b border-white/10 px-4 py-2.5 flex items-center justify-between select-none">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                          <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2 font-sans">SQL Live Preview</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(query);
                            alert("SQL copiado para a área de transferência!");
                          }}
                          className="text-[9px] font-sans font-black uppercase text-gray-400 hover:text-white transition-all cursor-pointer"
                        >
                          Copiar Query
                        </button>
                      </div>
                      {/* Terminal Body */}
                      <div className="p-4 overflow-x-auto min-h-[60px] flex items-center">
                        <code className="text-neon-red/90 break-words leading-relaxed select-all text-[11px] shadow-[0_0_10px_rgba(255,45,85,0.05)]">
                          {query}
                        </code>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-[#050505] p-8 font-mono text-neon-red text-sm outline-none resize-none leading-relaxed"
                placeholder="SELECT * FROM Analytics..."
              />
            )}
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
    </>
  );
}
