"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { fetchWithCache } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  Search, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  Folder, 
  FileText, 
  LayoutList,
  Database,
  ArrowLeftRight,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Hash,
  Calendar,
  Type,
  SlidersHorizontal
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

type ColType = 'number' | 'date' | 'text';

interface ColMeta {
  name: string;
  type: ColType;
  uniqueValues?: string[]; // para colunas de texto com poucos valores únicos
  min?: number;
  max?: number;
  minDate?: string;
  maxDate?: string;
}

interface FilterState {
  // number / date range
  minVal?: string;
  maxVal?: string;
  // text
  textVal?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectColType(values: any[]): ColType {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';
  const allNum = nonNull.every(v => !isNaN(Number(v)));
  if (allNum) return 'number';
  const dateRe = /^\d{4}-\d{2}-\d{2}/;
  const allDate = nonNull.every(v => dateRe.test(String(v)));
  if (allDate) return 'date';
  return 'text';
}

function buildColMeta(data: any[]): ColMeta[] {
  if (!data.length) return [];
  return Object.keys(data[0]).map(name => {
    const values = data.map(r => r[name]);
    const type = detectColType(values);
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');

    if (type === 'number') {
      const nums = nonNull.map(Number);
      return { name, type, min: Math.min(...nums), max: Math.max(...nums) };
    }
    if (type === 'date') {
      const dates = nonNull.map(v => String(v).slice(0, 10)).sort();
      return { name, type, minDate: dates[0], maxDate: dates[dates.length - 1] };
    }
    // text — se tiver ≤ 30 valores únicos, mostra lista
    const unique = Array.from(new Set(nonNull.map(String))).sort();
    return { name, type, uniqueValues: unique.length <= 30 ? unique : undefined };
  });
}

function applyFilters(data: any[], filters: Record<string, FilterState>, colMeta: ColMeta[]): any[] {
  return data.filter(row => {
    for (const meta of colMeta) {
      const f = filters[meta.name];
      if (!f) continue;
      const val = row[meta.name];

      if (meta.type === 'number') {
        const num = Number(val);
        if (f.minVal !== undefined && f.minVal !== '' && num < Number(f.minVal)) return false;
        if (f.maxVal !== undefined && f.maxVal !== '' && num > Number(f.maxVal)) return false;
      } else if (meta.type === 'date') {
        const d = String(val).slice(0, 10);
        if (f.minVal && d < f.minVal) return false;
        if (f.maxVal && d > f.maxVal) return false;
      } else {
        if (f.textVal && !String(val).toLowerCase().includes(f.textVal.toLowerCase())) return false;
      }
    }
    return true;
  });
}

// ─── Ícone por tipo ──────────────────────────────────────────────────────────
const TypeIcon = ({ type }: { type: ColType }) => {
  if (type === 'number') return <Hash size={10} className="text-neon-red opacity-70" />;
  if (type === 'date')   return <Calendar size={10} className="text-blue-400 opacity-70" />;
  return <Type size={10} className="text-emerald-400 opacity-70" />;
};

// ─── Componentes Customizados ──────────────────────────────────────────────────

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}

