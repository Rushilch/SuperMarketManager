import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PosBillingPage } from '../pages/PosBillingPage';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { BrowserRouter } from 'react-router-dom';
import * as productApi from '../api/products';
import * as customerApi from '../api/customers';
import * as orderApi from '../api/orders';
import React from 'react';

vi.mock('../api/products', () => ({
  getProductsApi: vi.fn(),
  getProductByBarcodeApi: vi.fn(),
}));

vi.mock('../api/customers', () => ({
  lookupCustomerByPhoneApi: vi.fn(),
  createCustomerApi: vi.fn(),
}));

vi.mock('../api/orders', () => ({
  createOrderApi: vi.fn(),
}));

const mockProducts = [
  {
    id: 1,
    name: 'Organic Whole Milk 1 Gal',
    sku: 'DAIRY-MLK-001',
    barcode: '8901030010015',
    category: 'Dairy',
    description: 'Fresh milk',
    unitPrice: 5.0,
    quantityInStock: 50,
    reorderThreshold: 10,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 2,
    name: 'Artisanal Sourdough Boule',
    sku: 'BAKE-BRD-002',
    barcode: '8901030010022',
    category: 'Bakery',
    description: 'Crispy sourdough',
    unitPrice: 6.0,
    quantityInStock: 20,
    reorderThreshold: 5,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const renderPosPage = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <PosBillingPage />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('PosBillingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productApi.getProductsApi).mockResolvedValue(mockProducts);
    vi.mocked(productApi.getProductByBarcodeApi).mockImplementation(async (code) => {
      const p = mockProducts.find((x) => x.barcode === code || x.sku === code);
      if (!p) throw new Error('Not found');
      return p;
    });
  });

  it('renders POS terminal heading and scanner input', async () => {
    renderPosPage();
    expect(screen.getByText(/pos billing terminal/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/scan product barcode/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/tender mode: money \(cash only\)/i)).toBeInTheDocument();
  });

  it('scans a barcode and adds product to cart with correct subtotal and tax in money mode', async () => {
    renderPosPage();

    const scanInput = screen.getByPlaceholderText(/scan product barcode/i);
    fireEvent.change(scanInput, { target: { value: '8901030010015' } });
    fireEvent.submit(scanInput.closest('form')!);

    await waitFor(() => {
      // Should show product in cart
      expect(screen.getByText('Organic Whole Milk 1 Gal')).toBeInTheDocument();
      // Price $5.00
      expect(screen.getAllByText('$5.00').length).toBeGreaterThanOrEqual(1);
      // Total with 5% tax = $5.25
      expect(screen.getByText('$5.25')).toBeInTheDocument();
    });

    // Verify Money-Only Tender section displays
    expect(screen.getByText(/money received/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /exact/i })).toBeInTheDocument();
  });

  it('looks up existing customer by mobile and attaches to order', async () => {
    vi.mocked(customerApi.lookupCustomerByPhoneApi).mockResolvedValueOnce({
      id: 10,
      name: 'Marcus Vance',
      email: 'marcus@example.com',
      phone: '+1 555-0199',
      address: '100 Industrial Parkway',
      loyaltyPoints: 120,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    renderPosPage();

    const phoneInput = screen.getByPlaceholderText(/enter mobile/i);
    fireEvent.change(phoneInput, { target: { value: '+1 555-0199' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() => {
      expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
      expect(screen.getByText('120 Pts')).toBeInTheDocument();
    });
  });

  it('opens registration modal when mobile number is not found', async () => {
    vi.mocked(customerApi.lookupCustomerByPhoneApi).mockResolvedValueOnce(null);

    renderPosPage();

    const phoneInput = screen.getByPlaceholderText(/enter mobile/i);
    fireEvent.change(phoneInput, { target: { value: '+1 555-9999' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() => {
      expect(screen.getByText(/new customer found/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/e\.g\. jessica alba/i)).toBeInTheDocument();
    });
  });

  it('calculates change correctly and completes money-only checkout with receipt modal', async () => {
    vi.mocked(customerApi.lookupCustomerByPhoneApi).mockResolvedValueOnce({
      id: 10,
      name: 'Marcus Vance',
      email: 'marcus@example.com',
      phone: '+1 555-0199',
      address: '100 Industrial Parkway',
      loyaltyPoints: 120,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });

    vi.mocked(orderApi.createOrderApi).mockResolvedValueOnce({
      id: 88,
      customerId: 10,
      status: 'confirmed',
      orderType: 'pos_checkout',
      deliveryStatus: 'not_applicable',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      items: [],
    } as any);

    renderPosPage();

    // 1. Scan item ($5.00 + $0.25 tax = $5.25 total)
    const scanInput = screen.getByPlaceholderText(/scan product barcode/i);
    fireEvent.change(scanInput, { target: { value: '8901030010015' } });
    fireEvent.submit(scanInput.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Organic Whole Milk 1 Gal')).toBeInTheDocument();
    });

    // 2. Attach customer
    const phoneInput = screen.getByPlaceholderText(/enter mobile/i);
    fireEvent.change(phoneInput, { target: { value: '+1 555-0199' } });
    fireEvent.click(screen.getByRole('button', { name: /lookup/i }));

    await waitFor(() => {
      expect(screen.getByText('Marcus Vance')).toBeInTheDocument();
    });

    // 3. Enter Cash Received $10.00 -> Change should be $4.75 ($10.00 - $5.25)
    const cashInput = screen.getByPlaceholderText(/5\.25/);
    fireEvent.change(cashInput, { target: { value: '10.00' } });

    await waitFor(() => {
      expect(screen.getByText('Change to Return:')).toBeInTheDocument();
      expect(screen.getByText('$4.75')).toBeInTheDocument();
    });

    // 4. Click Complete Sale & Print Bill
    const saleBtn = screen.getByTestId('complete-sale-btn');
    expect(saleBtn).not.toBeDisabled();
    fireEvent.click(saleBtn);

    await waitFor(() => {
      expect(screen.getByText(/producthub supermarket/i)).toBeInTheDocument();
      expect(screen.getByText(/lane 01 • store #402/i)).toBeInTheDocument();
      expect(screen.getByText(/order ref: #00088/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new bill/i })).toBeInTheDocument();
    });
  });
});
