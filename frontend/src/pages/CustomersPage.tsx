import React, { useEffect, useState } from 'react';
import { Customer } from '../types';
import { getCustomersApi, createCustomerApi } from '../api/customers';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  ShoppingBag,
  X,
  UserPlus,
  AlertCircle,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await getCustomersApi();
      setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSubmitting(true);
      const created = await createCustomerApi({ name, email, phone, address });
      setCustomers((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      setError(err.message || 'Failed to create customer profile');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-3 border-black pb-6 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-neo-muted font-bold mt-1">
            Registered client accounts and billing profiles associated with orders.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="h-5 w-5" />}
        >
          Add Customer
        </Button>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-neo-card border-3 border-black p-4 shadow-neo">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black dark:text-white" />
          <input
            type="text"
            placeholder="Search by client name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-3 border-black bg-neo-surface pl-10 pr-4 py-2.5 text-sm text-neo-text font-bold placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
          />
        </div>

        <Button
          variant="secondary"
          size="md"
          onClick={loadCustomers}
          icon={<RefreshCw className="h-4 w-4" />}
          title="Refresh customers"
        >
          Sync
        </Button>
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border-3 border-black bg-neo-card shadow-neo-lg overflow-hidden">
        {loading ? (
          <Spinner label="Loading customer ledger..." />
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="h-10 w-10 text-black dark:text-white" />}
              title="No Customers Registered"
              description="Register customers to enable order placement and fulfillment."
              action={
                <Button variant="primary" size="md" onClick={() => setIsModalOpen(true)}>
                  Add Customer
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neo-text min-w-[620px]">
              <thead className="bg-neo-bg text-xs font-black uppercase tracking-wider text-neo-text border-b-3 border-black">
                <tr>
                  <th className="px-6 py-3.5">Client Profile</th>
                  <th className="px-6 py-3.5">Direct Contact</th>
                  <th className="px-6 py-3.5">Delivery Address</th>
                  <th className="px-6 py-3.5">Lifetime Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black/10">
                {filtered.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-neo-yellow/15 transition-colors duration-100"
                  >
                    <td className="px-6 py-4">
                      <div className="font-black text-sm text-neo-text uppercase tracking-tight">{customer.name}</div>
                      <div className="flex items-center gap-1.5 text-xs text-neo-muted font-bold mt-0.5">
                        <Mail className="h-3 w-3" />
                        <span>{customer.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.phone ? (
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-neo-muted italic font-mono">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      {customer.address ? (
                        <div className="flex items-start gap-1.5 text-xs font-medium">
                          <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-neo-yellow" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-neo-muted italic font-mono">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-neo-cyan text-black px-3 py-1 text-xs font-mono font-black border-2 border-black shadow-neo-sm">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        {customer._count?.orders ?? 0} orders
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-neo-card border-3 border-black p-6 shadow-neo-xl space-y-4 text-neo-text">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neo-yellow text-black border-2 border-black shadow-neo-sm">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Register Client</h3>
                  <p className="text-xs text-neo-muted font-medium">New purchasing profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-black dark:text-white hover:bg-black/10 border-2 border-transparent hover:border-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-neo-pink p-3 text-xs text-white font-bold border-2 border-black shadow-neo-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
                  Full Name / Enterprise Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-sm text-neo-text font-bold placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                  placeholder="e.g. Apex Industrial Solutions"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
                  Primary Email (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-sm text-neo-text font-bold placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                  placeholder="procurement@apex.io"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
                  Direct Telephone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-sm font-mono font-bold text-neo-text placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                  placeholder="+1 (555) 019-2831"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1.5">
                  Shipping Destination
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-sm text-neo-text font-medium placeholder-neo-muted shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                  placeholder="Building 4, Commerce Tech Park..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t-2 border-black">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={submitting}>
                  Save Client
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};