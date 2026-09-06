import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';

describe('ThemeToggle Component', () => {
  it('renders toggle button with label', () => {
    render(
      <ThemeProvider>
        <ThemeToggle showLabel />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /switch to/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText(/dark/i)).toBeInTheDocument();
  });

  it('toggles light/dark mode and flips html class', () => {
    render(
      <ThemeProvider>
        <ThemeToggle showLabel />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /switch to light mode/i });
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(button);
    expect(document.documentElement).toHaveClass('light');
    expect(screen.getByText(/light/i)).toBeInTheDocument();

    fireEvent.click(button);
    expect(document.documentElement).toHaveClass('dark');
  });
});