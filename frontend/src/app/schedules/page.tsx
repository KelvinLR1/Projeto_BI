"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarClock, Plus, Trash2, Play, Pause, Clock, FileText,
  FolderOpen, Save, X, CheckCircle, AlertCircle, RefreshCcw,
  FileSpreadsheet, File, ChevronDown, ToggleLeft, ToggleRight, Edit2
} from 'lucide-react';
import { fetchWithCache, readCache } from '@/utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string;
  name: string;
  report_id: string;
  report_name?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: string;              // "HH:MM"
  days_of_week: number[];    // 0=Dom … 6=Sáb
  day_of_month: number;      // 1-31
  cron_expression: string;   // custom
  format: 'pdf' | 'xlsx' | 'csv' | 'png';
  output_path: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  custom: 'Personalizado (Cron)',
};

const FORMAT_OPTIONS = [
  { value: 'pdf',  label: 'PDF',   icon: File,            color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20' },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet, color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/20' },
  { value: 'csv',  label: 'CSV',   icon: FileText,        color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/20' },
  { value: 'txt',  label: 'TXT',   icon: FileText,        color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
];

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const emptySchedule = (): Omit<Schedule, 'id' | 'created_at'> => ({
  name: '',
  report_id: '',
  frequency: 'daily',
  time: '08:00',
  days_of_week: [1],
  day_of_month: 1,
  cron_expression: '0 8 * * *',
  format: 'pdf',
  output_path: '',
  enabled: true,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function nextRunLabel(schedule: Schedule): string {
  if (!schedule.enabled) return 'Desabilitado';
  if (schedule.next_run) {
    return new Date(schedule.next_run).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  return '—';
}

function formatIcon(fmt: string) {
  return FORMAT_OPTIONS.find(f => f.value === fmt) ?? FORMAT_OPTIONS[0];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySchedule());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Carrega schedules e reports do backend
  const load = useCallback(async () => {
    try {
      const [sched, rep] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/schedules').then(r => r.ok ? r.json() : []).catch(() => []),
        fetchWithCache<any[]>('http://127.0.0.1:8000/api/reports').catch(() => []),
      ]);
      setSchedules(Array.isArray(sched) ? sched : []);
      setReports(Array.isArray(rep) ? rep : []);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ─────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(emptySchedule());
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      report_id: s.report_id,
      frequency: s.frequency,
      time: s.time,
      days_of_week: s.days_of_week,
      day_of_month: s.day_of_month,
      cron_expression: s.cron_expression,
      format: s.format,
      output_path: s.output_path,
      enabled: s.enabled,
    });
    setShowForm(true);
  };

  const toggleDay = (d: number) =>
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Informe um nome para o agendamento.', 'err');
    if (!form.output_path.trim()) return showToast('Informe o caminho de saída.', 'err');
    setSaving(true);
    try {
      const url = editingId
        ? `http://127.0.0.1:8000/api/schedules/${editingId}`
        : 'http://127.0.0.1:8000/api/schedules';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      showToast(editingId ? 'Agendamento atualizado!' : 'Agendamento criado!');
      setShowForm(false);
      load();
    } catch {
      showToast('Erro ao salvar agendamento.', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`http://127.0.0.1:8000/api/schedules/${id}`, { method: 'DELETE' });
      setSchedules(s => s.filter(x => x.id !== id));
      showToast('Agendamento removido.');
    } catch {
      showToast('Erro ao remover.', 'err');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (s: Schedule) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/schedules/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...s, enabled: !s.enabled }),
      });
      setSchedules(prev => prev.map(x => x.id === s.id ? { ...x, enabled: !x.enabled } : x));
    } catch {
      showToast('Erro ao alterar status.', 'err');
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl text-sm font-black uppercase tracking-wider ${
              toast.type === 'ok'
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className={isLoaded ? 'content-reveal' : 'opacity-0 pointer-events-none'}>
        {/* ── Header ── */}
        <div className="mb-10 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-[var(--foreground)] mb-2 uppercase tracking-tighter italic">
              Agendamento de <span className="text-neon-red">Relatórios</span>
            </h1>
            <p className="text-[var(--text-secondary)] font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <CalendarClock size={14} className="text-neon-red" />
              Configure geração automática de relatórios em horários definidos.
            </p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-neon-red hover:bg-neon-red/80 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-lg shadow-neon-red/25 hover:scale-105 active:scale-95"
          >
            <Plus size={14} /> Novo Agendamento
          </button>
        </div>

        {/* ── Lista de Agendamentos ── */}
        {schedules.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-24 gap-4">
            <CalendarClock size={48} className="text-gray-700" />
            <p className="text-[11px] font-black text-gray-600 uppercase tracking-widest">Nenhum agendamento configurado ainda.</p>
            <button onClick={openNew} className="mt-2 text-[10px] font-black text-neon-red uppercase tracking-widest hover:underline">
              Criar o primeiro agendamento →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {schedules.map(s => {
                const fmtOpt = formatIcon(s.format);
                const FmtIcon = fmtOpt.icon;
                return (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`glass-card p-6 flex items-center gap-6 transition-all ${!s.enabled ? 'opacity-50' : ''}`}
                  >
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.enabled ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-gray-600'}`} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-black text-[var(--foreground)] truncate">{s.name}</span>
                        <span className="text-[8px] font-black bg-white/5 text-[var(--text-secondary)] px-2 py-0.5 rounded-full uppercase tracking-widest border border-white/10">
                          {FREQUENCY_LABELS[s.frequency]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-[var(--text-secondary)] font-bold">
                        <span className="flex items-center gap-1"><Clock size={10} /> {s.time}</span>
                        <span className="flex items-center gap-1"><FolderOpen size={10} /> <span className="truncate max-w-[200px]">{s.output_path || '—'}</span></span>
                        <span className="flex items-center gap-1"><CalendarClock size={10} /> Próximo: {nextRunLabel(s)}</span>
                      </div>
                    </div>

                    {/* Format badge */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider ${fmtOpt.bg} ${fmtOpt.color}`}>
                      <FmtIcon size={12} /> {s.format.toUpperCase()}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(s)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        title={s.enabled ? 'Desabilitar' : 'Habilitar'}
                      >
                        {s.enabled ? <Pause size={14} className="text-green-400" /> : <Play size={14} className="text-gray-500" />}
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={14} className="text-[var(--text-secondary)]" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="p-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 transition-all"
                        title="Remover"
                      >
                        {deletingId === s.id
                          ? <RefreshCcw size={14} className="text-gray-500 animate-spin" />
                          : <Trash2 size={14} className="text-gray-600 hover:text-red-400" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Modal / Form ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 60, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="fixed top-0 right-0 h-full w-[520px] bg-[var(--sidebar-bg)] border-l border-[var(--card-border)] z-[201] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--card-border)] bg-[var(--input-bg)] flex-shrink-0">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--foreground)]">
                    {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
                  </h2>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold mt-0.5 uppercase tracking-wider">
                    Configure período, formato e destino
                  </p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-white/10 transition-all">
                  <X size={16} className="text-[var(--text-secondary)]" />
                </button>
              </div>

              {/* Panel Body */}
              <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7 custom-scrollbar">

                {/* Nome */}
                <Field label="Nome do Agendamento">
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex.: Relatório Mensal de Vendas"
                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-xs font-bold focus:border-neon-red/50 focus:outline-none transition-colors placeholder:text-gray-600"
                  />
                </Field>

                {/* Relatório (opcional) */}
                <Field label="Relatório de Origem" hint="Opcional — vincule a um relatório existente">
                  <select
                    value={form.report_id}
                    onChange={e => setForm(f => ({ ...f, report_id: e.target.value }))}
                    className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-xs font-bold focus:border-neon-red/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">-- Nenhum --</option>
                    {reports.map(r => (
                      <option key={r.id} value={r.id}>{r.name || r.title}</option>
                    ))}
                  </select>
                </Field>

                {/* Frequência */}
                <Field label="Frequência de Geração">
                  <div className="grid grid-cols-4 gap-2">
                    {(['daily', 'weekly', 'monthly', 'custom'] as const).map(freq => (
                      <button
                        key={freq}
                        onClick={() => setForm(f => ({ ...f, frequency: freq }))}
                        className={`py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                          form.frequency === freq
                            ? 'bg-neon-red/20 border-neon-red text-white'
                            : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-neon-red/30'
                        }`}
                      >
                        {FREQUENCY_LABELS[freq]}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Horário */}
                <Field label="Horário de Execução">
                  <div className="relative">
                    <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl pl-10 pr-4 py-3 text-xs font-black focus:border-neon-red/50 focus:outline-none transition-colors"
                    />
                  </div>
                </Field>

                {/* Dias da semana (weekly) */}
                {form.frequency === 'weekly' && (
                  <Field label="Dias da Semana">
                    <div className="flex gap-2 flex-wrap">
                      {DAYS.map((day, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay(i)}
                          className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase transition-all border ${
                            form.days_of_week.includes(i)
                              ? 'bg-neon-red/20 border-neon-red text-white'
                              : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-neon-red/30'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                {/* Dia do mês (monthly) */}
                {form.frequency === 'monthly' && (
                  <Field label="Dia do Mês">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={form.day_of_month}
                      onChange={e => setForm(f => ({ ...f, day_of_month: parseInt(e.target.value) || 1 }))}
                      className="w-32 bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-xs font-black text-center focus:border-neon-red/50 focus:outline-none transition-colors"
                    />
                  </Field>
                )}

                {/* Cron Expression (custom) */}
                {form.frequency === 'custom' && (
                  <Field label="Expressão Cron" hint='Ex.: "0 8 * * 1" = toda segunda às 08:00'>
                    <input
                      value={form.cron_expression}
                      onChange={e => setForm(f => ({ ...f, cron_expression: e.target.value }))}
                      placeholder="0 8 * * *"
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl px-4 py-3 text-xs font-mono font-bold focus:border-neon-red/50 focus:outline-none transition-colors placeholder:text-gray-600"
                    />
                  </Field>
                )}

                {/* Formato do arquivo */}
                <Field label="Formato de Saída">
                  <div className="grid grid-cols-4 gap-3">
                    {FORMAT_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setForm(f => ({ ...f, format: opt.value as any }))}
                          className={`flex flex-col items-center gap-2 py-4 rounded-2xl border transition-all ${
                            form.format === opt.value
                              ? `${opt.bg} ${opt.color} scale-105`
                              : 'bg-[var(--input-bg)] border-[var(--card-border)] text-[var(--text-secondary)] hover:border-white/20'
                          }`}
                        >
                          <Icon size={20} />
                          <span className="text-[9px] font-black uppercase tracking-wider">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Caminho de saída */}
                <Field label="Local de Saída (Caminho)" hint="Caminho completo da pasta onde o arquivo será salvo">
                  <div className="relative">
                    <FolderOpen size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      value={form.output_path}
                      onChange={e => setForm(f => ({ ...f, output_path: e.target.value }))}
                      placeholder="C:\Relatórios\Vendas ou /home/user/reports"
                      className="w-full bg-[var(--input-bg)] border border-[var(--card-border)] text-[var(--foreground)] rounded-xl pl-10 pr-4 py-3 text-xs font-bold focus:border-neon-red/50 focus:outline-none transition-colors placeholder:text-gray-600"
                    />
                  </div>
                </Field>

                {/* Habilitado */}
                <Field label="Status do Agendamento">
                  <button
                    onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                    className="flex items-center gap-3 group"
                  >
                    {form.enabled
                      ? <ToggleRight size={32} className="text-green-400 transition-all" />
                      : <ToggleLeft  size={32} className="text-gray-600 transition-all" />
                    }
                    <span className={`text-xs font-black uppercase tracking-wider ${form.enabled ? 'text-green-400' : 'text-gray-600'}`}>
                      {form.enabled ? 'Habilitado — gerará no próximo ciclo' : 'Desabilitado'}
                    </span>
                  </button>
                </Field>
              </div>

              {/* Panel Footer */}
              <div className="flex gap-3 px-8 py-5 border-t border-[var(--card-border)] bg-[var(--input-bg)] flex-shrink-0">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 rounded-xl border border-[var(--card-border)] text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-neon-red text-white text-[10px] font-black uppercase tracking-widest hover:bg-neon-red/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-neon-red/20"
                >
                  {saving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />}
                  {editingId ? 'Atualizar' : 'Criar Agendamento'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <label className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{label}</label>
        {hint && <span className="text-[8px] text-gray-600 font-bold italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
