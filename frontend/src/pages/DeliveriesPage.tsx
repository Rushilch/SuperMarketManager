import React, { useEffect, useState } from 'react';
import { Order, StockRefill, Product, DeliveryStatus } from '../types';
import { getOrdersApi, updateDeliveryStatusApi } from '../api/orders';
import { getRefillsApi, createRefillApi } from '../api/refills';
import { getProductsApi } from '../api/products';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Truck,
  PackagePlus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Phone,
  Calendar,
  Layers,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  X,
  FileText,
  Boxes,
} from 'lucide-react';

export const DeliveriesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'item_delivery' | 'stock_refill'>('item_delivery');

  // Item deliveries state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Stock refills state
  const [refills, setRefills] = useState<StockRefill[]>([]);
  const [loadingRefills, setLoadingRefills] = useState(true);
  const [refillSearch, setRefillSearch] = useState('');

  // Stock refill modal
  const [products, setProducts] = useState<Product[]>([]);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [refillNotes, setRefillNotes] = useState('');
  const [refillRows, setRefillRows] = useState<Array<{ productId: number; quantity: number; costPrice?: number }>>([
    { productId: 0, quantity: 10 },
  ]);
  const [submittingRefill, setSubmittingRefill] = useState(false);
  const [refillError, setRefillError] = useState<string | null>(null);

  const loadItemDeliveries = async () => {
    setLoadingOrders(true);
    try {
      const deliveries = await getOrdersApi(undefined, 'item_delivery');
      setOrders(deliveries);
    } catch (err) {
      console.error('Failed to load item deliveries:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const loadStockRefills = async () => {
    setLoadingRefills(true);
    try {
      const data = await getRefillsApi();
      setRefills(data);
    } catch (err) {
      console.error('Failed to load stock refills:', err);
    } finally {
      setLoadingRefills(false);
    }
  };

  useEffect(() => {
    loadItemDeliveries();
    loadStockRefills();
    getProductsApi().then(setProducts).catch(console.error);
  }, []);

  // Update item delivery status
  const handleUpdateDeliveryStatus = async (orderId: number, nextStatus: DeliveryStatus) => {
    try {
      setDeliveryError(null);
      setUpdatingOrderId(orderId);
      const updated = await updateDeliveryStatusApi(orderId, nextStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err: any) {
      setDeliveryError(err.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Submit stock refill
  const handleCreateRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setRefillError('Supplier name is required');
      return;
    }

    if (refillRows.length === 0 || refillRows.some((r) => !r.productId || r.quantity <= 0)) {
      setRefillError('Please select valid products and positive quantities');
      return;
    }

    try {
      setSubmittingRefill(true);
      setRefillError(null);
      await createRefillApi({
        supplierName: supplierName.trim(),
        referenceNo: referenceNo.trim() || undefined,
        notes: refillNotes.trim() || undefined,
        items: refillRows,
      });

      setShowRefillModal(false);
      setSupplierName('');
      setReferenceNo('');
      setRefillNotes('');
      setRefillRows([{ productId: products[0]?.id || 0, quantity: 10 }]);
      await loadStockRefills();
    } catch (err: any) {
      setRefillError(err.response?.data?.message || 'Failed to record stock refill');
    } finally {
      setSubmittingRefill(false);
    }
  };

  // Filtered item deliveries
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.deliveryStatus === statusFilter;
    const custName = o.customer?.name || '';
    const phone = o.customer?.phone || '';
    const addr = o.deliveryAddress || '';
    const matchesSearch =
      custName.toLowerCase().includes(orderSearch.toLowerCase()) ||
      phone.includes(orderSearch) ||
      addr.toLowerCase().includes(orderSearch.toLowerCase()) ||
      `#${o.id}`.includes(orderSearch);
    return matchesStatus && matchesSearch;
  });

  // Filtered refills
  const filteredRefills = refills.filter((r) => {
    const s = refillSearch.toLowerCase();
    return (
      r.supplierName.toLowerCase().includes(s) ||
      r.referenceNo.toLowerCase().includes(s) ||
      (r.notes && r.notes.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Error Alert */}
      {deliveryError && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-neo-pink p-4 text-xs text-white font-bold border-3 border-black shadow-neo">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{deliveryError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeliveryError(null)}
            className="rounded-lg p-1 hover:bg-black/20 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-black pb-6 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
            Deliveries Hub
          </h1>
          <p className="text-xs sm:text-sm text-neo-muted font-bold mt-1">
            Manage Outbound Customer Item Deliveries & Inbound Supplier Stock Refills.
          </p>
        </div>

        {activeTab === 'stock_refill' && (
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="h-5 w-5" />}
            onClick={() => {
              if (products.length > 0 && refillRows[0].productId === 0) {
                setRefillRows([{ productId: products[0].id, quantity: 10 }]);
              }
              setShowRefillModal(true);
            }}
          >
            Receive Stock Refill
          </Button>
        )}
      </div>

      {/* Primary Tab Switcher */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('item_delivery')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border-3 border-black font-black uppercase text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'item_delivery'
              ? 'bg-neo-cyan text-black shadow-neo translate-x-[-1px] translate-y-[-1px]'
              : 'bg-neo-card text-neo-text hover:bg-black/5 shadow-neo-sm'
          }`}
        >
          <Truck className="h-5 w-5" />
          <span>Customer Item Deliveries ({orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stock_refill')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border-3 border-black font-black uppercase text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'stock_refill'
              ? 'bg-neo-yellow text-black shadow-neo translate-x-[-1px] translate-y-[-1px]'
              : 'bg-neo-card text-neo-text hover:bg-black/5 shadow-neo-sm'
          }`}
        >
          <PackagePlus className="h-5 w-5" />
          <span>Supplier Stock Refills ({refills.length})</span>
        </button>
      </div>

      {/* TAB 1: OUTBOUND ITEM DELIVERIES */}
      {activeTab === 'item_delivery' && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2 p-1.5 bg-neo-card rounded-2xl border-3 border-black shadow-neo-sm">
              {[
                { id: 'all', label: 'All Deliveries' },
                { id: 'pending', label: 'Pending Dispatch' },
                { id: 'out_for_delivery', label: 'On The Road' },
                { id: 'delivered', label: 'Delivered' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-xl px-3 sm:px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-neo-cyan text-black border-2 border-black shadow-neo-sm'
                      : 'text-neo-text hover:bg-black/5 border-2 border-transparent hover:border-black'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white" />
                <input
                  type="text"
                  placeholder="Search customer, address, order..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full rounded-xl border-3 border-black bg-neo-surface pl-10 pr-4 py-2 text-xs text-neo-text font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={loadItemDeliveries}
                icon={<RefreshCw className="h-4 w-4" />}
                title="Refresh Deliveries"
              >
                Sync
              </Button>
            </div>
          </div>

          {/* Deliveries List */}
          {loadingOrders ? (
            <Spinner label="Loading active customer deliveries..." />
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-3xl border-3 border-black bg-neo-card p-10 shadow-neo-lg text-center">
              <EmptyState
                icon={<Truck className="h-10 w-10 text-black dark:text-white" />}
                title="No Item Deliveries Found"
                description="Orders selected for 'Item Delivery' at POS billing checkout will appear here for courier dispatch."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredOrders.map((order) => {
                const total =
                  order.items?.reduce(
                    (s, i) => s + Number(i.unitPriceAtOrder) * i.quantity,
                    0
                  ) ?? 0;

                const isPending = order.deliveryStatus === 'pending';
                const isOut = order.deliveryStatus === 'out_for_delivery';
                const isDelivered = order.deliveryStatus === 'delivered';

                return (
                  <div
                    key={order.id}
                    className="rounded-3xl border-3 border-black bg-neo-card p-5 sm:p-6 shadow-neo-lg flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b-2 border-black pb-3">
                        <div className="flex items-center gap-2 font-mono font-black text-sm">
                          <span>Order #{order.id.toString().padStart(4, '0')}</span>
                        </div>

                        {/* Delivery Status Badge */}
                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-black uppercase border-2 border-black shadow-neo-sm ${
                            isDelivered
                              ? 'bg-neo-lime text-black'
                              : isOut
                              ? 'bg-neo-yellow text-black'
                              : 'bg-neo-cyan text-black'
                          }`}
                        >
                          {isDelivered
                            ? 'Delivered'
                            : isOut
                            ? 'Out for Delivery'
                            : 'Pending Dispatch'}
                        </span>
                      </div>

                      {/* Recipient Details */}
                      <div className="pt-3 space-y-2 text-xs">
                        <div className="flex items-center gap-2 font-black uppercase text-sm text-neo-text">
                          <span>{order.customer?.name}</span>
                          {order.customer?.phone && (
                            <span className="font-mono text-neo-muted font-bold">
                              ({order.customer.phone})
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-2 text-neo-muted font-bold bg-neo-surface p-3 rounded-xl border-2 border-black">
                          <MapPin className="h-4 w-4 shrink-0 text-neo-pink mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-neo-text font-black block">Delivery Address:</span>
                            <p className="mt-0.5">{order.deliveryAddress || 'Store Pickup Counter'}</p>
                            {order.deliveryNotes && (
                              <p className="mt-1 text-[11px] text-neo-yellow font-black">
                                Note: {order.deliveryNotes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items preview */}
                        <div className="pt-2 text-neo-muted font-mono text-[11px] font-bold">
                          {order.items?.map((item) => (
                            <div key={item.id} className="flex justify-between">
                              <span>
                                {item.quantity}x {item.product?.name || `Product #${item.productId}`}
                              </span>
                              <span>
                                ${(Number(item.unitPriceAtOrder) * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer Total & Dispatch Actions */}
                    <div className="border-t-2 border-black pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-neo-muted block">
                          Billed Total
                        </span>
                        <span className="font-mono text-xl font-black text-neo-text">
                          ${total.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        {isPending && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={updatingOrderId === order.id}
                            onClick={() =>
                              handleUpdateDeliveryStatus(order.id, 'out_for_delivery')
                            }
                            icon={<Truck className="h-4 w-4" />}
                          >
                            Dispatch Courier
                          </Button>
                        )}

                        {isOut && (
                          <Button
                            variant="success"
                            size="sm"
                            loading={updatingOrderId === order.id}
                            onClick={() => handleUpdateDeliveryStatus(order.id, 'delivered')}
                            icon={<CheckCircle2 className="h-4 w-4" />}
                          >
                            Mark Delivered
                          </Button>
                        )}

                        {isDelivered && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-neo-lime">
                            <CheckCircle2 className="h-4 w-4" /> Receipt Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INBOUND SUPPLIER STOCK REFILLS */}
      {activeTab === 'stock_refill' && (
        <div className="space-y-6">
          {/* Refill Search */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white" />
              <input
                type="text"
                placeholder="Search supplier, reference no, notes..."
                value={refillSearch}
                onChange={(e) => setRefillSearch(e.target.value)}
                className="w-full rounded-xl border-3 border-black bg-neo-surface pl-10 pr-4 py-2 text-xs text-neo-text font-bold shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
              />
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={loadStockRefills}
              icon={<RefreshCw className="h-4 w-4" />}
              title="Refresh Refill History"
            >
              Sync
            </Button>
          </div>

          {/* Refills Table */}
          <div className="rounded-3xl border-3 border-black bg-neo-card shadow-neo-lg overflow-hidden">
            {loadingRefills ? (
              <Spinner label="Loading supplier refill history..." />
            ) : filteredRefills.length === 0 ? (
              <div className="p-10 text-center">
                <EmptyState
                  icon={<PackagePlus className="h-10 w-10 text-black dark:text-white" />}
                  title="No Stock Refills Logged"
                  description="Inbound warehouse and farm supplier deliveries refilling shelf stock will be tracked here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm text-neo-text">
                  <thead className="bg-neo-bg text-xs font-black uppercase tracking-wider text-neo-text border-b-3 border-black">
                    <tr>
                      <th className="px-6 py-4">Ref Delivery #</th>
                      <th className="px-6 py-4">Supplier / Vendor</th>
                      <th className="px-6 py-4">Units Added</th>
                      <th className="px-6 py-4">Received By</th>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4 text-right">Items Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10">
                    {filteredRefills.map((refill) => (
                      <tr key={refill.id} className="hover:bg-neo-yellow/15 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-xs">
                          <span className="bg-neo-yellow text-black px-2 py-1 rounded border-2 border-black shadow-neo-sm">
                            {refill.referenceNo}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-sm">
                          {refill.supplierName}
                          {refill.notes && (
                            <p className="text-xs text-neo-muted font-normal mt-0.5 truncate max-w-xs">
                              {refill.notes}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-black text-sm">
                          +{refill.totalItems} Units
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-neo-text">
                          {refill.receivedBy || 'Store Staff'}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-neo-muted">
                          {new Date(refill.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-black">
                          {refill.items?.length || 0} SKU(s)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receive Stock Refill Delivery Modal */}
      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-neo-card border-3 border-black p-6 sm:p-8 shadow-neo-xl space-y-5 text-neo-text my-8">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neo-yellow text-black border-2 border-black shadow-neo-sm">
                  <PackagePlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-neo-text">
                    Log Inbound Stock Refill
                  </h3>
                  <p className="text-xs text-neo-muted font-bold">
                    Receive supplier delivery to replenish physical supermarket shelf quantities
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRefillModal(false)}
                className="rounded-lg p-1.5 text-black dark:text-white hover:bg-black/10 border-2 border-transparent hover:border-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {refillError && (
              <div className="p-3 rounded-xl bg-neo-pink text-white font-bold text-xs border-2 border-black flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{refillError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRefill} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                    Supplier / Distributor *
                  </label>
                  <input
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. GreenValley Farm Supplies"
                    className="w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-xs font-bold text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                    Delivery / Manifest Ref #
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. REFILL-2026-002"
                    className="w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-xs font-mono font-bold text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Delivery Notes
                </label>
                <input
                  type="text"
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  placeholder="e.g. Batch temperature verified, pallet in aisle 3"
                  className="w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2 text-xs font-bold text-neo-text shadow-neo-sm focus:outline-hidden"
                />
              </div>

              {/* Items Table in Modal */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-neo-text">
                    Delivered Supermarket SKUs
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRefillRows((prev) => [
                        ...prev,
                        { productId: products[0]?.id || 0, quantity: 10 },
                      ])
                    }
                    className="text-xs font-black uppercase text-neo-text hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add SKU
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {refillRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-neo-surface rounded-xl border-2 border-black"
                    >
                      <div className="flex-1">
                        <select
                          value={row.productId}
                          onChange={(e) => {
                            const newId = parseInt(e.target.value, 10);
                            setRefillRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, productId: newId } : r))
                            );
                          }}
                          className="w-full rounded-lg border-2 border-black bg-neo-card px-3 py-1.5 text-xs font-bold text-neo-text"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} [{p.sku}] (On-Hand: {p.quantityInStock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => {
                            const q = parseInt(e.target.value, 10) || 1;
                            setRefillRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, quantity: q } : r))
                            );
                          }}
                          className="w-full text-right rounded-lg border-2 border-black bg-neo-card px-2.5 py-1.5 text-xs font-mono font-bold text-neo-text"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (refillRows.length > 1) {
                            setRefillRows((prev) => prev.filter((_, i) => i !== idx));
                          }
                        }}
                        disabled={refillRows.length === 1}
                        className="rounded-lg p-1.5 bg-neo-pink text-white border border-black cursor-pointer disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t-2 border-black">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRefillModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submittingRefill}
                  icon={<PackagePlus className="h-4 w-4" />}
                >
                  Confirm Refill & Update Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
