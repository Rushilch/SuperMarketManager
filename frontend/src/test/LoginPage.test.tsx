import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';
import * as authApi from '../api/auth';
import React from 'react';

vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn(),
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('LoginPage Component (ProductHub)', () => {
  it('renders login form inputs and ProductHub SplitText component', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByTestId('split-text-container')).toHaveTextContent('ProductHub');
    expect(screen.getByPlaceholderText(/name@company.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enter producthub/i })).toBeInTheDocument();
  });

  it('fills inputs when Admin demo button is clicked', () => {
    renderWithProviders(<LoginPage />);
    const adminDemoBtn = screen.getByRole('button', { name: /admin/i });
    fireEvent.click(adminDemoBtn);

    const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement;
    expect(emailInput.value).toBe('admin@inventory.com');
  });

  it('fills inputs when Staff demo button is clicked', () => {
    renderWithProviders(<LoginPage />);
    const staffDemoBtn = screen.getByRole('button', { name: /staff/i });
    fireEvent.click(staffDemoBtn);

    const emailInput = screen.getByPlaceholderText(/name@company.com/i) as HTMLInputElement;
    expect(emailInput.value).toBe('staff@inventory.com');
  });

  it('displays error banner when authentication fails', async () => {
    vi.mocked(authApi.loginApi).mockRejectedValueOnce(new Error('Invalid email or password.'));

    renderWithProviders(<LoginPage />);
    const submitBtn = screen.getByRole('button', { name: /enter producthub/i });
    const emailInput = screen.getByPlaceholderText(/name@company.com/i);
    const passInput = screen.getByPlaceholderText(/••••••••••••/i);

    fireEvent.change(emailInput, { target: { value: 'wrong@inventory.com' } });
    fireEvent.change(passInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });
});