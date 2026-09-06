import React from 'react';
import { Loader2 } from 'lucide-react';

export const Spinner: React.FC<{ label?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  label = 'Loading...',
  size = 'md',
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-neo-text">
      <div className="p-3 bg-neo-yellow rounded-xl border-3 border-black shadow-neo inline-block mb-3 animate-bounce">
        <Loader2 className={`${sizes[size]} animate-spin text-black`} />
      </div>
      {label && <p className="text-sm font-black uppercase tracking-wider">{label}</p>}
    </div>
  );
};