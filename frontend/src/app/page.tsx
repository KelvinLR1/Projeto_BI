"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import BILayout from '@/components/BI/Layout';
import KpiCard from '@/components/BI/KpiCard';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, LayoutDashboard, Monitor, AlertCircle, RefreshCcw, ListOrdered, BarChart as BarIcon, LineChart as LineIcon, PieChart as PieIcon, Database, Trash2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { useAlerts } from '@/context/AlertContext';

export default function Dashboard() {
  const router = useRouter();
  const { alerts, clearAlerts } = useAlerts();
  const [layout, setLayout] = useState<{cards: any[], charts: any[], components: any[], config?: any}>({ cards: [], charts: [], components: [] });
  const [kpiData, setKpiData] = useState<Record<string, any>>({});
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  const [reportDataMap, setReportDataMap] = useState<Record<string, any[]>>({});
  const [settings, setSettings] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(false);

  const COLORS = ['#ff2d55', '#00ff88', '#ffb700', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const [layoutRes, settingsRes, scriptsRes] = await Promise.all([
        fetch('http://localhost:8000/api/layouts/home'),
        fetch('http://localhost:8000/api/settings'),
        fetch('http://localhost:8000/api/scripts')
      ]);
      
      const layoutData = await layoutRes.json();
      const settingsData = await settingsRes.json();
      const scripts = await scriptsRes.json();
      
      setSettings(settingsData);
      setLayout({
        cards: Array.isArray(layoutData.cards) ? layoutData.cards : [],
        charts: Array.isArray(layoutData.charts) ? layoutData.charts : [],
        components: Array.isArray(layoutData.components) ? layoutData.components : [],
        config: layoutData.config
      });

      // Fetch Data for Cards
      const newKpiData: Record<string, any> = {};
      for (const kpi of layoutData.cards || []) {
        const script = scripts.find((s: any) => s.id === kpi.script_id);
        if (script) {
          const res = await fetch('http://localhost:8000/api/scripts/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: script.query })
          });
          const result = await res.json();
          if (result.length > 0) newKpiData[kpi.id] = result[0][kpi.column];
        }
      }
      setKpiData(newKpiData);

      // Fetch Data for Charts
      const newChartData: Record<string, any[]> = {};
      for (const chart of layoutData.charts || []) {
        const script = scripts.find((s: any) => s.id === chart.script_id);
        if (script) {
          const res = await fetch('http://localhost:8000/api/scripts/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: script.query })
          });
          const result = await res.json();
          
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
          newChartData[chart.id] = finalData;
        }
      }
      setChartDataMap(newChartData);

      // Fetch Report Data
      const newReportData: Record<string, any[]> = {};
      for (const comp of (layoutData.components || []).filter((c: any) => c.type === 'report')) {
        const script = scripts.find((s: any) => s.id === comp.script_id);
        if (script) {
          const res = await fetch('http://localhost:8000/api/scripts/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: script.query })
          });
          const result = await res.json();
          newReportData[comp.id] = Array.isArray(result) ? result : [];
        }
      }
      setReportDataMap(newReportData);

      setError(false);
    } catch (err) {
      setError(true);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Use dynamic interval from settings or default to 30s
    const intervalTime = (settings?.refresh_interval || 30) * 1000;
    const interval = setInterval(fetchData, intervalTime);
    return () => clearInterval(interval);
  }, [fetchData, settings?.refresh_interval]);

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

    return (
        <ResponsiveContainer width="100%" height="100%">
            {chart.chartType === 'bar' ? (
                <ReBarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                    <XAxis dataKey={chart.xAxis} stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--accent-color)", borderRadius: "12px", fontSize: '10px', color: 'var(--foreground)' }} />
                    {chart.yAxes.map((y: string, i: number) => <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />)}
                </ReBarChart>
            ) : chart.chartType === 'line' ? (
                <ReLineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                    <XAxis dataKey={chart.xAxis} stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--accent-color)", borderRadius: "12px", fontSize: '10px', color: 'var(--foreground)' }} />
                    {chart.yAxes.map((y: string, i: number) => <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}
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
        </ResponsiveContainer>
    );
  };

  return (
    <BILayout>
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
            {(layout.components || []).filter((c: any) => c.type === 'alerts').map((comp: any) => (
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
            {(layout.components || []).filter((c: any) => c.type === 'report').map((comp: any) => {
                const rows = reportDataMap[comp.id] || [];
                const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
                return (
                    <div
                        key={comp.id}
                        className="glass-card flex flex-col bg-[var(--card-bg)] border-[var(--card-border)] hover:border-neon-red/30 transition-all text-left shadow-sm overflow-hidden"
                        style={{ gridColumn: `${comp.x || 'auto'} / span ${comp.w || 6}`, gridRow: `${comp.y || 'auto'} / span ${comp.h || 3}` }}
                    >
                        <div className="p-5 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex items-center gap-3 flex-shrink-0">
                            <Database className="text-neon-red" size={14} />
                            <h2 className="text-xs font-black text-[var(--foreground)] uppercase tracking-widest flex-1">{comp.title}</h2>
                            <span className="text-[9px] font-black text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{rows.length} linhas</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {cols.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-10">
                                    <Activity size={40} className="mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">SEM DADOS</span>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[var(--input-bg)] z-10">
                                        <tr>
                                            {cols.map(col => (
                                                <th key={col} className="px-4 py-3 text-[8px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-70 border-b border-[var(--card-border)] whitespace-nowrap">{col}</th>
                                            ))}
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
                    </div>
                );
            })}
        </div>
    </BILayout>
  );
}
