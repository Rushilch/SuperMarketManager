import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as authApi from '../api/auth';
import React from 'react';

vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
  getMeApi: vi.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('provides initial unauthenticated state when no token is in localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('successfully logs in, saves token, and sets role booleans', async () => {
    const mockUser = {
      id: 1,
      name: 'Admin User',
      email: 'admin@inventory.com',
      role: 'admin' as const,
    };

    vi.mocked(authApi.loginApi).mockResolvedValueOnce({
      token: 'jwt-admin-token',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('admin@inventory.com', 'pass');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('admin@inventory.com');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isStaff).toBe(false);
    expect(localStorage.getItem('token')).toBe('jwt-admin-token');
  });

  it('clears state and storage on logout', async () => {
    const mockUser = {
      id: 2,
      name: 'Staff Member',
      email: 'staff@inventory.com',
      role: 'staff' as const,
    };

    vi.mocked(authApi.loginApi).mockResolvedValueOnce({
      token: 'jwt-staff-token',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login('staff@inventory.com', 'pass');
    });

    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});