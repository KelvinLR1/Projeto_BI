"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface Alert {
    id: string;
    title: string;
    message: string;
    type: 'critical' | 'warning' | 'info';
    timestamp: Date;
    read: boolean;
}

interface AlertContextType {
    alerts: Alert[];
    addAlert: (title: string, message: string, type: 'critical' | 'warning' | 'info') => void;
    clearAlerts: () => void;
    markAsRead: (id: string) => void;
    isSidebarCollapsed: boolean;
    isSidebarTransitioning: boolean;
    toggleSidebar: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [activeToasts, setActiveToasts] = useState<Alert[]>([]);
    const [duration, setDuration] = useState(8); // Default 8s
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSidebarTransitioning, setIsSidebarTransitioning] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("sidebar-collapsed");
            if (saved !== null) {
                setIsSidebarCollapsed(saved === "true");
            }
        }
    }, []);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem("sidebar-collapsed", String(next));
            }
            return next;
        });
        setIsSidebarTransitioning(true);
        setTimeout(() => {
            setIsSidebarTransitioning(false);
        }, 350); // Cobrir os 300ms de animação do CSS
    };



    const addAlert = useCallback((title: string, message: string, type: 'critical' | 'warning' | 'info') => {
        const newAlert: Alert = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9),
            title,
            message,
            type,
            timestamp: new Date(),
            read: false
        };
        setAlerts(prev => [newAlert, ...prev]);
        setActiveToasts(prev => [...prev, newAlert]);
        setTimeout(() => {
            setActiveToasts(prev => prev.filter(t => t.id !== newAlert.id));
        }, duration * 1000);
    }, [duration]);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
        setActiveToasts([]);
    }, []);

    const markAsRead = useCallback((id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    }, []);

    return (
        <AlertContext.Provider value={{ 
            alerts, 
            addAlert, 
            clearAlerts, 
            markAsRead,
            isSidebarCollapsed,
            isSidebarTransitioning,
            toggleSidebar
        }}>
            {children}
            {/* FLOATING TOASTS CONTAINER */}
            <div className="fixed top-8 right-8 z-[1000] flex flex-col gap-3 w-80 pointer-events-none">
                <AnimatePresence>
                    {activeToasts.length > 1 && (
                        <motion.button
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            onClick={() => setActiveToasts([])}
                            className="pointer-events-auto ml-auto mb-2 px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black text-gray-400 hover:text-white uppercase tracking-widest transition-all backdrop-blur-md"
                        >
                            Limpar Tudo
                        </motion.button>
                    )}

                    {activeToasts.map((toast, index) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, x: 40, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="pointer-events-auto group"
                        >
                            <div className={`
                                p-4 rounded-2xl border flex gap-4 relative overflow-hidden backdrop-blur-2xl transition-all
                                shadow-[0_20px_50px_rgba(0,0,0,0.5)]
                                ${toast.type === 'critical' ? 'bg-critical/5 border-critical/30' : 
                                  toast.type === 'warning' ? 'bg-warning/5 border-warning/30' : 
                                  'bg-info/5 border-info/30'}
                            `}>
                                {/* Left Glow Indicator */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 shadow-[0_0_15px_currentcolor] ${
                                    toast.type === 'critical' ? 'bg-critical text-critical' : 
                                    toast.type === 'warning' ? 'bg-warning text-warning' : 
                                    'bg-info text-info'
                                }`} />
                                
                                <div className={`p-2 rounded-xl h-fit border shadow-inner ${
                                    toast.type === 'critical' ? 'bg-critical/20 border-critical/20 text-critical' : 
                                    toast.type === 'warning' ? 'bg-warning/20 border-warning/20 text-warning' : 
                                    'bg-info/20 border-info/20 text-info'
                                }`}>
                                    {toast.type === 'critical' ? <AlertTriangle size={18} /> : 
                                     toast.type === 'warning' ? <AlertCircle size={18} /> : 
                                     <Info size={18} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-wider mb-0.5">{toast.title}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold leading-tight line-clamp-2">{toast.message}</p>
                                </div>

                                <button 
                                    onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                                    className="text-gray-700 hover:text-white transition-colors p-1"
                                >
                                    <X size={14} />
                                </button>
                                
                                {/* DYNAMIC PROGRESS BAR */}
                                <motion.div 
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: duration, ease: "linear" }}
                                    className={`absolute bottom-0 left-0 h-[1.5px] opacity-40 ${
                                        toast.type === 'critical' ? 'bg-critical' : 
                                        toast.type === 'warning' ? 'bg-warning' : 
                                        'bg-info'
                                    }`}
                                />
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </AlertContext.Provider>
    );
}

export function useAlerts() {
    const context = useContext(AlertContext);
    if (!context) throw new Error('useAlerts must be used within AlertProvider');
    return context;
}
