import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Order, OrderStatus } from '../types';
import { getOrdersApi } from '../api/orders';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ShoppingBag, Plus, Search, RefreshCw, Eye } from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const isTypeFilter = statusFilter === 'pos_checkout' || statusFilter === 'item_delivery';
      const statusParam = statusFilter === 'all' || isTypeFilter ? undefined : (statusFilter as OrderStatus);
      const data = await getOrdersApi(statusParam);
      setOrders(isTypeFilter ? data.filter((o) => o.orderType === statusFilter) : data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const filtered = orders.filter((o) => {
    const custName = o.customer?.name || '';
    const orderIdStr = `#${o.id.toString().padStart(4, '0')}`;
    return (
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderIdStr.includes(searchTerm)
    );
  });

  const filterTabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Orders' },
    { id: 'pos_checkout', label: 'POS In-Store' },
    { id: 'item_delivery', label: 'Home Deliveries' },
    { id: 'draft', label: 'Draft' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-3 border-black pb-6 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
            Orders Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-neo-muted font-bold mt-1">
            Fulfillment status pipeline, item audits, and automatic stock reversal tracking.
          </p>
        </div>

        <Link to="/orders/new" className="w-full sm:w-auto">
          <Button variant="primary" size="md" icon={<Plus className="h-5 w-5" />} className="w-full sm:w-auto justify-center">
            Create Order
          </Button>
        </Link>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-neo-card rounded-2xl border-3 border-black shadow-neo-sm">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-xl px-3 sm:px-4 py-2 text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-neo-yellow text-black border-2 border-black shadow-neo-sm'
                  : 'text-neo-text hover:bg-black/5 border-2 border-transparent hover:border-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white" />
            <input
              type="text"
              placeholder="Search by ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border-3 border-black bg-neo-surface pl-10 pr-4 py-2 text-xs text-neo-text font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
            />
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={loadOrders}
            icon={<RefreshCw className="h-4 w-4" />}
            title="Refresh list"
            className="shrink-0"
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border-3 border-black bg-neo-card shadow-neo-lg overflow-hidden">
        {loading ? (
          <Spinner label="Loading order history ledger..." />
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ShoppingBag className="h-10 w-10 text-black dark:text-white" />}
              title="No Orders Found"
              description="Adjust your search or status filter to locate order records."
              action={
                <Link to="/orders/new">
                  <Button variant="primary" size="md">Create First Order</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm text-neo-text">
              <thead className="bg-neo-bg text-xs font-black uppercase tracking-wider text-neo-text border-b-3 border-black">
                <tr>
                  <th className="px-6 py-3.5">Order ID</th>
                  <th className="px-6 py-3.5">Purchaser</th>
                  <th className="px-6 py-3.5">Allocations</th>
                  <th className="px-6 py-3.5">Total Value</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {filtered.map((order) => {
                  const total =
                    order.items?.reduce(
                      (sum, item) => sum + Number(item.unitPriceAtOrder) * item.quantity,
                      0
                    ) ?? 0;

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-neo-yellow/15 transition-colors duration-100"
                    >
                      <td className="px-6 py-4 font-mono font-black text-xs">
                        <div className="flex items-center gap-1.5">
                          <span>#{order.id.toString().padStart(4, '0')}</span>
                          {order.orderType === 'item_delivery' ? (
                            <span className="bg-neo-cyan text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-black">
                              Delivery
                            </span>
                          ) : (
                            <span className="bg-neo-yellow text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-black">
                              POS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm">
                        {order.customer?.name || `Customer #${order.customerId}`}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold">
                        {order.items?.length || 0} SKU(s)
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-sm">
                        ${total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-neo-muted">
                        {new Date(order.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to={`/orders/${order.id}`}>
                          <Button variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" />}>
                            Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};