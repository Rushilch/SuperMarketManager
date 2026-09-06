import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export const LowStockBadge: React.FC<{ quantity: number; threshold: number }> = ({
  quantity,
  threshold,
}) => {
  if (quantity > threshold) return null;

  const isCritical = quantity === 0;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider border-2 border-black shadow-neo-sm ${
        isCritical
          ? 'bg-neo-pink text-white animate-pulse'
          : 'bg-neo-yellow text-black'
      }`}
      title={`Current on-hand (${quantity}) is at or below reorder threshold (${threshold})`}
    >
      {isCritical ? (
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{isCritical ? 'Out of Stock' : 'Low Stock'}</span>
      <span className="font-mono text-[11px]">({quantity}/{threshold})</span>
    </span>
  );
};