import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeliveriesPage } from '../pages/DeliveriesPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';
import * as orderApi from '../api/orders';
import * as refillApi from '../api/refills';
import * as productApi from '../api/products';
import React from 'react';

vi.mock('../api/orders', () => ({
  getOrdersApi: vi.fn(),
  updateDeliveryStatusApi: vi.fn(),
}));

vi.mock('../api/refills', () => ({
  getRefillsApi: vi.fn(),
  createRefillApi: vi.fn(),
}));

vi.mock('../api/products', () => ({
  getProductsApi: vi.fn(),
}));

const mockDeliveryOrders = [
  {
    id: 55,
    customerId: 1,
    customer: {
      id: 1,
      name: 'Sarah Connor',
      phone: '+1 555-0248',
      address: '742 Evergreen Terrace',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    status: 'confirmed' as const,
    orderType: 'item_delivery' as const,
    deliveryStatus: 'pending' as const,
    deliveryAddress: '742 Evergreen Terrace, Austin, TX',
    deliveryNotes: 'Leave by porch',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    items: [
      {
        id: 1,
        orderId: 55,
        productId: 1,
        quantity: 2,
        unitPriceAtOrder: 5.0,
        product: {
          id: 1,
          name: 'Organic Whole Milk 1 Gal',
          sku: 'DAIRY-MLK-001',
          unitPrice: 5.0,
          quantityInStock: 20,
          reorderThreshold: 5,
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
          description: null,
        },
      },
    ],
  },
];

const mockRefills = [
  {
    id: 1,
    referenceNo: 'REFILL-2026-001',
    supplierName: 'GreenValley Farm Supplies Ltd.',
    status: 'received',
    notes: 'Weekly fresh dairy',
    receivedBy: 'Staff Supervisor',
    totalItems: 45,
    createdAt: '2026-01-01',
    items: [],
  },
];

const renderDeliveriesPage = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <DeliveriesPage />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('DeliveriesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orderApi.getOrdersApi).mockResolvedValue(mockDeliveryOrders);
    vi.mocked(refillApi.getRefillsApi).mockResolvedValue(mockRefills);
    vi.mocked(productApi.getProductsApi).mockResolvedValue([]);
  });

  it('renders Deliveries Hub with tabs and pending item delivery order', async () => {
    renderDeliveriesPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /deliveries hub/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customer item deliveries/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /supplier stock refills/i })).toBeInTheDocument();
      expect(screen.getByText('Order #0055')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getAllByText('Pending Dispatch').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /dispatch courier/i })).toBeInTheDocument();
    });
  });

  it('switches to Supplier Stock Refills tab and displays refill records', async () => {
    renderDeliveriesPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /supplier stock refills/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /supplier stock refills/i }));

    await waitFor(() => {
      expect(screen.getByText('REFILL-2026-001')).toBeInTheDocument();
      expect(screen.getByText('GreenValley Farm Supplies Ltd.')).toBeInTheDocument();
      expect(screen.getByText('+45 Units')).toBeInTheDocument();
    });
  });
});
