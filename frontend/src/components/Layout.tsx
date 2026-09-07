import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLowStockProductsApi } from '../api/products';
import { ThemeToggle } from './ThemeToggle';
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Users,
  ShoppingBag,
  PlusCircle,
  LogOut,
  Shield,
  UserCheck,
  Menu,
  X,
  Boxes,
  ScanLine,
  Truck,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, isAdmin, isCashier } = useAuth();
  const navigate = useNavigate();
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchLowStockBadge() {
      try {
        const low = await getLowStockProductsApi();
        setLowStockCount(low.length);
      } catch (e) {
        // Silently ignore if unauthenticated
      }
    }
    fetchLowStockBadge();
    const interval = setInterval(fetchLowStockBadge, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = isCashier
    ? [
        { to: '/pos', label: 'POS Billing', icon: ScanLine },
        { to: '/orders', label: 'Orders Pipeline', icon: ShoppingBag },
        { to: '/deliveries', label: 'Deliveries Hub', icon: Truck },
        { to: '/products', label: 'Products & Barcodes', icon: Package },
        { to: '/customers', label: 'Customers', icon: Users },
      ]
    : [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/pos', label: 'POS Billing', icon: ScanLine },
        { to: '/deliveries', label: 'Deliveries Hub', icon: Truck },
        { to: '/products', label: 'Products', icon: Package },
        {
          to: '/products/low-stock',
          label: 'Low Stock Alerts',
          icon: AlertTriangle,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
        },
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/orders', label: 'Orders Pipeline', icon: ShoppingBag },
        { to: '/orders/new', label: 'New Order', icon: PlusCircle },
      ];

  return (
    <div className="min-h-screen bg-neo-bg text-neo-text font-sans antialiased transition-colors duration-200 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b-3 border-black bg-neo-surface px-4 shadow-neo-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neo-yellow text-black font-black border-2 border-black shadow-neo-sm">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight uppercase leading-none">ProductHub</h1>
            <span className="text-[10px] font-mono font-bold text-neo-muted uppercase">ERP Suite</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            className="rounded-xl p-2 bg-neo-surface text-neo-text border-2 border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150 cursor-pointer"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation (Desktop fixed, Mobile sliding drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r-3 border-black bg-neo-surface transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b-3 border-black px-6 bg-neo-yellow shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-black text-neo-yellow font-black text-xl border-2 border-black shadow-neo-sm">
              <Boxes className="h-6 w-6 text-neo-yellow" />
            </div>
            <div>
              <h1 className="text-lg font-black text-black tracking-tight uppercase">
                ProductHub
              </h1>
              <p className="text-[10px] font-mono font-black text-black/80 tracking-widest uppercase">
                Inventory ERP
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close sidebar"
            className="md:hidden rounded-lg p-1.5 text-black hover:bg-black/10 border-2 border-black cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-neo-muted">
            Management
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-4 py-3 text-xs sm:text-sm font-black uppercase tracking-wide transition-all duration-150 ${
                  isActive
                    ? 'bg-neo-yellow text-black border-2 border-black shadow-neo-sm'
                    : 'text-neo-text border-2 border-transparent hover:border-black hover:bg-neo-yellow/15'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="rounded-md bg-neo-pink text-white px-2 py-0.5 text-xs font-mono font-bold border-2 border-black shadow-neo-sm">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Card & Settings Footer */}
        <div className="border-t-3 border-black p-4 bg-neo-card space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-neo-bg border-2 border-black shadow-neo-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neo-cyan text-black text-xs font-black border-2 border-black">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black uppercase text-neo-text">{user?.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-black bg-neo-yellow px-1.5 py-0.2 rounded border border-black">
                      <Shield className="h-2.5 w-2.5" /> Admin
                    </span>
                  ) : isCashier ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-black bg-neo-cyan px-1.5 py-0.2 rounded border border-black">
                      <ScanLine className="h-2.5 w-2.5" /> Cashier
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-black bg-neo-lime px-1.5 py-0.2 rounded border border-black">
                      <UserCheck className="h-2.5 w-2.5" /> Staff
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="rounded-xl p-2 bg-neo-pink text-white border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-72 min-h-screen p-3 sm:p-6 lg:p-8 transition-all overflow-x-hidden">
        <div className="mx-auto max-w-7xl w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};