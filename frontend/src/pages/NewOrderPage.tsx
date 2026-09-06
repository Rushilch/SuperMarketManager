import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Customer, Product, OrderStatus } from '../types';
import { getCustomersApi } from '../api/customers';
import { getProductsApi } from '../api/products';
import { createOrderApi } from '../api/orders';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  ShoppingBag,
  ShieldCheck,
} from 'lucide-react';

interface LineItemRow {
  productId: number;
  quantity: number;
}

export const NewOrderPage: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [status, setStatus] = useState<OrderStatus>('confirmed');
  const [items, setItems] = useState<LineItemRow[]>([{ productId: 0, quantity: 1 }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [cData, pData] = await Promise.all([getCustomersApi(), getProductsApi()]);
        setCustomers(cData);
        setProducts(pData);
        if (cData.length > 0) setCustomerId(cData[0].id);
        if (pData.length > 0) setItems([{ productId: pData[0].id, quantity: 1 }]);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize order form');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddItem = () => {
    const firstAvailable = products.find((p) => p.quantityInStock > 0) || products[0];
    setItems((prev) => [
      ...prev,
      { productId: firstAvailable ? firstAvailable.id : 0, quantity: 1 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProductId: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, productId: newProductId } : item))
    );
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, newQty) } : item))
    );
  };

  const lineDetails = items.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    const unitPrice = product ? Number(product.unitPrice) : 0;
    const subtotal = unitPrice * item.quantity;
    const isExceedingStock = product ? item.quantity > product.quantityInStock : false;
    return { ...item, product, unitPrice, subtotal, isExceedingStock };
  });

  const orderTotal = lineDetails.reduce((sum, item) => sum + item.subtotal, 0);
  const hasStockErrors = lineDetails.some((item) => item.isExceedingStock);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item.');
      return;
    }

    if (hasStockErrors) {
      setError('One or more line items exceed physical stock. Adjust quantities before placing order.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created = await createOrderApi({
        customerId: Number(customerId),
        status,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      navigate(`/orders/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Transaction failed. Order was rolled back.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner label="Preparing order catalog data..." size="lg" />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Link to="/orders" className="w-fit">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
            Execute Order
          </h1>
          <p className="text-xs sm:text-sm text-neo-muted font-bold mt-0.5">
            Atomic Prisma transaction: stock availability will be locked, verified, and deducted.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-neo-pink p-4 text-xs text-white font-bold border-3 border-black shadow-neo">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-black text-sm uppercase block">Transaction Aborted</span>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Settings Card */}
        <div className="rounded-3xl border-3 border-black bg-neo-card p-4 sm:p-6 shadow-neo-lg grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Purchasing Client *
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(parseInt(e.target.value, 10))}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm text-neo-text font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone || c.email || 'No contact'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Initial Lifecycle State
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm text-neo-text font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
            >
              <option value="confirmed">Confirmed (Allocates & Deducts Stock)</option>
              <option value="draft">Draft (Pre-allocates Stock)</option>
            </select>
            <p className="mt-1 text-xs text-neo-muted font-bold">
              Both states verify physical stock and write immutable audit movements.
            </p>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="rounded-3xl border-3 border-black bg-neo-card p-4 sm:p-8 shadow-neo-xl space-y-6">
          <div className="flex items-center justify-between border-b-3 border-black pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-neo-text">Order Items</h2>
              <p className="text-xs text-neo-muted font-bold">Specify SKUs and unit allocations</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleAddItem}
              icon={<Plus className="h-4 w-4" />}
            >
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {lineDetails.map((line, index) => (
              <div
                key={index}
                className={`rounded-2xl border-3 border-black p-4 shadow-neo-sm transition-all ${
                  line.isExceedingStock
                    ? 'bg-neo-pink/15'
                    : 'bg-neo-surface'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Product SKU Selector */}
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neo-muted mb-1">
                      Product SKU
                    </label>
                    <select
                      value={line.productId}
                      onChange={(e) => handleProductChange(index, parseInt(e.target.value, 10))}
                      className="block w-full rounded-xl border-2 border-black bg-neo-card px-3.5 py-2.5 text-sm font-bold text-neo-text focus:outline-hidden"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.sku}] — ${Number(p.unitPrice).toFixed(2)} (On-Hand: {p.quantityInStock})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity Input */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-neo-muted mb-1">
                      Units Requested
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value, 10) || 1)}
                      className={`block w-full rounded-xl border-2 border-black px-3.5 py-2.5 text-sm font-mono font-black text-neo-text bg-neo-card focus:outline-hidden ${
                        line.isExceedingStock
                          ? 'bg-neo-pink text-white border-black'
                          : 'focus:border-black'
                      }`}
                    />
                  </div>

                  {/* Subtotal & Delete */}
                  <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-neo-muted">
                        Subtotal
                      </span>
                      <span className="text-base font-black font-mono text-neo-text">
                        ${line.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                      className="rounded-xl p-2.5 bg-neo-pink text-white border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-20 cursor-pointer"
                      title="Remove line item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {line.isExceedingStock && line.product && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-black uppercase text-neo-pink bg-black px-3 py-1.5 rounded-lg border border-black">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-neo-yellow" />
                    <span>
                      Deficit Warning: Ordered {line.quantity} units, but only {line.product.quantityInStock} in physical stock.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Grand Total & Submission */}
          <div className="border-t-3 border-black pt-6 mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5 text-xs font-bold text-neo-muted">
              <ShieldCheck className="h-5 w-5 text-neo-lime shrink-0" />
              <span>
                Deadlock-free deterministic locking enabled. Full rollback if any item validation fails.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 w-full md:w-auto justify-between sm:justify-end">
              <div className="text-left sm:text-right">
                <span className="block text-xs font-black uppercase tracking-wider text-neo-muted">
                  Billed Total
                </span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-neo-text">
                  ${orderTotal.toFixed(2)}
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                disabled={hasStockErrors}
                icon={<ShoppingBag className="h-5 w-5" />}
                className="w-full sm:w-auto justify-center"
              >
                Commit Order
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};