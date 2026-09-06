import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Product } from '../types';
import { getProductsApi } from '../api/products';
import { LowStockBadge } from '../components/LowStockBadge';
import { RestockModal } from '../components/RestockModal';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  AlertTriangle,
  PackagePlus,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [selectedProductForRestock, setSelectedProductForRestock] = useState<Product | null>(null);

  const { isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.includes('/low-stock')) {
      setShowLowStockOnly(true);
    }
  }, [location.pathname]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProductsApi(showLowStockOnly);
      setProducts(data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [showLowStockOnly]);

  const handleRestockSuccess = (updated: Product) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              ...updated,
              isLowStock: updated.quantityInStock <= updated.reorderThreshold,
            }
          : p
      )
    );
  };

  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-3 border-black pb-6 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
              {showLowStockOnly ? 'Low Stock Warnings' : 'Inventory Catalog'}
            </h1>
            {showLowStockOnly && (
              <span className="rounded-md bg-neo-pink text-white px-2.5 py-0.5 text-xs font-mono font-black uppercase border-2 border-black shadow-neo-sm animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neo-muted font-bold mt-1">
            {showLowStockOnly
              ? 'Catalog items with on-hand units falling at or below designated threshold.'
              : 'Inspect physical SKU levels, unit prices, and execute warehouse stock deliveries.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/products/new">
              <Button variant="primary" size="md" icon={<Plus className="h-5 w-5" />}>
                Add SKU
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-neo-card border-3 border-black p-4 shadow-neo">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white" />
          <input
            type="text"
            placeholder="Search by SKU code or product title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-3 border-black bg-neo-surface pl-10 pr-4 py-2.5 text-sm text-neo-text font-bold placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <label className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-neo-text cursor-pointer select-none bg-neo-surface px-4 py-2.5 rounded-xl border-2 border-black shadow-neo-sm hover:shadow-neo transition-all">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-2 border-black accent-neo-yellow cursor-pointer"
            />
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-neo-yellow" />
              Low Stock Only
            </span>
          </label>

          <Button
            variant="secondary"
            size="md"
            onClick={loadProducts}
            icon={<RefreshCw className="h-4 w-4" />}
            title="Refresh list"
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border-3 border-black bg-neo-card shadow-neo-lg overflow-hidden">
        {loading ? (
          <Spinner label="Scanning warehouse inventory..." />
        ) : filteredProducts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Package className="h-10 w-10 text-black dark:text-white" />}
              title="No SKUs Found"
              description="Adjust your search filter to locate inventory records."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neo-text min-w-[680px]">
              <thead className="bg-neo-bg text-xs font-black uppercase tracking-wider text-neo-text border-b-3 border-black">
                <tr>
                  <th className="px-6 py-3.5">SKU Code</th>
                  <th className="px-6 py-3.5">Item Description</th>
                  <th className="px-6 py-3.5">Unit Price</th>
                  <th className="px-6 py-3.5">Physical Stock</th>
                  <th className="px-6 py-3.5">Reorder Point</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {filteredProducts.map((product) => {
                  const isLow = product.quantityInStock <= product.reorderThreshold;
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-neo-yellow/15 transition-colors duration-100 ${
                        isLow ? 'bg-neo-pink/5' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-black bg-neo-yellow text-black px-2 py-1 rounded border-2 border-black shadow-neo-sm">
                          {product.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-black text-sm text-neo-text uppercase tracking-tight">{product.name}</div>
                        {product.description && (
                          <div className="text-xs text-neo-muted truncate max-w-sm font-medium mt-0.5">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-sm">
                        ${Number(product.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-black text-sm ${
                              product.quantityInStock === 0
                                ? 'text-neo-pink'
                                : isLow
                                ? 'text-neo-yellow'
                                : 'text-neo-text'
                            }`}
                          >
                            {product.quantityInStock}
                          </span>
                          <LowStockBadge
                            quantity={product.quantityInStock}
                            threshold={product.reorderThreshold}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-neo-muted">
                        {product.reorderThreshold}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && (
                            <Button
                              variant="success"
                              size="sm"
                              icon={<PackagePlus className="h-3.5 w-3.5 text-black" />}
                              onClick={() => setSelectedProductForRestock(product)}
                              title="Restock units"
                            >
                              Restock
                            </Button>
                          )}
                          {isAdmin && (
                            <Link to={`/products/${product.id}/edit`}>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={<Edit3 className="h-3.5 w-3.5" />}
                                title="Edit SKU parameters"
                              >
                                Edit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Modal */}
      <RestockModal
        product={selectedProductForRestock}
        isOpen={!!selectedProductForRestock}
        onClose={() => setSelectedProductForRestock(null)}
        onSuccess={handleRestockSuccess}
      />
    </div>
  );
};