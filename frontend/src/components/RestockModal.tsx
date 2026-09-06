import React, { useState } from 'react';
import { Product } from '../types';
import { restockProductApi } from '../api/products';
import { Button } from './ui/Button';
import { PackagePlus, X, AlertCircle } from 'lucide-react';

interface RestockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
}

export const RestockModal: React.FC<RestockModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [quantity, setQuantity] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a positive restock quantity');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await restockProductApi(product.id, quantity);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restock product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-neo-card border-3 border-black p-6 shadow-neo-xl space-y-4 text-neo-text">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neo-lime text-black border-2 border-black shadow-neo-sm">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-neo-text">Restock SKU</h3>
              <p className="text-xs text-neo-muted font-medium">Physical inventory shipment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-black dark:text-white hover:bg-black/10 transition-colors border-2 border-transparent hover:border-black"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Details Pill */}
        <div className="rounded-xl bg-neo-yellow/20 p-3.5 border-2 border-black space-y-1">
          <div className="font-bold text-sm text-neo-text">{product.name}</div>
          <div className="flex items-center justify-between text-xs text-neo-muted">
            <span>SKU: <code className="font-mono font-bold text-black dark:text-white bg-neo-yellow px-1.5 py-0.5 rounded border border-black">{product.sku}</code></span>
            <span>Current On-Hand: <strong className="text-neo-text font-mono font-bold text-sm">{product.quantityInStock}</strong></span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-neo-pink p-3 text-xs text-white font-bold border-2 border-black shadow-neo-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Units To Add
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-base text-neo-text font-mono font-bold shadow-neo-sm focus:border-black focus:outline-hidden focus:bg-neo-yellow/10"
              required
              autoFocus
            />
            <p className="mt-1.5 text-xs text-neo-muted font-medium">
              New physical on-hand will be <strong className="text-neo-text font-bold">{product.quantityInStock + (quantity || 0)} units</strong>.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t-2 border-black">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Confirm Restock
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};