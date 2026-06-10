"use client";

import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import { useAlerts } from "@/context/AlertContext";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    let interval: any;
    fetch('http://127.0.0.1:8000/api/settings')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch settings'))
      .then(data => {
        setAppSettings(data);
        if (data.accent_color) document.documentElement.style.setProperty('--accent-color', data.accent_color);
        document.documentElement.setAttribute('data-theme', data.theme || 'dark');
        checkAlerts(data);
        interval = setInterval(() => checkAlerts(data), (data.refresh_interval || 30) * 1000);
      })
      .catch(console.error);
    return () => clearInterval(interval);
  }, []);

  if (isMonitor) {
    return (
      <div className="bg-[var(--background)] min-h-screen overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)] overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
