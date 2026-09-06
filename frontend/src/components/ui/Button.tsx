import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-bold tracking-wide uppercase transition-all duration-150 focus:outline-hidden disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg border-2 border-black',
    md: 'text-xs sm:text-sm px-4 py-2 gap-2 rounded-xl border-2 sm:border-3 border-black',
    lg: 'text-sm sm:text-base px-6 py-3 gap-2.5 rounded-xl border-3 border-black',
  };

  const variants = {
    primary:
      'bg-neo-yellow text-black shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm',
    secondary:
      'bg-neo-surface text-neo-text shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm',
    danger:
      'bg-neo-pink text-white shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm',
    success:
      'bg-neo-lime text-black shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-neo-sm',
    ghost:
      'text-neo-text border-2 border-transparent hover:border-black hover:bg-neo-yellow/20 active:translate-x-[1px] active:translate-y-[1px]',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
    </button>
  );
};