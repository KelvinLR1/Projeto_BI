"use client";

import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/context/AlertContext";
import { motion, AnimatePresence } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

const pageTransition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as any,
};

export default function BILayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMonitor = pathname === "/monitor";
  const { addAlert } = useAlerts();
  const alertedKpis = useRef<Set<string>>(new Set());
  const [appSettings, setAppSettings] = useState<any>(null);

  const playAlertSound = () => {
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFRm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YV9vT18AAAAA");
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const checkAlerts = async (settings: any) => {
    if (!settings.show_alerts) return;

    try {
        const [homeRes, nocRes, scriptsRes] = await Promise.all([
            fetch('http://127.0.0.1:8000/api/layouts/home').catch(() => null),
            fetch('http://127.0.0.1:8000/api/layouts/noc').catch(() => null),
            fetch('http://127.0.0.1:8000/api/scripts').catch(() => null)
        ]);

        if (!homeRes || !homeRes.ok || !nocRes || !nocRes.ok || !scriptsRes || !scriptsRes.ok) return;
        const home = await homeRes.json();
        const noc = await nocRes.json();
        const allKpis = [...(home.cards || []), ...(noc.cards || [])];
        const scripts = await scriptsRes.json();

        for (const kpi of allKpis) {
            // SKIP Informational KPIs
            if (kpi.kpi_mode === 'info') continue;

            const script = scripts.find((s: any) => s.id === kpi.script_id);
            if (script) {
                const execRes = await fetch('http://127.0.0.1:8000/api/scripts/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: script.query })
                }).catch(() => null);
                if (!execRes || !execRes.ok) continue;
                const data = await execRes.json();
                if (data.length > 0) {
                    const val = parseFloat(data[0][kpi.column]) || 0;
                    const alertKey = `${kpi.id}-${val < kpi.threshold_warning ? 'critical' : val < kpi.threshold_success ? 'warning' : 'ok'}`;

                    if (val < kpi.threshold_warning) {
                        if (!alertedKpis.current.has(alertKey)) {
                            if (settings.alert_sidebar) {
                                addAlert(`ALERTA CRÍTICO: ${kpi.title}`, `Valor ${val.toLocaleString('pt-BR')} abaixo do limite crítico.`, 'critical');
                            }
                            if (settings.alert_sound) playAlertSound();
                            alertedKpis.current.add(alertKey);
                        }
                    } else if (val < kpi.threshold_success) {
                        if (!alertedKpis.current.has(alertKey)) {
                            if (settings.alert_sidebar) {
                                addAlert(`AVISO: ${kpi.title}`, `Valor ${val.toLocaleString('pt-BR')} abaixo da meta de sucesso.`, 'warning');
                            }
                            alertedKpis.current.add(alertKey);
                        }
                    } else {
                        alertedKpis.current.forEach(key => {
                            if (key.startsWith(kpi.id)) alertedKpis.current.delete(key);
                        });
                    }
                }
            }
        }
    } catch (e) { console.error("Monitor error:", e); }
  };

  // Carrega tema e accent_color do localStorage imediatamente na montagem para evitar piscada (flicker)
  useEffect(() => {
    const cachedTheme = localStorage.getItem("theme");
    const cachedAccent = localStorage.getItem("accent_color");
    if (cachedTheme) {
      document.documentElement.setAttribute('data-theme', cachedTheme);
    }
    if (cachedAccent) {
      document.documentElement.style.setProperty('--accent-color', cachedAccent);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    let timeout: any;
    let isMounted = true;
    let attempt = 0;
    const MAX_ATTEMPTS = 10;

    const loadSettings = () => {
      fetch('http://127.0.0.1:8000/api/settings')
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch settings'))
        .then(data => {
          if (!isMounted) return;
          attempt = 0; // Reset on success
          setAppSettings(data);
          if (data.accent_color) {
            document.documentElement.style.setProperty('--accent-color', data.accent_color);
            localStorage.setItem("accent_color", data.accent_color);
          }
          if (data.theme) {
            document.documentElement.setAttribute('data-theme', data.theme);
            localStorage.setItem("theme", data.theme);
          }
          checkAlerts(data);
          interval = setInterval(() => checkAlerts(data), (data.refresh_interval || 30) * 1000);
        })
        .catch(err => {
          attempt++;
          if (!isMounted || attempt >= MAX_ATTEMPTS) {
            if (attempt >= MAX_ATTEMPTS) {
              console.warn(`BILayout: Backend unavailable after ${MAX_ATTEMPTS} attempts. Giving up.`);
            }
            return;
          }
          const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
          console.warn(`BILayout: Failed to fetch settings (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay / 1000}s...`, err);
          timeout = setTimeout(loadSettings, delay);
        });
    };

    loadSettings();

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const { isSidebarCollapsed, toggleSidebar } = useAlerts();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  if (isMonitor) {
    return (
      <div className="bg-[var(--background)] min-h-screen overflow-x-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ willChange: 'opacity, transform, filter' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] overflow-x-hidden">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} isInitialLoad={isInitialLoad} />
      <main
        style={{ marginLeft: isSidebarCollapsed ? 80 : 256 }}
        className={`flex-1 p-6 overflow-x-hidden will-change-[margin-left] ${isInitialLoad ? "" : "transition-[margin-left] duration-300 ease-in-out"}`}
      >
        <AnimatePresence mode="sync">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
            transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ willChange: 'opacity, transform, filter' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
