"use client";

import React, { useState, useEffect, useCallback } from 'react';
import BILayout from '@/components/BI/Layout';
import KpiCard from '@/components/BI/KpiCard';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Activity, 
    Monitor, 
    AlertCircle, 
    RefreshCcw, 
    Shield, 
    Cpu, 
    Wifi, 
    Database, 
    Clock,
    Zap,
    TrendingUp,
    ListOrdered,
    Bell,
    Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, 
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { useAlerts } from '@/context/AlertContext';

export default function MonitorPage() {
  const router = useRouter();
  const { alerts, clearAlerts, markAsRead } = useAlerts();
  const [layout, setLayout] = useState<{cards: any[], charts: any[], components: any[], config?: any}>({ cards: [], charts: [], components: [] });
  const [kpiData, setKpiData] = useState<Record<string, any>>({});
  const [chartDataMap, setChartDataMap] = useState<Record<string, any[]>>({});
  const [reportDataMap, setReportDataMap] = useState<Record<string, any[]>>({});
  const [settings, setSettings] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [time, setTime] = useState(new Date());

  const COLORS = ['#ff2d55', '#00ff88', '#ffb700', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981'];

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const [layoutRes, settingsRes, scriptsRes] = await Promise.all([
        fetch('http://localhost:8000/api/layouts/noc'),
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

      // Fetch KPI Data
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

      // Fetch Chart Data
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
          const agg: Record<string, any> = {};
          result.forEach((row: any) => {
            const key = String(row[chart.xAxis] || "N/A");
            if (!agg[key]) {
                agg[key] = { [chart.xAxis]: key };
                chart.yAxes.forEach((y: string) => agg[key][y] = 0);
            }
            chart.yAxes.forEach((y: string) => agg[key][y] += parseFloat(row[y]) || 0);
          });
          newChartData[chart.id] = Object.values(agg);
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

    } catch (err) { console.error(err); }
    finally { setIsFetching(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, (settings?.refresh_interval || 30) * 1000);
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clock); };
  }, [fetchData, settings?.refresh_interval]);

  const renderChart = (chart: any, data: any[]) => (
    <ResponsiveContainer width="100%" height="100%">
        {chart.chartType === 'bar' ? (
            <ReBarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey={chart.xAxis} stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--accent-color)", borderRadius: "12px", fontSize: '10px', color: 'var(--foreground)' }} />
                {chart.yAxes.map((y: string, i: number) => <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />)}
            </ReBarChart>
        ) : (
            <ReLineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
                <XAxis dataKey={chart.xAxis} stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--accent-color)", borderRadius: "12px", fontSize: '10px', color: 'var(--foreground)' }} />
                {chart.yAxes.map((y: string, i: number) => <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />)}
            </ReLineChart>
        )}
    </ResponsiveContainer>
  );

  return (
    <BILayout>
      <div className="flex flex-col gap-10 min-h-screen p-12 px-16">
        {/* HEADER MONITOR */}
        <header className="flex justify-between items-center bg-[var(--card-bg)] p-8 rounded-[40px] border border-[var(--card-border)] shadow-sm">
            <div className="flex items-center gap-6">
                <div className="bg-neon-red/20 p-4 rounded-3xl shadow-lg shadow-neon-red/20">
                    <Shield className="text-neon-red w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-[var(--foreground)] italic uppercase tracking-tighter">NOC <span className="text-neon-red">CENTER</span></h1>
                    <p className="text-[10px] font-black text-[var(--text-secondary)] opacity-40 uppercase tracking-[0.3em]">Sincronização de Grade Ativa</p>
                </div>
            </div>

            <div className="flex items-center gap-12">
                <div className="text-right">
                    <div className="flex items-center gap-2 justify-end text-[10px] font-black text-success uppercase tracking-widest mb-1">
                        <div className="w-2 h-2 bg-success rounded-full animate-ping" /> Status do Cluster
                    </div>
                    <div className="text-2xl font-black text-[var(--foreground)] italic uppercase">Online</div>
                </div>
                <div className="text-5xl font-black text-[var(--foreground)] tracking-tighter w-48 text-right tabular-nums">
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </header>

        {/* DYNAMIC GRID CONTENT */}
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${layout.config?.columns || 12}, minmax(0, 1fr))`, gridAutoRows: `${layout.config?.rowHeight || 100}px` }}>
            {/* RENDER CARDS */}
            {layout.cards.map((kpi: any) => (
                <div key={kpi.id} style={{ gridColumn: `${kpi.x} / span ${kpi.w}`, gridRow: `${kpi.y} / span ${kpi.h}` }}>
                    <KpiCard 
                        title={kpi.title} value={parseFloat(kpiData[kpi.id] || 0).toLocaleString('pt-BR')} 
                        trend={12} status={kpi.kpi_mode === 'info' ? 'info' : (parseFloat(kpiData[kpi.id]) >= kpi.threshold_success ? 'success' : 'critical')} 
                        w={kpi.w} h={kpi.h} disablePulse={settings?.alert_pulse === false} 
                    />
                </div>
            ))}

            {/* RENDER CHARTS */}
            {layout.charts.map((chart: any) => (
                <div key={chart.id} className="glass-card p-6 flex flex-col bg-[var(--card-bg)] border-[var(--card-border)]" style={{ gridColumn: `${chart.x} / span ${chart.w}`, gridRow: `${chart.y} / span ${chart.h}` }}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xs font-black flex items-center gap-3 text-[var(--foreground)] uppercase tracking-widest"><TrendingUp className="text-neon-red" size={14} />{chart.title}</h2>
                    </div>
                    <div className="flex-1 w-full overflow-hidden">{renderChart(chart, chartDataMap[chart.id] || [])}</div>
                </div>
            ))}

            {/* RENDER ALERTS (COMPONENTS) */}
            {layout.components.filter(c => c.type === 'alerts').map((comp: any) => (
                <div key={comp.id} className="glass-card flex flex-col bg-[var(--card-bg)] border-[var(--card-border)]" style={{ gridColumn: `${comp.x} / span ${comp.w}`, gridRow: `${comp.y} / span ${comp.h}` }}>
                    <div className="p-6 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex justify-between items-center rounded-t-[40px]">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="text-critical animate-pulse" size={18} />
                            <h2 className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">{comp.title}</h2>
                        </div>
                        <button onClick={clearAlerts} className="text-[var(--text-secondary)] hover:text-critical transition-colors"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
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

            {/* RENDER REPORTS (COMPONENTS) */}
            {layout.components.filter(c => c.type === 'report').map((comp: any) => {
                const rows = reportDataMap[comp.id] || [];
                const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
                return (
                    <div key={comp.id} className="glass-card flex flex-col bg-[var(--card-bg)] border-[var(--card-border)]" style={{ gridColumn: `${comp.x} / span ${comp.w}`, gridRow: `${comp.y} / span ${comp.h}` }}>
                        <div className="p-5 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex items-center gap-3 flex-shrink-0 rounded-t-[40px]">
                            <Database className="text-neon-red" size={16} />
                            <h2 className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest flex-1">{comp.title}</h2>
                            <span className="text-[9px] font-black text-[var(--text-secondary)] opacity-60 uppercase tracking-widest">{rows.length} linhas</span>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {cols.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20">
                                    <Database size={40} className="mb-2" />
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
                                            <tr key={ri} className="border-b border-[var(--card-border)] opacity-100 hover:bg-neon-red/5 transition-colors group">
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
      </div>
    </BILayout>
  );
}
