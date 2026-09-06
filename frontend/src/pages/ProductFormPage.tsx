import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProductByIdApi, createProductApi, updateProductApi } from '../api/products';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [unitPrice, setUnitPrice] = useState<string>('0.00');
  const [quantityInStock, setQuantityInStock] = useState<string>('0');
  const [reorderThreshold, setReorderThreshold] = useState<string>('10');

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      async function load() {
        try {
          const prod = await getProductByIdApi(parseInt(id!, 10));
          setName(prod.name);
          setSku(prod.sku);
          setBarcode(prod.barcode || '');
          setCategory(prod.category || 'General');
          setDescription(prod.description || '');
          setUnitPrice(Number(prod.unitPrice).toString());
          setQuantityInStock(prod.quantityInStock.toString());
          setReorderThreshold(prod.reorderThreshold.toString());
        } catch (err: any) {
          setError(err.message || 'Failed to fetch product');
        } finally {
          setLoading(false);
        }
      }
      load();
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(unitPrice);
    const thresholdNum = parseInt(reorderThreshold, 10);
    const stockNum = parseInt(quantityInStock, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please provide a valid positive unit price');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditing) {
        await updateProductApi(parseInt(id!, 10), {
          name,
          sku,
          barcode: barcode.trim() || null,
          category: category.trim() || 'General',
          description,
          unitPrice: priceNum,
          reorderThreshold: thresholdNum,
        });
      } else {
        await createProductApi({
          name,
          sku,
          barcode: barcode.trim() || null,
          category: category.trim() || 'General',
          description,
          unitPrice: priceNum,
          quantityInStock: stockNum,
          reorderThreshold: thresholdNum,
        });
      }
      navigate('/products');
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Spinner label="Loading SKU specifications..." size="lg" />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Link to="/products" className="w-fit">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
            {isEditing ? 'Update SKU' : 'Register New SKU'}
          </h1>
          <p className="text-xs text-neo-muted font-bold mt-0.5">
            {isEditing
              ? `Edit specifications for SKU ${sku}`
              : 'Add an inventory item to the catalog with initial physical stock.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-neo-pink p-4 text-xs text-white font-bold border-3 border-black shadow-neo">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border-3 border-black bg-neo-card p-5 sm:p-8 shadow-neo-xl space-y-6"
      >
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
            Product Title *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-bold text-neo-text placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
            placeholder="e.g. Mechanical Tactile Keyboard"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              SKU Identifier *
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-mono font-black text-black dark:text-white placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
              placeholder="e.g. KB-MEC-001"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Barcode / EAN / UPC
            </label>
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-mono font-black text-neo-text placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
              placeholder="e.g. 8901030010015"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-bold text-neo-text placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
              placeholder="e.g. Produce, Dairy, Bakery, Beverages, Snacks, General"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Unit Price ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-mono font-black text-neo-text placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
              placeholder="49.99"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
            Technical Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm text-neo-text font-medium placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
            placeholder="Detailed specifications, package contents, and dimensions..."
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 border-t-2 border-black pt-5">
          {!isEditing ? (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
                Initial On-Hand Units
              </label>
              <input
                type="number"
                min="0"
                value={quantityInStock}
                onChange={(e) => setQuantityInStock(e.target.value)}
                className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-mono font-black text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
              />
              <p className="mt-1 text-xs text-neo-muted font-medium">
                Generates an initial restock audit record.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-neo-yellow/20 p-3.5 border-2 border-black shadow-neo-sm">
              <span className="text-xs font-black uppercase text-black dark:text-white">Physical On-Hand</span>
              <p className="text-2xl font-black font-mono text-neo-text mt-0.5">{quantityInStock} units</p>
              <p className="text-[10px] text-neo-muted font-bold mt-1">
                Updated automatically via Restock movements or Order reversals.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
              Reorder Threshold *
            </label>
            <input
              type="number"
              min="0"
              required
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(e.target.value)}
              className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-3 text-sm font-mono font-black text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
            />
            <p className="mt-1 text-xs text-neo-muted font-medium">
              Triggers Low-Stock alert when inventory falls &le; threshold.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t-2 border-black pt-6">
          <Link to="/products" className="w-full sm:w-auto">
            <Button type="button" variant="secondary" size="md" className="w-full sm:w-auto justify-center">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={submitting}
            icon={<Save className="h-4 w-4" />}
            className="w-full sm:w-auto justify-center"
          >
            {isEditing ? 'Save Changes' : 'Commit SKU'}
          </Button>
        </div>
      </form>
    </div>
  );
};