"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  Palette, 
  RefreshCcw, 
  Database, 
  Shield, 
  Monitor, 
  HelpCircle,
  X,
  Sun,
  Moon,
  Volume2,
  MessageSquare,
  Zap,
  Bell,
  Clock
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    accent_color: "#ff2d55",
    refresh_interval: 30,
    system_mode: "DEMO",
    show_alerts: true,
    alert_popup: true,
    alert_sound: false,
    alert_pulse: true,
    alert_sidebar: true,
    alert_duration: 8, // New setting
    compact_view: false,
    theme: "dark"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(prev => ({ ...prev, ...data }));
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load settings", err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('http://127.0.0.1:8000/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      document.documentElement.setAttribute('data-theme', settings.theme);
      if (settings.accent_color) {
        document.documentElement.style.setProperty('--accent-color', settings.accent_color);
        localStorage.setItem("accent_color", settings.accent_color);
      }
      localStorage.setItem("theme", settings.theme);
      alert("Configurações salvas!");
    } catch (err) {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const descriptions: Record<string, string> = {
    accent_color: "Define a identidade visual de todo o BI. Esta cor será aplicada em botões, ícones ativos e detalhes de destaque.",
    theme: "Alterna entre o modo 'High-Impact Dark' (foco em monitoramento) e o modo 'Clean Light' (melhor para ambientes iluminados).",
    alert_popup: "Exibe uma notificação flutuante no canto da tela sempre que um KPI atinge o estado crítico.",
    alert_sound: "Emite um aviso sonoro (ping) discreto ao detectar uma anomalia nos dados.",
    alert_pulse: "Faz com que o card do KPI no dashboard pulse visualmente quando estiver em estado crítico.",
    alert_sidebar: "Exibe o contador de notificações e mantém o histórico de eventos no sino da barra lateral.",
    alert_duration: "Define por quanto tempo (em segundos) o pop-up de alerta deve permanecer visível na tela antes de desaparecer.",
    refresh_interval: "Define de quanto em quanto tempo o sistema busca novos dados no banco SQL.",
    system_mode: "O modo DEMO usa dados fictícios. O modo PRODUCTION conecta-se ao seu SQL Server real."
  };

  const InfoIcon = ({ id }: { id: string }) => (
    <button onClick={() => setActiveHelp(activeHelp === id ? null : id)} className={`ml-2 p-1 rounded-full transition-colors ${activeHelp === id ? 'bg-neon-red text-white' : 'text-gray-400 hover:text-white'}`}>
      <HelpCircle size={12} />
    </button>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><RefreshCcw className="animate-spin text-neon-red" size={32} /></div>;

  return (
    <>
      <div className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-[var(--foreground)] mb-2 uppercase tracking-tighter italic">Configurações do <span className="text-neon-red">Sistema</span></h1>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Personalize o comportamento e a estética do seu HUB BI.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-neon-red px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all flex items-center gap-3">
          {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />} Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        <AnimatePresence>
            {activeHelp && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 top-0 left-0 w-full p-6 bg-neon-red rounded-3xl shadow-2xl text-white">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Ajuda Técnica</span>
                        <button onClick={() => setActiveHelp(null)} className="text-white"><X size={18} /></button>
                    </div>
                    <p className="text-sm font-bold">{descriptions[activeHelp]}</p>
                </motion.div>
            )}
        </AnimatePresence>

        {/* COL 1: VISUAL & THEME */}
        <div className="lg:col-span-4 space-y-8">
            <div className="glass-card p-8 border-white/5 bg-white/[0.02]">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Palette size={16} className="text-neon-red" /> Estética</h3>
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center mb-4"><label className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tema</label><InfoIcon id="theme" /></div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setSettings({...settings, theme: 'light'})} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${settings.theme === 'light' ? 'border-neon-red bg-[var(--background)] text-[var(--foreground)]' : 'border-transparent bg-white/5 text-gray-500'}`}><Sun size={20} /><span className="text-[10px] font-black uppercase">Claro</span></button>
                            <button onClick={() => setSettings({...settings, theme: 'dark'})} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${settings.theme === 'dark' ? 'border-neon-red bg-[var(--background)] text-[var(--foreground)]' : 'border-transparent bg-white/5 text-gray-500'}`}><Moon size={20} /><span className="text-[10px] font-black uppercase">Escuro</span></button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card p-8 border-white/5 bg-white/[0.02]">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={16} className="text-neon-red" /> Tempo de Exibição</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Duração Alerta</span><span className="text-neon-red font-black text-xs">{settings.alert_duration}s</span><InfoIcon id="alert_duration" /></div>
                    <input type="range" min="3" max="60" step="1" value={settings.alert_duration} onChange={(e) => setSettings({...settings, alert_duration: Number(e.target.value)})} className="w-full accent-neon-red" />
                    <p className="text-[9px] text-gray-700 font-bold uppercase text-center italic">Tempo que o pop-up fica na tela</p>
                </div>
            </div>
        </div>

        {/* COL 2: ALERTS GRANULAR */}
        <div className="lg:col-span-8 space-y-8">
            <div className="glass-card p-8 border-neon-red/10 bg-gradient-to-br from-white/[0.03] to-transparent">
                <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8 flex items-center gap-2"><Bell size={16} className="text-neon-red" /> Central de Alertas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { id: 'alert_popup', label: 'Notificações Pop-up', icon: MessageSquare },
                        { id: 'alert_sound', label: 'Alertas Sonoros', icon: Volume2 },
                        { id: 'alert_pulse', label: 'Pulso Visual (Cards)', icon: Zap },
                        { id: 'alert_sidebar', label: 'Histórico na Sidebar', icon: Bell }
                    ].map(item => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-[var(--input-bg)] rounded-3xl border border-[var(--card-border)] hover:border-neon-red/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${settings[item.id as keyof typeof settings] ? 'bg-neon-red/10 text-neon-red' : 'bg-[var(--card-border)] text-[var(--text-secondary)]'}`}><item.icon size={20} /></div>
                                <div><div className="flex items-center"><p className="text-sm font-black text-[var(--foreground)] uppercase tracking-tighter">{item.label}</p><InfoIcon id={item.id} /></div></div>
                            </div>
                            <button onClick={() => setSettings({ ...settings, [item.id]: !settings[item.id as keyof typeof settings] })} className={`w-12 h-6 rounded-full relative transition-all ${settings[item.id as keyof typeof settings] ? 'bg-neon-red shadow-[0_0_10px_#ff2d55]' : 'bg-[var(--card-border)]'}`}>
                                <motion.div animate={{ x: settings[item.id as keyof typeof settings] ? 26 : 4 }} className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card p-8 border-white/5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><RefreshCcw size={16} /> Refresh</h3>
                    <div className="flex justify-between items-center mb-2"><span className="text-xs font-black text-gray-400">INTERVALO</span><span className="text-neon-red font-black">{settings.refresh_interval}s</span><InfoIcon id="refresh_interval" /></div>
                    <input type="range" min="5" max="300" step="5" value={settings.refresh_interval} onChange={(e) => setSettings({...settings, refresh_interval: Number(e.target.value)})} className="w-full accent-neon-red" />
                </div>
                <div>
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Database size={16} /> Motor de Dados</h3>
                    <div className="flex items-center mb-2"><span className="text-[10px] font-black text-gray-700 uppercase">MODO OPERACIONAL</span><InfoIcon id="system_mode" /></div>
                    <select value={settings.system_mode} onChange={(e) => setSettings({...settings, system_mode: e.target.value})} className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] rounded-xl p-3 text-xs font-black text-neon-red uppercase tracking-widest outline-none focus:border-neon-red/50">
                        <option value="DEMO">MODO DEMO (SIMULADOR)</option>
                        <option value="PRODUCTION">MODO PRODUÇÃO (SQL REAL)</option>
                    </select>
                </div>
            </div>
        </div>
      </div>
    </>
  );
}
