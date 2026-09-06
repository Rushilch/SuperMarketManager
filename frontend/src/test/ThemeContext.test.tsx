import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import React from 'react';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe('ThemeContext', () => {
  it('defaults to dark mode (Catppuccin Macchiato)', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('toggles theme state and synchronizes with localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('inventory_theme')).toBe('light');
    expect(document.documentElement).toHaveClass('light');

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('inventory_theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');
  });

  it('restores stored theme from localStorage on initial render', () => {
    localStorage.setItem('inventory_theme', 'light');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('light');
  });
});