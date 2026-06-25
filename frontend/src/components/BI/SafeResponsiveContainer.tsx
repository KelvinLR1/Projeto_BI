"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ResponsiveContainer, ResponsiveContainerProps } from 'recharts';

// Silencia o warning inofensivo do Recharts no console em ambiente de desenvolvimento.
// O Recharts inicializa o estado interno com width/height = -1 antes do primeiro render na DOM,
// gerando logs desnecessários no terminal do Next.js.
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (
      args[0] &&
      typeof args[0] === 'string' &&
      args[0].includes('The width(-1) and height(-1) of chart should be greater than 0')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

export default function SafeResponsiveContainer({ children, ...props }: ResponsiveContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hasValidSize, setHasValidSize] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    // Medição inicial imediata
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setHasValidSize(true);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setHasValidSize(true);
        observer.disconnect(); // Uma vez que o tamanho inicial é válido, o ResponsiveContainer cuida do resto
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isMounted]);

  // Enquanto não estiver montado no cliente ou as dimensões físicas iniciais forem 0,
  // renderizamos apenas o wrapper vazio para evitar que o Recharts tente medir e emita warnings de width(-1)/height(-1).
  const shouldRenderChart = isMounted && hasValidSize;

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: props.width || '100%', 
        height: props.height || '100%',
        minWidth: props.minWidth ?? 0,
        minHeight: props.minHeight ?? 0,
        position: 'relative'
      }} 
    >
      {shouldRenderChart ? (
        <ResponsiveContainer minWidth={0} minHeight={0} {...props}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
