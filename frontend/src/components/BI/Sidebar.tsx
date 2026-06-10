"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileText, 
  Monitor, 
  Settings,
  LayoutDashboard,
  Layers,
  Palette,
  Bell,
  Trash2,
  X,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAlerts } from "@/context/AlertContext";

const menuSections = [
  {
    label: "Principal",
    items: [
      { icon: Home,          label: "Dashboard",         href: "/" },
      { icon: FileText,      label: "Hub de Relatórios", href: "/reports" },
      { icon: Monitor,       label: "Monitoramento",     href: "/monitor" },
    ]
  },
  {
    label: "Studio",
    items: [
      { icon: Palette, label: "Designer de Ativos", href: "/designer" },
      { icon: Layers,  label: "Layout e Grade",     href: "/kpi-settings" },
      { icon: Settings, label: "Scripts SQL",       href: "/editor" },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const { alerts, clearAlerts, markAsRead } = useAlerts();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const unreadCount = alerts.filter(a => !a.read).length;

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <aside className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex flex-col fixed left-0 top-0 z-50">

      {/* ── LOGO ── */}
      <div className="px-5 pt-6 pb-5">
          <div className="w-full flex items-center justify-center py-5 px-3 rounded-2xl bg-gradient-to-br from-neon-red to-[#99001f] shadow-[0_12px_30px_rgba(255,45,85,0.4)] border border-white/20">
            <img src="/logo-full.png" alt="Hub Softwares" className="h-9 w-auto object-contain brightness-0 invert drop-shadow-md" />
          </div>
      </div>

      {/* ── NOTIFICATIONS FLYCARD ── */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            ref={notificationRef}
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute left-[260px] top-4 w-80 max-h-[500px] bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl z-[100] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--card-border)] flex justify-between items-center bg-[var(--input-bg)]">
              <span className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">Central de Alertas</span>
              <div className="flex gap-2">
                <button onClick={clearAlerts} className="text-[var(--text-secondary)] hover:text-critical transition-colors p-1"><Trash2 size={13} /></button>
                <button onClick={() => setShowNotifications(false)} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] p-1"><X size={13} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-center py-10 opacity-20">
                  <Bell size={40} className="mx-auto mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum alerta</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <div 
                    key={alert.id} 
                    onClick={() => markAsRead(alert.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${alert.read ? 'bg-[var(--input-bg)] border-[var(--card-border)] opacity-50' : 'bg-neon-red/5 border-neon-red/20'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${alert.type === 'critical' ? 'text-critical' : 'text-warning'}`}>
                        {alert.type === 'critical' ? 'Crítico' : 'Atenção'}
                      </span>
                      <span className="text-[8px] text-[var(--text-secondary)] font-bold opacity-60">{alert.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <h5 className="text-[10px] font-black text-[var(--foreground)] uppercase mb-1">{alert.title}</h5>
                    <p className="text-[9px] text-[var(--text-secondary)] font-bold leading-relaxed line-clamp-2">{alert.message}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV ── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-6">
        {menuSections.map((section) => (
          <div key={section.label}>
            {/* Section label */}
            <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em] px-3 mb-2">
              {section.label}
            </p>

            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isActive
                          ? "bg-neon-red/10 text-[var(--foreground)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]"
                      }`}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-bar"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neon-red rounded-r-full shadow-[0_0_8px_#ff2d55]"
                        />
                      )}

                      {/* Icon container */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isActive
                          ? "bg-neon-red/20 shadow-[0_0_12px_rgba(255,45,85,0.3)]"
                          : "bg-[var(--input-bg)] group-hover:bg-[var(--card-border)]"
                      }`}>
                        <item.icon
                          size={15}
                          className={isActive ? "text-neon-red" : "text-[var(--text-secondary)] group-hover:text-[var(--foreground)] transition-colors"}
                        />
                      </div>

                      <span className={`text-[11px] font-black uppercase tracking-wider flex-1 ${isActive ? 'text-[var(--foreground)]' : ''}`}>
                        {item.label}
                      </span>

                      {/* Arrow indicator on active */}
                      {isActive && (
                        <ChevronRight size={12} className="text-neon-red/60 flex-shrink-0" />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── DIVIDER ── */}
        <div className="h-px bg-[var(--card-border)] mx-3" />

        {/* ── ALERTS BUTTON ── */}
        <div>
          <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em] px-3 mb-2">Sistema</p>
          <motion.button
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-left group ${
              showNotifications ? "bg-neon-red/10 text-[var(--foreground)]" : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]"
            }`}
          >
            {showNotifications && (
              <motion.div
                layoutId="sidebar-active-bar"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neon-red rounded-r-full shadow-[0_0_8px_#ff2d55]"
              />
            )}

            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              showNotifications
                ? "bg-neon-red/20 shadow-[0_0_12px_rgba(255,45,85,0.3)]"
                : "bg-[var(--input-bg)] group-hover:bg-[var(--card-border)]"
            }`}>
              <Bell
                size={15}
                className={`transition-all ${unreadCount > 0 ? "text-neon-red animate-bounce" : showNotifications ? "text-neon-red" : "text-[var(--text-secondary)] group-hover:text-[var(--foreground)]"}`}
              />
            </div>

            <span className="text-[11px] font-black uppercase tracking-wider flex-1">Alertas</span>

            {unreadCount > 0 && (
              <span className="bg-neon-red !text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_8px_#ff2d55] flex-shrink-0">
                {unreadCount}
              </span>
            )}
          </motion.button>
        </div>
      </nav>

      {/* ── FOOTER ── */}
      <div className="px-3 pb-5 pt-3 border-t border-[var(--card-border)]">
        <Link href="/settings">
          <motion.div
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
              pathname === "/settings"
                ? "bg-[var(--input-bg)] text-[var(--foreground)]"
                : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--input-bg)]"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] group-hover:bg-[var(--card-border)] flex items-center justify-center flex-shrink-0 transition-all">
              <Settings size={15} className="text-[var(--text-secondary)] group-hover:text-[var(--foreground)] group-hover:rotate-90 transition-all duration-500" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider">Configurações</span>
          </motion.div>
        </Link>
      </div>
    </aside>
  );
}