function CustomSelect({ value, onChange, options, placeholder = "Selecione..." }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground)] outline-none focus:border-neon-red/50 hover:border-[var(--text-secondary)]/50 transition-all cursor-pointer text-left"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={12} className={`text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-lg shadow-xl py-1 backdrop-blur-md left-0"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-[10px] font-bold transition-all hover:bg-neon-red/10 hover:text-[var(--foreground)] flex items-center justify-between cursor-pointer ${opt.value === value ? 'bg-neon-red/5 text-neon-red font-black' : 'text-[var(--text-secondary)]'}`}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
}

function CustomDatePicker({ value, onChange, min, max, placeholder = "Selecione..." }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    if (min) {
      const d = new Date(min + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    if (max) {
      const d = new Date(max + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) setViewDate(d);
    } else if (min) {
      const d = new Date(min + 'T00:00:00');
      if (!isNaN(d.getTime())) setViewDate(d);
    } else if (max) {
      const d = new Date(max + 'T00:00:00');
      if (!isNaN(d.getTime())) setViewDate(d);
    } else {
      setViewDate(new Date());
    }
  }, [value, min, max]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setDate(1);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const d = new Date(prev);
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleSelectDay = (day: number) => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const formatted = `${y}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= totalDays; i++) {
    daysArray.push(i);
  }

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }, [value, placeholder]);

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-[var(--foreground)] outline-none focus:border-neon-red/50 hover:border-[var(--text-secondary)]/50 transition-all cursor-pointer select-none text-left"
      >
        <span className={value ? "text-[var(--foreground)]" : "text-[var(--text-secondary)] opacity-60"}>
          {displayValue}
        </span>
        <div className="flex items-center gap-1.5">
          {value && (
            <X 
              size={12} 
              onClick={handleClear} 
              className="text-[var(--text-secondary)] hover:text-neon-red transition-colors cursor-pointer" 
            />
          )}
          <Calendar size={12} className="text-[var(--text-secondary)] opacity-70" />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-64 mt-1 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-xl shadow-2xl p-3 backdrop-blur-md select-none left-1/2 -translate-x-1/2"
          >
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-[var(--card-border)]">
              <button 
                type="button" 
                onClick={handlePrevMonth} 
                className="p-1 rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--foreground)]">
                {monthNames[month]} {year}
              </div>
              <button 
                type="button" 
                onClick={handleNextMonth} 
                className="p-1 rounded-lg hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                <div key={idx} className="text-[8px] font-black text-[var(--text-secondary)] uppercase">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {daysArray.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="h-6" />;
                }

                const y = viewDate.getFullYear();
                const m = String(viewDate.getMonth() + 1).padStart(2, '0');
                const d = String(day).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;

                const isOutOfRange = Boolean((min && dateStr < min) || (max && dateStr > max));
                const isSelected = value === dateStr;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-6 rounded-lg text-[9px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                      isSelected 
                        ? 'bg-neon-red text-white font-black' 
                        : isOutOfRange 
                          ? 'text-[var(--text-secondary)]/30 hover:bg-neon-red/10 hover:text-[var(--foreground)]' 
                          : 'text-[var(--text-secondary)] hover:bg-neon-red/10 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface RowsPerPageSelectProps {
  value: number;
  onChange: (value: number) => void;
  options: number[];
}

