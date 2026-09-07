import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Order, OrderStatus } from '../types';
import { getOrderByIdApi, updateOrderStatusApi } from '../api/orders';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import {
  ArrowLeft,
  ShoppingBag,
  User,
  Calendar,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    try {
      const data = await getOrderByIdApi(parseInt(id, 10));
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleStatusChange = async (nextStatus: OrderStatus) => {
    if (!order) return;
    if (nextStatus === 'cancelled') {
      setShowCancelModal(true);
      return;
    }
    await executeStatusUpdate(nextStatus);
  };

  const executeStatusUpdate = async (nextStatus: OrderStatus) => {
    if (!order) return;
    try {
      setUpdating(true);
      setError(null);
      setSuccessMsg(null);
      const updated = await updateOrderStatusApi(order.id, nextStatus);
      setOrder(updated);
      setSuccessMsg(
        nextStatus === 'cancelled'
          ? 'Order cancelled. Inventory stock successfully restored to physical on-hand levels.'
          : `Order successfully updated to ${nextStatus}.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading order details..." size="lg" />;
  }

  if (!order) {
    return (
      <div className="py-16 text-center text-neo-muted font-bold">
        <p className="text-xl uppercase font-black text-neo-text">Order not found</p>
        <div className="mt-4">
          <Link to="/orders">
            <Button variant="secondary" size="md">Return to Pipeline</Button>
          </Link>
        </div>
      </div>
    );
  }

  const orderTotal =
    order.items?.reduce(
      (sum, item) => sum + Number(item.unitPriceAtOrder) * item.quantity,
      0
    ) ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-3 border-black pb-6 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div className="flex items-center gap-3">
          <Link to="/orders">
            <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
                Order #{order.id.toString().padStart(4, '0')}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs font-mono font-bold text-neo-muted mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Status Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {order.status === 'draft' && (
            <>
              <Button
                variant="primary"
                size="md"
                loading={updating}
                icon={<CheckCircle className="h-4 w-4" />}
                onClick={() => handleStatusChange('confirmed')}
              >
                Confirm Order
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={updating}
                icon={<XCircle className="h-4 w-4" />}
                onClick={() => handleStatusChange('cancelled')}
              >
                Cancel Order
              </Button>
            </>
          )}

          {order.status === 'confirmed' && (
            <>
              <Button
                variant="success"
                size="md"
                loading={updating}
                icon={<Truck className="h-4 w-4" />}
                onClick={() => handleStatusChange('shipped')}
              >
                Dispatch / Ship
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={updating}
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() => handleStatusChange('cancelled')}
              >
                Cancel & Revert Stock
              </Button>
            </>
          )}

          {order.status === 'shipped' && (
            <span className="rounded-xl bg-neo-lime text-black px-4 py-2 text-xs font-black uppercase border-2 border-black shadow-neo-sm">
              Fulfilled & Dispatched
            </span>
          )}

          {order.status === 'cancelled' && (
            <span className="rounded-xl bg-neo-pink text-white px-4 py-2 text-xs font-black uppercase border-2 border-black shadow-neo-sm">
              Cancelled (Stock Restored)
            </span>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-neo-pink p-4 text-xs text-white font-bold border-3 border-black shadow-neo">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl bg-neo-lime p-4 text-xs text-black font-black uppercase border-3 border-black shadow-neo">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="rounded-3xl border-3 border-black bg-neo-card p-6 shadow-neo-lg">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
            <User className="h-4 w-4 text-neo-yellow" /> Client Profile
          </div>
          <p className="text-lg font-black uppercase tracking-tight text-neo-text">{order.customer?.name}</p>
          <p className="text-xs text-neo-muted font-bold mt-1">{order.customer?.email}</p>
          {order.customer?.phone && (
            <p className="text-xs font-mono font-bold text-neo-muted mt-0.5">{order.customer.phone}</p>
          )}
          {order.customer?.address && (
            <div className="mt-4 bg-neo-surface p-3.5 rounded-xl border-2 border-black text-xs font-medium text-neo-text shadow-neo-sm">
              {order.customer.address}
            </div>
          )}
        </div>

        <div className="rounded-3xl border-3 border-black bg-neo-card p-6 shadow-neo-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
              <ShoppingBag className="h-4 w-4 text-neo-cyan" /> Order Summary
            </div>
            <div className="space-y-3 text-xs font-bold text-neo-muted">
              <div className="flex justify-between items-center">
                <span className="uppercase">Current State</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex justify-between items-center">
                <span className="uppercase">Total Line Items</span>
                <span className="font-mono font-black text-neo-text text-sm">{order.items?.length ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="border-t-2 border-black pt-4 mt-4 space-y-1">
            <div className="flex justify-between items-center text-xs font-bold text-neo-muted">
              <span className="uppercase">Net Subtotal:</span>
              <span className="font-mono text-sm font-black text-neo-text">${orderTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs font-bold text-neo-muted">
              <span className="uppercase">Est. Tax (5% at POS):</span>
              <span className="font-mono text-sm font-black text-neo-text">${(orderTotal * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline border-t border-black/20 pt-2 mt-1">
              <span className="text-xs font-black uppercase text-neo-text">Estimated Total:</span>
              <span className="text-2xl font-black font-mono text-neo-text">
                ${(orderTotal * 1.05).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-3xl border-3 border-black bg-neo-card shadow-neo-lg overflow-hidden">
        <div className="border-b-3 border-black px-6 py-4 bg-neo-yellow text-black font-black uppercase text-sm">
          Allocated Inventory Line Items
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm text-neo-text">
            <thead className="bg-neo-bg text-xs font-black uppercase tracking-wider text-neo-text border-b-2 border-black">
              <tr>
                <th className="px-6 py-3.5">SKU Code</th>
                <th className="px-6 py-3.5">Product Name</th>
                <th className="px-6 py-3.5 text-center">Allocated Units</th>
                <th className="px-6 py-3.5 text-right">Historic Unit Price</th>
                <th className="px-6 py-3.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-black/10">
              {order.items?.map((item) => {
                const subtotal = Number(item.unitPriceAtOrder) * item.quantity;
                return (
                  <tr key={item.id} className="hover:bg-neo-yellow/15 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-black bg-neo-cyan text-black px-2 py-1 rounded border-2 border-black shadow-neo-sm">
                        {item.product?.sku || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">
                      {item.product?.name || `Product #${item.productId}`}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-black text-sm">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-xs text-neo-muted">
                      ${Number(item.unitPriceAtOrder).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-black text-base">
                      ${subtotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Neobrutalist Confirmation Modal for Cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-neo-card border-4 border-black p-6 shadow-neo-xl space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neo-pink text-white border-2 border-black shadow-neo-sm">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-neo-text">
                  Cancel Order #{order.id.toString().padStart(4, '0')}?
                </h3>
                <p className="text-xs text-neo-muted font-bold">Atomic Inventory Reversal</p>
              </div>
            </div>

            <p className="text-sm font-medium text-neo-text">
              Are you sure you want to cancel this order? This triggers an atomic database transaction that reverses and restores all allocated physical stock back to on-hand supermarket inventory.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={updating}
                onClick={() => setShowCancelModal(false)}
              >
                No, Keep Order
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                loading={updating}
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={() => executeStatusUpdate('cancelled')}
              >
                Yes, Cancel & Revert
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};