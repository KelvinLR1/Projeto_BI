"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/context/AlertContext";

// ─── Progress Bar ──────────────────────────────────────────────────────────────
function NavProgressBar({ active }: { active: boolean }) {
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setOpacity(1);
      setWidth(0);
      const t1 = setTimeout(() => setWidth(30), 20);
      const t2 = setTimeout(() => setWidth(65), 150);
      const t3 = setTimeout(() => setWidth(85), 400);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setWidth(100);
      const t1 = setTimeout(() => setOpacity(0), 200);
      const t2 = setTimeout(() => setVisible(false), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [active]);

  if (!visible) return null;

  const barTransition =
    width === 100 ? 'width 0.2s ease-out, opacity 0.25s ease-out' :
    width === 30  ? 'width 0.15s ease-out' :
                   'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none">
      <div
        style={{
          width: `${width}%`,
          opacity,
          transition: barTransition,
          background: 'linear-gradient(90deg, var(--neon-red), rgba(255,45,85,0.7))',
          boxShadow: '0 0 12px rgba(255,45,85,0.6), 0 0 4px rgba(255,45,85,0.9)',
          height: '100%',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
}

// ─── Page Wrapper ──────────────────────────────────────────────────────────────
// Usa um key numérico que muda a cada navegação para forçar re-mount
// e re-disparar a animação CSS .page-enter sem depender de framer-motion
function PageWrapper({ children, navKey }: { children: React.ReactNode; navKey: number }) {
  return (
    <div key={navKey} className="page-enter min-h-full w-full">
      {children}
    </div>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────────
export default function BILayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMonitor = pathname === "/monitor";
  const { addAlert } = useAlerts();
  const alertedKpis = useRef<Set<string>>(new Set());
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navKey, setNavKey] = useState(0);
  const prevPathname = useRef(pathname);

  // Detecta troca de rota → incrementa key (força re-mount do PageWrapper) + ativa progress bar
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      setNavKey(k => k + 1);
      setIsNavigating(true);
      const t = setTimeout(() => setIsNavigating(false), 700);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  const playAlertSound = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFRm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT18AAAAA");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const checkAlerts = useCallback(async (settings: any) => {
    if (!settings.show_alerts) return;
    try {
        const [homeRes, nocRes, scriptsRes] = await Promise.all([
            fetch('http://127.0.0.1:8000/api/layouts/home').catch(() => null),
            fetch('http://127.0.0.1:8000/api/layouts/noc').catch(() => null),
            fetch('http://127.0.0.1:8000/api/scripts').catch(() => null)
        ]);
        if (!homeRes?.ok || !nocRes?.ok || !scriptsRes?.ok) return;
        const home = await homeRes.json();
        const noc = await nocRes.json();
        const allKpis = [...(home.cards || []), ...(noc.cards || [])];
        const scripts = await scriptsRes.json();

        for (const kpi of allKpis) {
            if (kpi.kpi_mode === 'info') continue;
            const script = scripts.find((s: any) => s.id === kpi.script_id);
            if (!script) continue;
            const execRes = await fetch('http://127.0.0.1:8000/api/scripts/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: script.query })
            }).catch(() => null);
            if (!execRes?.ok) continue;
            const data = await execRes.json();
            if (data.length > 0) {
                const val = parseFloat(data[0][kpi.column]) || 0;
                const alertKey = `${kpi.id}-${val < kpi.threshold_warning ? 'critical' : val < kpi.threshold_success ? 'warning' : 'ok'}`;
                if (val < kpi.threshold_warning && !alertedKpis.current.has(alertKey)) {
                    if (settings.alert_sidebar) addAlert(`ALERTA CRÍTICO: ${kpi.title}`, `Valor ${val.toLocaleString('pt-BR')} abaixo do limite crítico.`, 'critical');
                    if (settings.alert_sound) playAlertSound();
                    alertedKpis.current.add(alertKey);
                } else if (val < kpi.threshold_success && !alertedKpis.current.has(alertKey)) {
                    if (settings.alert_sidebar) addAlert(`AVISO: ${kpi.title}`, `Valor ${val.toLocaleString('pt-BR')} abaixo da meta de sucesso.`, 'warning');
                    alertedKpis.current.add(alertKey);
                } else {
                    alertedKpis.current.forEach(key => { if (key.startsWith(kpi.id)) alertedKpis.current.delete(key); });
                }
            }
        }
    } catch (e) { console.error("Monitor error:", e); }
  }, [addAlert]);

  // Aplica tema do localStorage antes do primeiro render (anti-flash de cor)
  useEffect(() => {
    const cachedTheme = localStorage.getItem("theme");
    const cachedAccent = localStorage.getItem("accent_color");
    if (cachedTheme) document.documentElement.setAttribute('data-theme', cachedTheme);
    if (cachedAccent) document.documentElement.style.setProperty('--accent-color', cachedAccent);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;
    let attempt = 0;
    const MAX_ATTEMPTS = 10;

    const loadSettings = () => {
      fetch('http://127.0.0.1:8000/api/settings')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          if (!isMounted) return;
          attempt = 0;
          setAppSettings(data);
          if (data.accent_color) { document.documentElement.style.setProperty('--accent-color', data.accent_color); localStorage.setItem("accent_color", data.accent_color); }
          if (data.theme) { document.documentElement.setAttribute('data-theme', data.theme); localStorage.setItem("theme", data.theme); }
          checkAlerts(data);
          interval = setInterval(() => checkAlerts(data), (data.refresh_interval || 30) * 1000);
        })
        .catch(() => {
          attempt++;
          if (!isMounted || attempt >= MAX_ATTEMPTS) return;
          timeout = setTimeout(loadSettings, Math.min(2000 * Math.pow(2, attempt - 1), 30000));
        });
    };

    loadSettings();
    return () => { isMounted = false; clearInterval(interval); clearTimeout(timeout); };
  }, [checkAlerts]);

  const { isSidebarCollapsed, toggleSidebar } = useAlerts();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIsInitialLoad(false), 50);
    return () => clearTimeout(t);
  }, []);

  if (isMonitor) {
    return (
      <div className="bg-[var(--background)] min-h-screen overflow-x-hidden">
        <NavProgressBar active={isNavigating} />
        <PageWrapper navKey={navKey}>{children}</PageWrapper>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] overflow-x-hidden">
      <NavProgressBar active={isNavigating} />
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} isInitialLoad={isInitialLoad} />
      <main
        style={{ marginLeft: isSidebarCollapsed ? 80 : 256 }}
        className={`flex-1 p-6 overflow-x-hidden will-change-[margin-left] ${isInitialLoad ? "" : "transition-[margin-left] duration-300 ease-in-out"}`}
      >
        <PageWrapper navKey={navKey}>{children}</PageWrapper>
      </main>
    </div>
  );
}