function RowsPerPageSelect({ value, onChange, options }: RowsPerPageSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-[var(--input-bg)] border border-[var(--card-border)] rounded px-2.5 py-1 text-xs text-[var(--foreground)] outline-none cursor-pointer hover:border-[var(--text-secondary)]/50 transition-all font-bold"
      >
        <span>{value}</span>
        <ChevronDown size={12} className={`text-[var(--text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-1 z-50 left-0 w-20 bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded shadow-xl py-1 backdrop-blur-md"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1 text-xs font-bold transition-all hover:bg-neon-red/10 hover:text-[var(--foreground)] cursor-pointer ${opt === value ? 'text-neon-red bg-neon-red/5 font-black' : 'text-[var(--text-secondary)]'}`}
              >
                {opt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ReportsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [expandedSubgroups, setExpandedSubgroups] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ── Filtros ──
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, FilterState>>({});
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const colMeta = useMemo(() => buildColMeta(reportData), [reportData]);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(f => {
      if (!f) return false;
      return (f.minVal !== undefined && f.minVal !== '') ||
             (f.maxVal !== undefined && f.maxVal !== '') ||
             (f.textVal !== undefined && f.textVal !== '');
    }).length;
  }, [filters]);

  const setFilter = (col: string, patch: Partial<FilterState>) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, [col]: { ...prev[col], ...patch } }));
  };

  const clearFilter = (col: string) => {
    setFilters(prev => {
      const next = { ...prev };
      delete next[col];
      return next;
    });
  };

  const clearAllFilters = () => setFilters({});

  // ── Ordenação ──
  const handleSort = (column: string) => {
    setCurrentPage(1);
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortColumn(null);
    }
  };

  // ── Pipeline: filtrar → ordenar → paginar ──
  const filteredData = useMemo(
    () => applyFilters(reportData, filters, colMeta),
    [reportData, filters, colMeta]
  );

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];
      if (valA == null) return 1;
      if (valB == null) return -1;
      const numA = Number(valA), numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) return sortDirection === 'asc' ? numA - numB : numB - numA;
      const sA = String(valA).toLowerCase(), sB = String(valB).toLowerCase();
      if (sA < sB) return sortDirection === 'asc' ? -1 : 1;
      if (sA > sB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortColumn, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage) || 1;
  const paginatedRows = useMemo(
    () => sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage),
    [sortedData, currentPage, rowsPerPage]
  );
  const startItem = sortedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
  const endItem   = Math.min(currentPage * rowsPerPage, sortedData.length);

  // ── Dados ──
  useEffect(() => {
    fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts', undefined, (data) => {
      setScripts(data.filter((s: any) => s.show_in_reports !== false));
    });
  }, []);

  const hierarchicalData = useMemo(() => {
    const groups: any = {};
    scripts.forEach(s => {
      const g  = s.group    || "Geral";
      const sg = s.subgroup || "Geral";
      if (!groups[g])     groups[g]     = {};
      if (!groups[g][sg]) groups[g][sg] = [];
      groups[g][sg].push(s);
    });
    return groups;
  }, [scripts]);

  const handleSelectScript = async (script: any) => {
    setSelectedScript(script);
    setSortColumn(null);
    setSortDirection('asc');
    setCurrentPage(1);
    setFilters({});
    setShowFilters(false);
    setLoading(true);
    setReportData([]);
    try {
      await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: script.query })
      }, (data) => {
        setReportData(Array.isArray(data) ? data : []);
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup    = (g: string)  => setExpandedGroups(p    => p.includes(g)  ? p.filter(i => i !== g)  : [...p, g]);
  const toggleSubgroup = (sg: string) => setExpandedSubgroups(p => p.includes(sg) ? p.filter(i => i !== sg) : [...p, sg]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="flex h-[calc(100vh-48px)]">

        {/* ── Sidebar colapsável ── */}
        <motion.div
          animate={{ width: isSidebarOpen ? 320 : 0, marginRight: isSidebarOpen ? 24 : 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="flex-shrink-0 flex flex-col overflow-hidden"
          style={{ minWidth: 0 }}
        >
          <div className="w-80 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-black text-[var(--foreground)] uppercase italic tracking-tighter">
                Hub de <span className="text-neon-red">Relatórios</span>
              </h1>
              <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-[0.2em]">
                Exploração de Dados Estruturada
              </p>
            </div>

            <div className="glass-card flex-1 flex flex-col overflow-hidden border-[var(--card-border)]">
              {/* Header com busca + botão fechar */}
              <div className="p-4 bg-[var(--input-bg)] border-b border-[var(--card-border)] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={14} />
                  <input
                    type="text"
                    placeholder="BUSCAR RELATÓRIO..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-xl py-2 pl-10 pr-4 text-[10px] font-black tracking-widest outline-none focus:border-neon-red/50 transition-all uppercase text-[var(--foreground)] placeholder:text-[var(--text-secondary)]"
                  />
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  title="Ocultar painel"
                  className="flex-shrink-0 p-2 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:border-neon-red/40 hover:bg-neon-red/5 transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {Object.entries(hierarchicalData).map(([group, subgroups]: [string, any]) => (
                  <div key={group} className="space-y-1">
                    <button onClick={() => toggleGroup(group)} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--input-bg)] transition-all group">
                      <div className="flex items-center gap-3">
                        <Folder size={16} className={expandedGroups.includes(group) ? "text-neon-red" : "text-[var(--text-secondary)]"} />
                        <span className={`text-xs font-black uppercase tracking-widest ${expandedGroups.includes(group) ? "text-[var(--foreground)]" : "text-[var(--text-secondary)]"}`}>{group}</span>
                      </div>
                      {expandedGroups.includes(group) ? <ChevronDown size={14} className="text-[var(--text-secondary)]" /> : <ChevronRight size={14} className="text-[var(--text-secondary)]" />}
                    </button>

                    <AnimatePresence>
                      {expandedGroups.includes(group) && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden ml-4 border-l border-[var(--card-border)] space-y-1">
                          {Object.entries(subgroups).map(([subgroup, reports]: [string, any]) => (
                            <div key={subgroup}>
                              <button onClick={() => toggleSubgroup(`${group}-${subgroup}`)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[var(--input-bg)] transition-all">
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
        </motion.div>

        {/* ── Conteúdo ── */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">

          {/* Barra de título + ações */}
          <div className="flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-4">
              {/* Botão reabrir sidebar — sempre no DOM, animado por largura para não causar salto */}
              <motion.div
                animate={{ width: isSidebarOpen ? 0 : 48, opacity: isSidebarOpen ? 0 : 1 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="flex-shrink-0 overflow-hidden"
                style={{ minWidth: 0 }}
              >
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  title="Mostrar painel de relatórios"
                  className="h-12 w-12 bg-[var(--input-bg)] rounded-2xl flex items-center justify-center border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-neon-red hover:border-neon-red/40 hover:bg-neon-red/5 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </motion.div>

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
                    {activeFilterCount > 0 && (
                      <span className="ml-2 text-neon-red">· {filteredData.length} de {reportData.length} registros filtrados</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              {/* Botão Filtros */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(p => !p)}
                  disabled={!reportData.length}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border disabled:opacity-30 disabled:pointer-events-none ${showFilters ? 'bg-neon-red text-white border-neon-red shadow-lg shadow-neon-red/20' : 'bg-[var(--card-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)]'}`}
                >
                  <SlidersHorizontal size={15} />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-neon-red text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Exportar */}
              <button className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-neon-red hover:text-white transition-all shadow-xl">
                <FileDown size={16} /> Exportar
              </button>
            </div>
          </div>

          {/* ── Painel de Filtros ── */}
          <AnimatePresence>
            {showFilters && reportData.length > 0 && (
              <motion.div
                ref={filterPanelRef}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0 z-30"
                style={{ overflow: 'visible' }}
              >
                <div className="glass-card border-[var(--card-border)] p-5">
                  {/* Header do painel */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal size={14} className="text-neon-red" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)]">Filtros Ativos</span>
                      {activeFilterCount > 0 && (
                        <span className="bg-neon-red/20 text-neon-red text-[9px] font-black px-2 py-0.5 rounded-full">{activeFilterCount}</span>
                      )}
                    </div>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:text-neon-red transition-colors"
                      >
                        <X size={10} /> Limpar tudo
                      </button>
                    )}
                  </div>

                  {/* Grid de filtros */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {colMeta.map(meta => {
                      const f = filters[meta.name] || {};
                      const hasFilter = (f.minVal && f.minVal !== '') || (f.maxVal && f.maxVal !== '') || (f.textVal && f.textVal !== '');
                      return (
                        <div key={meta.name} className={`rounded-2xl border p-3 transition-all ${hasFilter ? 'border-neon-red/40 bg-neon-red/5' : 'border-[var(--card-border)] bg-[var(--input-bg)]'}`}>
                          {/* Nome da coluna + tipo */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <TypeIcon type={meta.type} />
                              <span className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)] truncate max-w-[90px]">{meta.name}</span>
                            </div>
                            {hasFilter && (
                              <button onClick={() => clearFilter(meta.name)} className="text-[var(--text-secondary)] hover:text-neon-red transition-colors">
                                <X size={10} />
                              </button>
                            )}
                          </div>

                          {/* Controle por tipo */}
                          {meta.type === 'number' && (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                placeholder={`≥ ${meta.min?.toLocaleString('pt-BR') ?? ''}`}
                                value={f.minVal ?? ''}
                                onChange={e => setFilter(meta.name, { minVal: e.target.value })}
                                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--foreground)] outline-none focus:border-neon-red/50 transition-all"
                              />
                              <input
                                type="number"
                                placeholder={`≤ ${meta.max?.toLocaleString('pt-BR') ?? ''}`}
                                value={f.maxVal ?? ''}
                                onChange={e => setFilter(meta.name, { maxVal: e.target.value })}
                                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-2 py-1.5 text-[10px] font-bold text-[var(--foreground)] outline-none focus:border-neon-red/50 transition-all"
                              />
                            </div>
                          )}

                          {meta.type === 'date' && (
                            <div className="flex flex-col gap-1">
                              <CustomDatePicker
                                value={f.minVal ?? ''}
                                min={meta.minDate}
                                max={meta.maxDate}
                                onChange={val => setFilter(meta.name, { minVal: val })}
                                placeholder="Data Inicial..."
                              />
                              <CustomDatePicker
                                value={f.maxVal ?? ''}
                                min={meta.minDate}
                                max={meta.maxDate}
                                onChange={val => setFilter(meta.name, { maxVal: val })}
                                placeholder="Data Final..."
                              />
                            </div>
                          )}

                          {meta.type === 'text' && meta.uniqueValues && (
                            <CustomSelect
                              value={f.textVal ?? ''}
                              onChange={val => setFilter(meta.name, { textVal: val })}
                              options={[
                                { label: "Todos", value: "" },
                                ...meta.uniqueValues.map(v => ({ label: v, value: v }))
                              ]}
                              placeholder="Todos"
                            />
                          )}

                          {meta.type === 'text' && !meta.uniqueValues && (
                            <div className="relative">
                              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                              <input
                                type="text"
                                placeholder="Buscar..."
                                value={f.textVal ?? ''}
                                onChange={e => setFilter(meta.name, { textVal: e.target.value })}
                                className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg pl-6 pr-2 py-1.5 text-[10px] font-bold text-[var(--foreground)] outline-none focus:border-neon-red/50 transition-all"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Tabela ── */}
          <div className="glass-card flex-1 flex flex-col overflow-hidden border-white/5 min-h-0">
            <div className="flex-1 overflow-auto bg-[var(--background)] min-h-0">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="h-12 w-12 border-t-2 border-neon-red rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.3em] animate-pulse">Processando Query...</span>
                </div>
              ) : selectedScript ? (
                reportData.length > 0 ? (
                  <div className="flex-1 flex flex-col justify-between overflow-hidden h-full">
                    <div className="flex-1 overflow-auto bg-[var(--background)]">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-[var(--background)] text-[var(--text-secondary)] border-b border-[var(--card-border)] z-20">
                          <tr>
                            {Object.keys(reportData[0]).map(k => {
                              const isSorted = sortColumn === k;
                              return (
                                <th
                                  key={k}
                                  onClick={() => handleSort(k)}
                                  className="px-6 py-4 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-[var(--input-bg)] select-none transition-colors group"
                                >
                                  <div className="flex items-center gap-1.5 justify-start">
                                    <span>{k}</span>
                                    {isSorted ? (
                                      sortDirection === 'asc'
                                        ? <ArrowUp size={10} className="text-neon-red" />
                                        : <ArrowDown size={10} className="text-neon-red" />
                                    ) : (
                                      <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--card-border)]">
                          {paginatedRows.map((row, i) => (
                            <tr key={i} className="hover:bg-[var(--input-bg)] group transition-colors">
                              {Object.values(row).map((v: any, j) => (
                                <td key={j} className="px-6 py-4 text-xs text-[var(--text-secondary)] group-hover:text-[var(--foreground)] font-medium truncate max-w-[200px]">
                                  {String(v ?? '—')}
                                </td>
                              ))}
                            </tr>
                          ))}
                          {paginatedRows.length === 0 && (
                            <tr>
                              <td colSpan={Object.keys(reportData[0]).length} className="px-6 py-16 text-center text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-40">
                                Nenhum registro corresponde aos filtros aplicados
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    <div className="p-4 border-t border-[var(--card-border)] bg-[var(--card-bg)] flex items-center justify-between flex-shrink-0 text-xs font-bold text-[var(--text-secondary)] select-none">
                      <div className="flex items-center gap-4">
                        <span>Exibindo {startItem}–{endItem} de {sortedData.length} registros{activeFilterCount > 0 ? ` (filtrado de ${reportData.length})` : ''}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase font-black tracking-wider opacity-60">Linhas por pág:</span>
                          <RowsPerPageSelect
                            value={rowsPerPage}
                            onChange={size => { setRowsPerPage(size); setCurrentPage(1); }}
                            options={[20, 50, 100, 200, 500]}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] uppercase font-black tracking-wider opacity-60">Pág. {currentPage} de {totalPages}</span>
                        <div className="flex gap-1">
                          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center">
                            <ChevronLeft size={14} />
                          </button>
                          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center">
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
    </>
  );
}
