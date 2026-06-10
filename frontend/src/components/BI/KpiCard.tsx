"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertCircle, Zap, Info, Target } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KpiCardProps {
  title: string;
  value: string | number;
  trend?: number;
  status?: 'success' | 'warning' | 'critical' | 'info';
  sparkData?: number[];
  w?: number;
  h?: number;
  disablePulse?: boolean;
  loading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  trend = 0, 
  status = 'success', 
  sparkData = [30, 45, 35, 50, 40, 60, 55],
  w = 3,
  h = 1,
  disablePulse = false,
  loading = false
}) => {
  const isCritical = status === 'critical';
  const isInfo = status === 'info';
  const isCompact = h === 1;
  
  const statusColors = {
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    critical: 'var(--neon-red)',
    info: 'var(--accent-color)'
  };

  const borderColors = {
    success: 'border-success/30 text-success',
    warning: 'border-warning/30 text-warning',
    critical: 'border-critical/40 text-critical',
    info: 'border-[var(--accent-color)]/30 text-[var(--accent-color)]'
  };

  const currentColor = statusColors[status];

  // Formatação de segurança para o valor
  const displayValue = typeof value === 'number' ? value.toLocaleString('pt-BR') : value;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative h-full w-full rounded-[40px] border-2 flex flex-col justify-between overflow-hidden transition-all duration-500 glass-card
        ${borderColors[status]}
        ${isCompact ? 'p-8' : 'p-10'}
        ${loading ? 'animate-pulse' : ''}
      `}
    >
      {/* LOADING SHIMMER OVERLAY */}
      {loading && (
        <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-50"
        />
      )}

      {/* SOS PULSE ANIMATION */}
      {isCritical && !disablePulse && (
        <motion.div 
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 bg-critical pointer-events-none"
        />
      )}

      {/* BACKGROUND AREA CHART — oculto no modo informativo */}
      {!isInfo && (
        <div className={`absolute inset-x-0 bottom-0 z-0 opacity-40 pointer-events-none ${isCompact ? 'h-3/4' : 'h-1/2'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData.map((v, i) => ({v, i}))} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentColor} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={currentColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="v" 
                stroke={currentColor} 
                strokeWidth={isCompact ? 2 : 3} 
                fill={`url(#gradient-${title.replace(/\s+/g, '')})`}
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {isCompact ? (
        /* COMPACT LAYOUT (h=1) */
        <div className="relative z-10 flex items-center justify-between h-full gap-8">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-1 flex items-center gap-2">
                    {isCritical ? <Zap size={10} className="animate-pulse" /> : isInfo ? <Info size={10} /> : <Target size={10} />}
                    {title}
                </span>
                <h2 className="text-4xl font-black tracking-tighter text-[var(--foreground)] tabular-nums leading-none overflow-hidden h-10">
                    {loading ? (
                      <div className="h-8 w-24 bg-white/10 rounded-lg animate-pulse" />
                    ) : (
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={displayValue.toString()}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className="inline-block"
                        >
                          {displayValue}
                        </motion.span>
                      </AnimatePresence>
                    )}
                </h2>
            </div>

            {!isInfo && (
              <div className="flex items-center gap-6">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 ${trend >= 0 ? 'text-success' : 'text-critical'}`}>
                      {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      <span className="text-xs font-black italic">{Math.abs(trend)}%</span>
                  </div>
              </div>
            )}
        </div>
      ) : (
        /* STANDARD LAYOUT (h>1) */
        <>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-black uppercase tracking-[0.25em] opacity-50 flex items-center gap-2">
                        {isCritical ? <Zap size={12} className="animate-pulse" /> : isInfo ? <Info size={12} /> : <Target size={12} />}
                        {title}
                    </span>
                    {!isInfo && (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 ${trend >= 0 ? 'text-success' : 'text-critical'}`}>
                          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span className="text-xs font-black italic">{Math.abs(trend)}%</span>
                      </div>
                    )}
                </div>
                <div className="mt-6">
                    <h2 className="text-6xl font-black tracking-tighter text-[var(--foreground)] tabular-nums leading-none overflow-hidden h-16">
                        {loading ? (
                          <div className="h-16 w-48 bg-white/10 rounded-2xl animate-pulse" />
                        ) : (
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={displayValue.toString()}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -15 }}
                              transition={{ duration: 0.3, ease: "easeOut" }}
                              className="inline-block"
                            >
                              {displayValue}
                            </motion.span>
                          </AnimatePresence>
                        )}
                    </h2>
                </div>
            </div>

            <div className="relative z-10 flex justify-between items-end">
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-30">
                    {isCritical ? 'Ação Necessária' : isInfo ? 'Informativo' : 'Operacional'}
                </div>
                {isCritical && <AlertCircle size={24} className="text-critical animate-bounce" />}
            </div>
        </>
      )}
    </motion.div>
  );
};

export default KpiCard;
