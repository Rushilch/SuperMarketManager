import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../pages/DashboardPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';
import * as orderApi from '../api/orders';
import React from 'react';

vi.mock('../api/orders', () => ({
  getDashboardStatsApi: vi.fn(),
  getOrdersApi: vi.fn(),
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

describe('DashboardPage Component (Neobrutalism)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(orderApi.getDashboardStatsApi).mockReturnValue(new Promise(() => {}));
    vi.mocked(orderApi.getOrdersApi).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<DashboardPage />);
    expect(screen.getByText(/loading erp operations data/i)).toBeInTheDocument();
  });

  it('renders all four telemetry metric cards upon load', async () => {
    vi.mocked(orderApi.getDashboardStatsApi).mockResolvedValueOnce({
      totalProducts: 42,
      lowStockCount: 3,
      totalOrders: 150,
      ordersThisMonth: 18,
    });
    vi.mocked(orderApi.getOrdersApi).mockResolvedValueOnce([]);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Catalog SKUs')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Low Stock Alerts')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Total Orders')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('Monthly Volume')).toBeInTheDocument();
      expect(screen.getByText('18')).toBeInTheDocument();
    });
  });
});