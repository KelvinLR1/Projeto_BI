"use client";

import React from 'react';

function SkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white/[0.05] border border-white/[0.04] skeleton-pulse ${className}`}
    />
  );
}

// ─── Dashboard / Home / NOC skeleton ─────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="content-reveal space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-44" />
          <SkeletonBlock className="h-3 w-28" />
        </div>
        <div className="flex gap-3">
          <SkeletonBlock className="h-11 w-36 rounded-2xl" />
          <SkeletonBlock className="h-11 w-28 rounded-2xl" />
        </div>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28 rounded-[24px]" />
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6 mt-2">
        <SkeletonBlock className="h-72 rounded-[24px]" />
        <SkeletonBlock className="h-72 rounded-[24px]" />
      </div>
      {/* Table row */}
      <SkeletonBlock className="h-48 rounded-[24px]" />
    </div>
  );
}

// ─── Generic page skeleton (listas, editores, settings) ──────────────────────
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="content-reveal space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <SkeletonBlock className="h-9 w-56" />
          <SkeletonBlock className="h-3 w-40" />
        </div>
        <SkeletonBlock className="h-11 w-32 rounded-2xl" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className="h-14 rounded-2xl"
          style={{ opacity: Math.max(0.2, 1 - i * 0.12) } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── Designer skeleton (duas colunas) ────────────────────────────────────────
export function DesignerSkeleton() {
  return (
    <div className="content-reveal grid grid-cols-[1fr_380px] gap-6">
      <div className="space-y-4">
        <SkeletonBlock className="h-9 w-52 mb-4" />
        <SkeletonBlock className="h-64 rounded-[24px]" />
        <SkeletonBlock className="h-48 rounded-[24px]" />
      </div>
      <div className="space-y-4">
        <SkeletonBlock className="h-9 w-40 mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-12 rounded-xl" />
        ))}
        <SkeletonBlock className="h-14 rounded-2xl mt-4" />
      </div>
    </div>
  );
}

export default SkeletonBlock;
