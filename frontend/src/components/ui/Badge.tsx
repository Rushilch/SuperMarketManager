import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'yellow' | 'cyan' | 'lime' | 'pink' | 'purple' | 'surface';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'surface',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const variants = {
    yellow: 'bg-neo-yellow text-black border-2 border-black shadow-neo-sm',
    cyan: 'bg-neo-cyan text-black border-2 border-black shadow-neo-sm',
    lime: 'bg-neo-lime text-black border-2 border-black shadow-neo-sm',
    pink: 'bg-neo-pink text-white border-2 border-black shadow-neo-sm',
    purple: 'bg-neo-purple text-white border-2 border-black shadow-neo-sm',
    surface: 'bg-neo-surface text-neo-text border-2 border-black shadow-neo-sm',
  };

  const sizes = {
    sm: 'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 gap-1 rounded-md',
    md: 'text-xs font-bold uppercase tracking-wider px-2.5 py-1 gap-1.5 rounded-lg',
  };

  return (
    <span
      className={`inline-flex items-center font-mono ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className="h-2 w-2 rounded-full bg-current" />}
      {children}
    </span>
  );
};