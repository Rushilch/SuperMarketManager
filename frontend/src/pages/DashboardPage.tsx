import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardStats, Order } from '../types';
import { getDashboardStatsApi, getOrdersApi } from '../api/orders';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  AlertTriangle,
  ShoppingBag,
  Calendar,
  PlusCircle,
  ArrowRight,
  PackagePlus,
  ArrowUpRight,
  Zap,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setError(null);
        const [statsData, ordersData] = await Promise.all([
          getDashboardStatsApi(),
          getOrdersApi(),
        ]);
        setStats(statsData);
        setRecentOrders(ordersData.slice(0, 6));
      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.message || 'Failed to connect to supermarket operations telemetry.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return <Spinner label="Loading Supermarket Operations Data..." size="lg" />;
  }

  const statCards = [
    {
      title: 'Store Products',
      value: stats?.totalProducts ?? 0,
      unit: 'Active Items',
      icon: Package,
      bg: 'bg-neo-yellow text-black',
      link: '/products',
    },
    {
      title: 'Low Stock Warnings',
      value: stats?.lowStockCount ?? 0,
      unit: 'Items Deficit',
      icon: AlertTriangle,
      bg: (stats?.lowStockCount ?? 0) > 0 ? 'bg-neo-pink text-white animate-pulse' : 'bg-neo-cyan text-black',
      link: '/products/low-stock',
      urgent: (stats?.lowStockCount ?? 0) > 0,
    },
    {
      title: 'Total Sales',
      value: stats?.totalOrders ?? 0,
      unit: 'Orders Logged',
      icon: ShoppingBag,
      bg: 'bg-neo-lime text-black',
      link: '/orders',
    },
    {
      title: 'Monthly Volume',
      value: stats?.ordersThisMonth ?? 0,
      unit: 'Current Month',
      icon: Calendar,
      bg: 'bg-neo-cyan text-black',
      link: '/orders',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-neo-pink p-4 text-xs text-white font-bold border-3 border-black shadow-neo">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-3 border-black pb-6 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-neo-lime border border-black animate-ping" />
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
              Store Operations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neo-muted font-bold mt-1">
            Operator: <span className="bg-neo-yellow text-black px-2 py-0.5 rounded border border-black">{user?.name}</span> • Supermarket stock & sales audit telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {isAdmin && (
            <Link to="/products/new">
              <Button variant="secondary" size="md" icon={<PackagePlus className="h-4 w-4" />}>
                New SKU
              </Button>
            </Link>
          )}
          <Link to="/orders/new">
            <Button variant="primary" size="md" icon={<PlusCircle className="h-4 w-4" />}>
              Create Order
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <Link key={i} to={card.link} className="block group">
            <div
              className={`rounded-2xl border-3 border-black p-6 shadow-neo-lg hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-xl transition-all duration-150 bg-neo-card ${
                card.urgent ? 'ring-2 ring-neo-pink' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-neo-muted">
                    {card.title}
                  </span>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight font-mono text-neo-text">
                      {card.value}
                    </span>
                    <span className="text-xs text-neo-muted font-bold uppercase">{card.unit}</span>
                  </div>
                </div>
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 border-black shadow-neo-sm ${card.bg}`}
                >
                  <card.icon className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t-2 border-black flex items-center justify-between text-xs font-black uppercase text-neo-text group-hover:text-neo-yellow transition-colors">
                <span>Access Module</span>
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-2xl border-3 border-black bg-neo-card shadow-neo-lg overflow-hidden">
        <div className="flex items-center justify-between border-b-3 border-black px-6 py-4 bg-neo-yellow">
          <div className="flex items-center gap-2.5 text-black">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-neo-yellow border border-black shadow-neo-sm">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wide">Recent Transactions</h2>
              <p className="text-[11px] font-bold text-black/80">Latest atomic customer orders</p>
            </div>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-black bg-white px-3 py-1.5 rounded-lg border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
          >
            <span>All Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No transactions logged"
              description="Orders created in the system will automatically stream into this ledger."
              action={
                <Link to="/orders/new">
                  <Button variant="primary" size="md">Create Order</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neo-text min-w-[620px]">
              <thead className="bg-neo-bg text-xs font-black uppercase tracking-wider text-neo-text border-b-2 border-black">
                <tr>
                  <th className="px-6 py-3.5">Order ID</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-neo-yellow/15 transition-colors duration-100"
                  >
                    <td className="px-6 py-4 font-mono font-black text-xs">
                      #{order.id.toString().padStart(4, '0')}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">
                      {order.customer?.name || `Customer #${order.customerId}`}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono font-bold">
                      {order.items?.length || 0} SKU(s)
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-neo-muted">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit