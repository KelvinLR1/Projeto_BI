"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FileText, 
  Monitor, 
  Settings,
  Layers,
  Palette,
  Bell,
  Trash2,
  X,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
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

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  isInitialLoad?: boolean;
}

export default function Sidebar({ isCollapsed = false, onToggle, isInitialLoad = false }: SidebarProps) {
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
    <aside 
      style={{ width: isCollapsed ? 80 : 256 }}
      className={`h-screen bg-[var(--sidebar-bg)] border-r border-[var(--card-border)] flex flex-col fixed left-0 top-0 z-50 group/sidebar overflow-visible will-change-[width] ${isInitialLoad ? "" : "transition-[width] duration-300 ease-in-out"}`}
    >
      {/* Botão de Contrair/Expandir - No meio vertical da barra e visível apenas sob hover */}
      <button 
        onClick={onToggle}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-neon-red to-[#99001f] text-white border border-white/20 hover:brightness-110 flex items-center justify-center shadow-[0_4px_10px_rgba(255,45,85,0.3)] cursor-pointer transition-all duration-200 opacity-0 group-hover/sidebar:opacity-100 z-[60]"
        title={isCollapsed ? "Expandir" : "Recolher"}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* ── LOGO ── */}
      <div className="px-3 pt-6 pb-5 flex justify-center flex-shrink-0">
        <div
          className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-neon-red to-[#99001f] shadow-[0_12px_30px_rgba(255,45,85,0.4)] border border-white/20 overflow-hidden ${
            isInitialLoad ? "" : "transition-all duration-300 ease-in-out"
          } ${
            isCollapsed 
              ? "p-0 w-12 h-12" 
              : "px-3 py-5 w-[232px] h-[88px]"
          }`}
        >
          {/* Logo Icon (Collapsed) */}
          <img
            src="/logo-icon.png"
            alt="Hub Icon"
            className={`absolute h-7 w-7 object-contain brightness-0 invert drop-shadow-md transition-all duration-300 ease-in-out ${
              isCollapsed 
                ? "opacity-100 scale-100 rotate-0" 
                : "opacity-0 scale-75 rotate-45 pointer-events-none"
            }`}
          />
          {/* Logo Full (Expanded) */}
          <img
            src="/logo-full.png"
            alt="Hub Softwares"
            className={`absolute h-9 w-auto object-contain brightness-0 invert drop-shadow-md transition-all duration-300 ease-in-out ${
              isCollapsed 
                ? "opacity-0 scale-75 pointer-events-none" 
                : "opacity-100 scale-100"
            }`}
          />
        </div>
      </div>

      {/* ── NOTIFICATIONS FLYCARD ── */}
      <div 
        ref={notificationRef}
        className={`absolute ${isCollapsed ? 'left-[88px]' : 'left-[260px]'} top-4 w-80 max-h-[500px] bg-[var(--sidebar-bg)] border border-[var(--card-border)] rounded-3xl shadow-2xl z-[100] flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          showNotifications 
            ? "opacity-100 translate-x-0 scale-100 pointer-events-auto" 
            : "opacity-0 -translate-x-4 scale-95 pointer-events-none"
        }`}
      >
        <div className="p-4 border-b border-[var(--card-border)] flex justify-between items-center bg-[var(--input-bg)]">
          <span className="text-[10px] font-black text-[var(--foreground)] uppercase tracking-widest">Central de Alertas</span>
          <div className="flex gap-2">
            <button onClick={clearAlerts} className="text-[var(--text-secondary)] hover:text-critical transition-colors p-1"><Trash2 size={13} /></button>
            <button onClick={() => setShowNotifications(false)} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] p-1"><X size={13} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {unreadCount === 0 ? (
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
      </div>

      {/* ── NAV ── */}
      <nav className={`flex-1 px-3 py-2 space-y-6 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto custom-scrollbar'}`}>
        {menuSections.map((section) => (
          <div key={section.label}>
            {/* Label de seção ou divisor */}
            <div className="relative">
              <p
                className={`text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em] px-3 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                  isCollapsed 
                    ? "opacity-0 max-h-0 mb-0 pointer-events-none" 
                    : "opacity-100 max-h-6 mb-2"
                }`}
              >
                {section.label}
              </p>
              <div
                className={`bg-[var(--card-border)]/50 mx-2 transition-all duration-300 ease-in-out ${
                  isCollapsed 
                    ? "opacity-100 h-px my-2" 
                    : "opacity-0 h-0 my-0 overflow-hidden"
                }`}
              />
            </div>

            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className="block">
                    <div
                      className={`relative flex items-center rounded-xl group px-3 py-2.5 cursor-pointer select-none transition-all duration-200 ${
                        isCollapsed 
                          ? "hover:scale-105 active:scale-97" 
                          : "hover:translate-x-1 active:scale-[0.98]"
                      }`}
                      style={{
                        backgroundColor: isActive ? "rgba(255, 45, 85, 0.1)" : "transparent",
                        color: isActive ? "var(--foreground)" : "var(--text-secondary)"
                      }}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <div
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

                      <span
                        className={`text-[11px] font-black uppercase tracking-wider flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                          isCollapsed 
                            ? "opacity-0 max-w-0 ml-0 pointer-events-none" 
                            : "opacity-100 max-w-[200px] ml-3"
                        } ${isActive ? 'text-[var(--foreground)]' : ''}`}
                      >
                        {item.label}
                      </span>

                      {/* Arrow indicator on active */}
                      <div
                        className={`flex-shrink-0 overflow-hidden flex items-center transition-all duration-300 ease-in-out ${
                          isCollapsed 
                            ? "opacity-0 scale-75 pointer-events-none" 
                            : "opacity-100 scale-100"
                        }`}
                      >
                        {isActive && <ChevronRight size={12} className="text-neon-red/60" />}
                      </div>

                      {/* Tooltip quando contraído */}
                      {isCollapsed && (
                        <div className="absolute left-16 bg-[var(--sidebar-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-[70] whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </div>
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
          <div className="relative">
            <p
              className={`text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-[0.25em] px-3 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed 
                  ? "opacity-0 max-h-0 mb-0 pointer-events-none" 
                  : "opacity-100 max-h-6 mb-2"
              }`}
            >
              Sistema
            </p>
            <div
              className={`bg-[var(--card-border)]/50 mx-2 transition-all duration-300 ease-in-out ${
                isCollapsed 
                  ? "opacity-100 h-px my-2" 
                  : "opacity-0 h-0 my-0 overflow-hidden"
              }`}
            />
          </div>
          
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative flex items-center rounded-xl group px-3 py-2.5 cursor-pointer w-full text-left select-none transition-all duration-200 ${
              isCollapsed 
                ? "hover:scale-105 active:scale-97" 
                : "hover:translate-x-1 active:scale-[0.98]"
            }`}
            style={{
              backgroundColor: showNotifications ? "rgba(255, 45, 85, 0.1)" : "transparent",
              color: showNotifications ? "var(--foreground)" : "var(--text-secondary)"
            }}
          >
            {showNotifications && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-neon-red rounded-r-full shadow-[0_0_8px_#ff2d55]"
              />
            )}

            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
              showNotifications
                ? "bg-neon-red/20 shadow-[0_0_12px_rgba(255, 45, 85, 0.3)]"
                : "bg-[var(--input-bg)] group-hover:bg-[var(--card-border)]"
            }`}>
              <Bell
                size={15}
                className={`transition-all ${unreadCount > 0 ? "text-neon-red animate-bounce" : showNotifications ? "text-neon-red" : "text-[var(--text-secondary)] group-hover:text-[var(--foreground)]"}`}
              />
            </div>

            <span
              className={`text-[11px] font-black uppercase tracking-wider flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed 
                  ? "opacity-0 max-w-0 ml-0 pointer-events-none" 
                  : "opacity-100 max-w-[200px] ml-3"
              }`}
            >
              Alertas
            </span>

            {unreadCount > 0 && (
              <span
                className={`bg-neon-red !text-white font-black rounded-full flex items-center justify-center shadow-[0_0_8px_#ff2d55] flex-shrink-0 transition-all duration-200 ${
                  isCollapsed 
                    ? "absolute top-1.5 right-1.5 w-4 h-4 text-[8px]" 
                    : "relative w-5 h-5 text-[9px]"
                }`}
              >
                {unreadCount}
              </span>
            )}

            {/* Tooltip quando contraído */}
            {isCollapsed && (
              <div className="absolute left-16 bg-[var(--sidebar-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-[70] whitespace-nowrap">
                Alertas
              </div>
            )}
          </button>
        </div>
      </nav>

      {/* ── FOOTER ── */}
      <div className="pb-5 pt-3 border-t border-[var(--card-border)] px-3">
        <Link href="/settings" className="block">
          <div
            className={`flex items-center rounded-xl group px-3 py-2.5 cursor-pointer select-none transition-all duration-200 ${
              isCollapsed 
                ? "hover:scale-105 active:scale-97" 
                : "hover:translate-x-1 active:scale-[0.98]"
            }`}
            style={{
              backgroundColor: pathname === "/settings" ? "rgba(255, 255, 255, 0.05)" : "transparent",
              color: pathname === "/settings" ? "var(--foreground)" : "var(--text-secondary)"
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--input-bg)] group-hover:bg-[var(--card-border)] flex items-center justify-center flex-shrink-0 transition-all">
              <Settings size={15} className="text-[var(--text-secondary)] group-hover:text-[var(--foreground)] group-hover:rotate-90 transition-all duration-500" />
            </div>
            <span
              className={`text-[11px] font-black uppercase tracking-wider flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
                isCollapsed 
                  ? "opacity-0 max-w-0 ml-0 pointer-events-none" 
                  : "opacity-100 max-w-[200px] ml-3"
              }`}
            >
              Configurações
            </span>

            {/* Tooltip quando contraído */}
            {isCollapsed && (
              <div className="absolute left-16 bg-[var(--sidebar-bg)] border border-[var(--card-border)] text-[var(--foreground)] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-[70] whitespace-nowrap">
                Configurações
              </div>
            )}
          </div>
        </Link>
      </div>
    </aside>
  );
}
