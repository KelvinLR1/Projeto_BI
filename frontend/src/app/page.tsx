"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import KpiCard from '@/components/BI/KpiCard';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, LayoutDashboard, Monitor, AlertCircle, RefreshCcw, ListOrdered, BarChart as BarIcon, LineChart as LineIcon, PieChart as PieIcon, Database, Trash2, Shield, ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import SafeResponsiveContainer from '@/components/BI/SafeResponsiveContainer';
import { useAlerts } from '@/context/AlertContext';
import { fetchWithCache } from '@/utils/api';

export default function Dashboard() {
  const router = useRouter();
  const { alerts, clearAlerts, isSidebarTransitioning } = useAlerts();
  const [layout, setLayout] = useState<{cards: any[], charts: any[], components: any[], config?: any}>({ cards: [], charts: [], components: [] });
  const [kpiData, setKpiData] = useState<Record<string, any>>({});
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  const [reportDataMap, setReportDataMap] = useState<Record<string, any[]>>({});
  const [reportSortMap, setReportSortMap] = useState<Record<string, { column: string; direction: 'asc' | 'desc' }>>({});
  const [reportPageMap, setReportPageMap] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(false);

  const handleReportSort = (compId: string, column: string) => {
    setReportPageMap(prev => ({ ...prev, [compId]: 1 }));
    setReportSortMap(prev => {
      const current = prev[compId];
      if (!current || current.column !== column) {
        return { ...prev, [compId]: { column, direction: 'asc' } };
      }
      if (current.direction === 'asc') {
        return { ...prev, [compId]: { column, direction: 'desc' } };
      }
      const next = { ...prev };
      delete next[compId];
      return next;
    });
  };

  const COLORS = ['#ff2d55', '#00ff88', '#ffb700', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      // Carrega layouts, settings e scripts usando cache SWR
      const layoutData = await fetchWithCache<any>('http://127.0.0.1:8000/api/layouts/home', undefined, (data) => {
        setLayout({
          cards: Array.isArray(data.cards) ? data.cards : [],
          charts: Array.isArray(data.charts) ? data.charts : [],
          components: Array.isArray(data.components) ? data.components : [],
          config: data.config
        });
      });

      const settingsData = await fetchWithCache<any>('http://127.0.0.1:8000/api/settings', undefined, (data) => {
        setSettings(data);
      });

      const scripts = await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts');
      
      // Fetch Data for Cards — coleta tudo em batch para evitar múltiplos setState
      const kpiBatch: Record<string, any> = {};
      for (const kpi of layoutData.cards || []) {
        const script = scripts.find((s: any) => s.id === kpi.script_id);
        if (script) {
          const result = await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: script.query })
          });
          if (result && result.length > 0) {
            kpiBatch[kpi.id] = result[0][kpi.column];
          }
        }
      }
      // Atualiza todos os KPIs de uma só vez → um único re-render
      if (Object.keys(kpiBatch).length > 0) {
        setKpiData(prev => ({ ...prev, ...kpiBatch }));
      }

      // Fetch Data for Charts
      for (const chart of layoutData.charts || []) {
        const script = scripts.find((s: any) => s.id === chart.script_id);
        if (script) {
          await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: script.query })
          }, (result) => {
            if (result) {
              // Process aggregation
              const agg: Record<string, any> = {};
              result.forEach((row: any) => {
                const key = String(row[chart.xAxis] || "N/A");
                if (!agg[key]) {
                    agg[key] = { [chart.xAxis]: key };
                    chart.yAxes.forEach((y: string) => agg[key][y] = 0);
                }
                chart.yAxes.forEach((y: string) => {
                    agg[key][y] += parseFloat(row[y]) || 0;
                });
              });
              let finalData = Object.values(agg);
              if (chart.chartType === 'ranking') finalData = finalData.sort((a: any, b: any) => (b[chart.yAxes[0]] || 0) - (a[chart.yAxes[0]] || 0));
              setChartDataMap(prev => ({ ...prev, [chart.id]: finalData }));
            }
          });
        }
      }

      // Fetch Report Data
      for (const comp of (layoutData.components || []).filter((c: any) => c.compType === 'report' || c.script_id !== undefined)) {
        const script = scripts.find((s: any) => s.id === comp.script_id);
        if (script) {
          await fetchWithCache<any[]>('http://127.0.0.1:8000/api/scripts/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: script.query })
          }, (result) => {
            setReportDataMap(prev => ({ ...prev, [comp.id]: Array.isArray(result) ? result : [] }));
          });
        }
      }

      setError(false);
    } catch (err) {
      setError(true);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Use a faster retry interval (3s) if fetch failed, otherwise normal refresh interval
    const intervalTime = error
      ? 3000
      : (settings?.refresh_interval || 30) * 1000;
    const interval = setInterval(fetchData, intervalTime);
    return () => clearInterval(interval);
  }, [fetchData, settings?.refresh_interval, error]);

  const getKpiStatus = (kpi: any, value: number) => {
    if (kpi.kpi_mode === 'info') return "info";
    if (value >= kpi.threshold_success) return "success";
    if (value >= kpi.threshold_warning) return "warning";
    return "critical";
  };

  const renderChartContent = (chart: any, data: any[]) => {
    if (!data.length) return <div className="h-full flex items-center justify-center opacity-10"><BarIcon size={40} /></div>;

    if (chart.chartType === 'ranking') {
        return (
            <div className="space-y-3 h-full overflow-y-auto pr-2 custom-scrollbar">
                {data.slice(0, 10).map((row, i) => {
                    const maxValue = Math.max(...data.map(d => d[chart.yAxes[0]]));
                    const percentage = (row[chart.yAxes[0]] / maxValue) * 100;
                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black uppercase text-[var(--text-secondary)]">
                                <span>{i+1}º {row[chart.xAxis]}</span>
                                <span className="text-neon-red">{row[chart.yAxes[0]].toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="h-1 w-full bg-[var(--input-bg)] rounded-full overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className="h-full bg-neon-red" />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const gradientDefs = (
      <defs>
        {COLORS.map((color, i) => (
          <linearGradient key={i} id={`barGrad-home-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.85} />
            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
          </linearGradient>
        ))}
      </defs>
    );

    return (
        <SafeResponsiveContainer width="100%" height="100%" minWidth={0} debounce={isSidebarTransitioning ? 1000 : 150}>
            {chart.chartType === 'bar' ? (
                <ReBarChart data={data} barCategoryGap="35%">
                    {gradientDefs}
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.07)" vertical={false} />
                    <XAxis dataKey={chart.xAxis} stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} dy={6} />
                    <YAxis stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: "14px", fontSize: '10px', color: 'var(--foreground)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '8px 14px' }}
                        itemStyle={{ color: 'var(--foreground)', fontWeight: 700 }}
                        labelStyle={{ color: 'var(--text-secondary)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}
                    />
                    {chart.yAxes.map((y: string, i: number) => (
                        <Bar
                            key={y}
                            dataKey={y}
                            fill={`url(#barGrad-home-${i % COLORS.length})`}
                            radius={[10, 10, 3, 3]}
                        />
                    ))}
                </ReBarChart>
            ) : chart.chartType === 'line' ? (
                <ReLineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.07)" vertical={false} />
                    <XAxis dataKey={chart.xAxis} stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} dy={6} />
                    <YAxis stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip
                        cursor={{ stroke: 'rgba(255,45,85,0.2)', strokeWidth: 1 }}
                        contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: "14px", fontSize: '10px', color: 'var(--foreground)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', padding: '8px 14px' }}
                        itemStyle={{ color: 'var(--foreground)', fontWeight: 700 }}
                        labelStyle={{ color: 'var(--text-secondary)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}
                    />
                    {chart.yAxes.map((y: string, i: number) => <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />)}
                </ReLineChart>
            ) : (
                <RePieChart>
                    {chart.yAxes.map((y: string, i: number) => (
                        <Pie key={y} data={data} cx="50%" cy="50%" innerRadius={30 + (i*20)} outerRadius={45 + (i*20)} paddingAngle={5} dataKey={y} nameKey={chart.xAxis}>
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={1 - (i*0.4)} />)}
                        </Pie>
                    ))}
                    <Tooltip />
                </RePieChart>
            )}
        </SafeResponsiveContainer>
    );
  };

  return (
    <>
        {/* Glow Diagonal do Canto Superior Esquerdo */}
        <div className="fixed top-0 left-64 w-[800px] h-[800px] bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-neon-red/30 via-neon-red/5 to-transparent pointer-events-none z-0" />
        
        <div className="relative z-10 flex justify-between items-end mb-12">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-5xl font-black text-[var(--foreground)] mb-2 tracking-tighter italic uppercase drop-shadow-[0_0_12px_rgba(255,45,85,0.3)]">HUB <span className="text-neon-red">BI</span></h1>
                <div className="flex items-center gap-3 text-[var(--text-secondary)] font-bold text-[10px] uppercase tracking-widest">
                    <Activity size={12} className={isFetching ? "text-neon-red animate-pulse" : "text-[var(--text-secondary)] opacity-50"} />
                    Telemetria: {isFetching ? 'Sincronizando...' : error ? 'Offline' : 'Online'}
                </div>
            </motion.div>
            
            <div className="flex gap-4">
                <button onClick={() => router.push('/monitor')} className="flex items-center gap-2 bg-[var(--input-bg)] hover:bg-[var(--card-border)] text-[var(--foreground)] px-6 py-3 rounded-2xl border border-[var(--card-border)] transition-all text-xs font-black uppercase"><Monitor size={16} className="text-neon-red" /> Monitoramento</button>
                <button onClick={() => router.push('/designer')} className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] font-black px-6 py-3 rounded-2xl hover:bg-neon-red hover:text-white transition-all text-xs uppercase tracking-widest"><LayoutDashboard size={16} /> Designer</button>
            </div>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${layout.config?.columns || 12}, minmax(0, 1fr))`, gridAutoRows: `${layout.config?.rowHeight || 120}px` }}>
            {/* RENDER CARDS */}
            {layout.cards.map((kpi: any) => {
                const val = parseFloat(kpiData[kpi.id]) || 0;
                const status = getKpiStatus(kpi, val);
                return (
                    <div 
                        key={kpi.id} 
                        style={{ 
                            gridColumn: `${kpi.x || 'auto'} / span ${kpi.w || 3}`, 
                            gridRow: `${kpi.y || 'auto'} / span ${kpi.h || 1}` 
                        }}
                    >
                        <KpiCard 
                            title={kpi.title} 
                            value={val.toLocaleString('pt-BR')} 
                            trend={12} 
                            status={status} 
                            w={kpi.w} h={kpi.h} 
                            disablePulse={settings?.alert_pulse === false} 
                        />
                    </div>
                );
            })}

            {/* RENDER CHARTS */}
            {layout.charts.map((chart: any) => (
                <div 
                    key={chart.id} 
                    className="glass-card p-6 flex flex-col bg-[var(--card-bg)] border-[var(--card-border)] hover:border-neon-red/30 transition-all shadow-sm"
                    style={{ 
                        gridColumn: `${chart.x || 'auto'} / span ${chart.w || 6}`, 
                        gridRow: `${chart.y || 'auto'} / span ${chart.h || 3}` 
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xs font-black flex items-center gap-3 text-[var(--foreground)] uppercase tracking-widest">
                            {chart.chartType === 'ranking' ? <ListOrdered size={14} className="text-neon-red" /> : <TrendingUp className="text-neon-red" size={14} />}
                            {chart.title}
                        </h2>
                    </div>
                    <div className="flex-1 w-full overflow-hidden">
                        {renderChartContent(chart, chartDataMap[chart.id] || [])}
                    </div>
                </div>
            ))}

            {/* RENDER ALERTS */}
            {(layout.components || []).filter((c: any) => c.compType === 'alerts' || (c.type === 'components' && c.script_id === undefined)).map((comp: any) => (
                <div key={comp.id} className="glass-card flex flex-col bg-[var(--card-bg)] border-[var(--card-border)] overflow-hidden" style={{ gridColumn: `${comp.x || 'auto'} / span ${comp.w || 4}`, gridRow: `${comp.y || 'auto'} / span ${comp.h || 4}` }}>
                    <div className="p-6 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="text-critical animate-pulse" size={18} />
                            <h2 className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">{comp.title}</h2>
                        </div>
                        <button onClick={clearAlerts} className="text-[var(--text-secondary)] hover:text-critical transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left">
                        {alerts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                                <Shield size={40} className="mb-2 text-[var(--foreground)]" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--foreground)]">SISTEMA ESTÁVEL</span>
                            </div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`p-4 rounded-3xl border transition-all ${alert.type === 'critical' ? 'bg-critical/5 border-critical/10' : 'bg-warning/5 border-warning/10'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${alert.type === 'critical' ? 'bg-critical text-white shadow-lg shadow-critical/20' : 'bg-warning text-black shadow-lg shadow-warning/20'}`}>{alert.type === 'critical' ? 'CRÍTICO' : 'AVISO'}</span>
                                        <span className="text-[8px] text-[var(--text-secondary)] font-bold opacity-60">{alert.timestamp.toLocaleTimeString()}</span>
                                    </div>
                                    <p className="text-[11px] text-[var(--foreground)] font-black uppercase tracking-tighter mb-1">{alert.title}</p>
                                    <p className="text-[10px] text-[var(--text-secondary)] font-bold leading-tight">{alert.message}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}

            {/* RENDER REPORTS */}
            {(layout.components || []).filter((c: any) => c.compType === 'report' || (c.type === 'components' && c.script_id !== undefined)).map((comp: any) => {
                const baseRows = reportDataMap[comp.id] || [];
                const cols = baseRows.length > 0 ? Object.keys(baseRows[0]) : [];
                
                // Ordenação local
                const sortConfig = reportSortMap[comp.id];
                const sortedRows = [...baseRows];
                if (sortConfig) {
                    sortedRows.sort((a, b) => {
                        const valA = a[sortConfig.column];
                        const valB = b[sortConfig.column];
                        if (valA == null) return 1;
                        if (valB == null) return -1;
                        
                        const numA = Number(valA);
                        const numB = Number(valB);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
                        }
                        
                        const strA = String(valA).toLowerCase();
                        const strB = String(valB).toLowerCase();
                        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    });
                }

                // Paginação local
                const PAGE_SIZE = 20;
                const currentPage = reportPageMap[comp.id] || 1;
                const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE) || 1;
                const rows = sortedRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

                return (
                    <div
                        key={comp.id}
                        className="glass-card flex flex-col bg-[var(--card-bg)] border-[var(--card-border)] hover:border-neon-red/30 transition-all text-left shadow-sm overflow-hidden"
                        style={{ gridColumn: `${comp.x || 'auto'} / span ${comp.w || 6}`, gridRow: `${comp.y || 'auto'} / span ${comp.h || 3}` }}
                    >
                        <div className="p-5 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex items-center gap-3 flex-shrink-0">
                            <Database className="text-neon-red" size={14} />
                            <h2 className="text-xs font-black text-[var(--foreground)] uppercase tracking-widest flex-1">{comp.title}</h2>
                            <span className="text-[9px] font-black text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{sortedRows.length} linhas</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {cols.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-10">
                                    <Activity size={40} className="mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">SEM DADOS</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            {cols.map(col => {
                                                const isSorted = reportSortMap[comp.id]?.column === col;
                                                const direction = reportSortMap[comp.id]?.direction;
                                                return (
                                                    <th 
                                                        key={col} 
                                                        onClick={() => handleReportSort(comp.id, col)}
                                                        className="sticky top-0 z-10 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] border-b-2 border-[var(--card-border)] whitespace-nowrap shadow-sm cursor-pointer hover:bg-[var(--input-bg)] select-none transition-colors group" 
                                                        style={{ backgroundColor: 'var(--table-header-bg)' }}
                                                    >
                                                        <div className="flex items-center gap-1.5 justify-start">
                                                            <span>{col}</span>
                                                            {isSorted ? (
                                                                direction === 'asc' ? (
                                                                    <ArrowUp size={10} className="text-neon-red" />
                                                                ) : (
                                                                    <ArrowDown size={10} className="text-neon-red" />
                                                                )
                                                            ) : (
                                                                <ArrowUpDown size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                                                            )}
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, ri) => (
                                            <tr key={ri} className="border-b border-[var(--card-border)] hover:bg-neon-red/5 transition-colors group">
                                                {cols.map((col, ci) => (
                                                    <td key={col} className={`px-4 py-2.5 text-[10px] font-bold whitespace-nowrap ${ci === 0 ? 'text-[var(--foreground)]' : 'text-[var(--text-secondary)]'} transition-colors`}>
                                                        {String(row[col] ?? '—')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        {cols.length > 0 && totalPages > 1 && (
                            <div className="p-4 border-t border-[var(--card-border)] bg-[var(--input-bg)] flex items-center justify-between flex-shrink-0 text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                                <span>Pág. {currentPage} de {totalPages}</span>
                                <div className="flex gap-2">
                                    <button 
                                        disabled={currentPage === 1}
                                        onClick={() => setReportPageMap(prev => ({ ...prev, [comp.id]: currentPage - 1 }))}
                                        className="p-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center"
                                    >
                                        <ChevronLeft size={12} />
                                    </button>
                                    <button 
                                        disabled={currentPage === totalPages}
                                        onClick={() => setReportPageMap(prev => ({ ...prev, [comp.id]: currentPage + 1 }))}
                                        className="p-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--foreground)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center justify-center"
                                    >
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </>
  );
}
