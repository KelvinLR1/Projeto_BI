"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '-- Selecione --',
  className = '',
  compact = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between gap-3 bg-[var(--input-bg)] border rounded-xl font-bold text-[var(--foreground)] outline-none transition-all cursor-pointer
          ${compact ? 'px-3 py-2 text-[10px]' : 'px-4 py-3 text-xs'}
          ${open
            ? 'border-neon-red/60 shadow-[0_0_0_3px_rgba(255,45,85,0.08)]'
            : 'border-[var(--card-border)] hover:border-neon-red/30'
          }`}
      >
        <span className={`truncate ${!value ? 'text-[var(--text-secondary)]' : ''}`}>
          {selectedLabel || placeholder}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="flex-shrink-0 text-[var(--text-secondary)]"
        >
          <ChevronDown size={compact ? 12 : 14} />
        </motion.div>
      </button>

      {/* Dropdown — fundo 100% opaco para não vazar conteúdo */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{ transformOrigin: 'top' }}
            className="absolute z-[999] top-full mt-2 w-full rounded-xl overflow-hidden"
          >
            <div
              className="border rounded-xl overflow-hidden"
              style={{
                background: 'var(--dropdown-bg)',
                borderColor: 'var(--dropdown-border)',
                boxShadow:
                  '0 24px 80px rgba(0,0,0,0.85), 0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
              }}
            >
              <div className="max-h-52 overflow-y-auto custom-scrollbar py-1">
                {options.map(opt => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-all cursor-pointer
                        ${compact ? 'text-[10px]' : 'text-xs'}
                        ${isSelected
                          ? 'bg-neon-red/10 text-[var(--foreground)]'
                          : 'text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--foreground)]'
                        }`}
                    >
                      <span className="truncate font-bold">{opt.label}</span>
                      {isSelected && (
                        <Check size={12} className="text-neon-red flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
                {options.length === 0 && (
                  <p className="px-4 py-3 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest text-center opacity-50">
                    Nenhuma opção
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
