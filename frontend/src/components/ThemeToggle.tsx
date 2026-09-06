import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Toggle ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      className={`group relative flex items-center gap-2 rounded-xl p-2 bg-neo-surface text-neo-text border-2 border-black shadow-neo-sm hover:shadow-neo active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer ${className}`}
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        <Sun
          className={`h-4 w-4 text-neo-yellow transition-all duration-300 transform ${
            theme === 'light' ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
        <Moon
          className={`h-4 w-4 text-neo-cyan transition-all duration-300 transform ${
            theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0 absolute'
          }`}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-black uppercase tracking-wider text-neo-text">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};