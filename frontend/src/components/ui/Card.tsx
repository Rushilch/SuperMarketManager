import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: 'yellow' | 'cyan' | 'lime' | 'pink' | 'purple' | 'none';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  accent = 'none',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const accents = {
    none: '',
    yellow: 'border-t-8 border-t-neo-yellow',
    cyan: 'border-t-8 border-t-neo-cyan',
    lime: 'border-t-8 border-t-neo-lime',
    pink: 'border-t-8 border-t-neo-pink',
    purple: 'border-t-8 border-t-neo-purple',
  };

  const hover = hoverEffect
    ? 'hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-xl transition-all duration-150'
    : '';

  return (
    <div
      className={`rounded-2xl bg-neo-card border-3 border-black p-6 shadow-neo-lg text-neo-text ${accents[accent]} ${hover} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};