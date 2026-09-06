import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product, Customer, OrderType } from '../types';
import { getProductsApi, getProductByBarcodeApi } from '../api/products';
import { lookupCustomerByPhoneApi, createCustomerApi } from '../api/customers';
import { createOrderApi } from '../api/orders';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { CameraBarcodeScanner } from '../components/CameraBarcodeScanner';
import {
  ScanLine,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  User,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Truck,
  ShoppingBag,
  Volume2,
  VolumeX,
  Printer,
  Store,
  Banknote,
  Camera,
  X,
} from 'lucide-react';

interface CartItem {
  product: Product;
  quantity: number;
}

interface ReceiptData {
  order: any;
  customer: Customer;
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash';
  tendered: number;
  change: number;
  cashierName: string;
}

export const PosBillingPage: React.FC = () => {
  const { user } = useAuth();

  // Products & Barcode state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer lookup state
  const [phoneInput, setPhoneInput] = useState('');
  const [lookingUpPhone, setLookingUpPhone] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // New customer quick-registration modal
  const [showRegModal, setShowRegModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [registeringCustomer, setRegisteringCustomer] = useState(false);

  // Fulfillment & Checkout state
  const [orderType, setOrderType] = useState<OrderType>('pos_checkout');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Completed receipt modal state
  const [completedOrder, setCompletedOrder] = useState<ReceiptData | null>(null);

  // Web Audio Scanner Beep
  const playBeep = (isSuccess: boolean = true) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isSuccess) {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 high beep
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // low buzz
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  // Load catalog for fallback search and quick-chips
  useEffect(() => {
    async function loadCatalog() {
      try {
        const data = await getProductsApi();
        setProducts(data);
      } catch (err) {
        console.error('Failed to fetch catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Keep scan input focused
  useEffect(() => {
    scanInputRef.current?.focus();
  }, [cart]);

  // Core Barcode Processor (supports hardware scanners, keyboard input, and live camera)
  const processBarcode = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    try {
      setScanMessage(null);
      let matchedProduct = products.find(
        (p) => p.barcode === code || p.sku.toUpperCase() === code.toUpperCase()
      );

      // If not cached in client, query backend barcode API
      if (!matchedProduct) {
        matchedProduct = await getProductByBarcodeApi(code);
      }

      if (matchedProduct) {
        addToCart(matchedProduct);
        playBeep(true);
        setScanMessage({ text: `Scanned: ${matchedProduct.name}`, isError: false });
        setBarcodeInput('');
      } else {
        playBeep(false);
        setScanMessage({ text: `No product found for barcode "${code}"`, isError: true });
      }
    } catch (err: any) {
      playBeep(false);
      setScanMessage({
        text: err.response?.data?.message || `Barcode "${code}" not found in inventory`,
        isError: true,
      });
    } finally {
      scanInputRef.current?.focus();
    }
  };

  // Handle Form Submit / Hardware Scanner Enter
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = (barcodeInput || scanInputRef.current?.value || '').trim();
    await processBarcode(code);
  };

  // Handle Live Camera Barcode Detection
  const handleCameraBarcodeScanned = (detectedBarcode: string) => {
    processBarcode(detectedBarcode);
  };

  const addToCart = (product: Product) => {
    if (product.quantityInStock <= 0) {
      setScanMessage({
        text: `"${product.name}" is OUT OF STOCK!`,
        isError: true,
      });
      playBeep(false);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.quantityInStock) {
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.quantityInStock) {
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Customer Phone Lookup
  const handlePhoneLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phone = phoneInput.trim();
    if (!phone) return;

    try {
      setLookingUpPhone(true);
      const found = await lookupCustomerByPhoneApi(phone);
      if (found) {
        setCustomer(found);
        if (found.address) setDeliveryAddress(found.address);
        setCheckoutError(null);
      } else {
        // Customer does not exist -> trigger registration modal!
        setShowRegModal(true);
        setRegName('');
        setRegAddress('');
        setRegEmail('');
      }
    } catch (err: any) {
      console.error('Customer lookup failed:', err);
    } finally {
      setLookingUpPhone(false);
    }
  };

  // Save new customer on-the-fly
  const handleRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    try {
      setRegisteringCustomer(true);
      const created = await createCustomerApi({
        name: regName.trim(),
        phone: phoneInput.trim(),
        address: regAddress.trim() || undefined,
        email: regEmail.trim() || undefined,
      });

      setCustomer(created);
      if (created.address) setDeliveryAddress(created.address);
      setShowRegModal(false);
      setCheckoutError(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setRegisteringCustomer(false);
    }
  };

  // Billing Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.unitPrice) * item.quantity,
    0
  );
  const tax = subtotal * 0.05; // 5% supermarket tax
  const total = subtotal + tax;

  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - total);

  // Complete Sale & Checkout
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setCheckoutError('Cannot complete sale with an empty cart.');
      return;
    }

    if (!customer) {
      setCheckoutError('Please attach a customer by entering their mobile number first.');
      return;
    }

    if (orderType === 'item_delivery' && !deliveryAddress.trim()) {
      setCheckoutError('Delivery address is required for Home Item Delivery orders.');
      return;
    }

    if (tenderedNum > 0 && tenderedNum < total) {
      setCheckoutError('Cash tendered is less than total bill. Please collect full amount.');
      return;
    }

    try {
      setSubmittingOrder(true);
      setCheckoutError(null);

      const orderData = {
        customerId: customer.id,
        orderType,
        deliveryAddress: orderType === 'item_delivery' ? deliveryAddress.trim() : null,
        deliveryNotes: orderType === 'item_delivery' ? deliveryNotes.trim() : null,
        cashierId: user?.id,
        items: cart.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const created = await createOrderApi(orderData);

      // Play success audio
      playBeep(true);

      // Open receipt modal
      setCompletedOrder({
        order: created,
        customer,
        cart: [...cart],
        subtotal,
        tax,
        total,
        paymentMethod: 'cash',
        tendered: tenderedNum || total,
        change: changeDue,
        cashierName: user?.name || 'Counter Cashier',
      });

      // Clear cart and customer
      setCart([]);
      setPhoneInput('');
      setCustomer(null);
      setAmountTendered('');
      setDeliveryAddress('');
      setDeliveryNotes('');
      setScanMessage(null);
    } catch (err: any) {
      setCheckoutError(err.response?.data?.message || 'Failed to complete checkout');
      playBeep(false);
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* POS Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-3 border-black pb-4 bg-neo-card p-4 sm:p-6 rounded-2xl border-3 shadow-neo">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neo-lime text-black border-3 border-black shadow-neo-sm">
            <ScanLine className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-text">
                POS Billing Terminal
              </h1>
              <span className="bg-neo-yellow text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-md border border-black shadow-neo-sm">
                Lane #1 Active
              </span>
            </div>
            <p className="text-xs text-neo-muted font-bold mt-0.5">
              Cashier: <strong className="text-neo-text">{user?.name}</strong> • Rapid Barcode Scan & Instant Customer Checkout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`rounded-xl p-2.5 border-2 border-black shadow-neo-sm transition-all cursor-pointer ${
              soundEnabled ? 'bg-neo-yellow text-black' : 'bg-neo-surface text-neo-muted'
            }`}
            title={soundEnabled ? 'Scanner Beep Enabled' : 'Scanner Beep Muted'}
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (window.confirm('Reset the active cart?')) {
                setCart([]);
                setCustomer(null);
                setPhoneInput('');
                setScanMessage(null);
              }
            }}
            disabled={cart.length === 0}
          >
            Clear Cart
          </Button>
        </div>
      </div>

      {/* Main Grid: Left Scanner & Cart, Right Customer & Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Barcode input, Cart items, Quick chips */}
        <div className="lg:col-span-8 space-y-6">
          {/* Barcode Scanner Input Card */}
          <div className="rounded-3xl border-3 border-black bg-neo-card p-5 sm:p-6 shadow-neo-lg space-y-3">
            <form onSubmit={handleScanSubmit} className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-neo-text">
                Barcode Scanner Input (Hardware USB/Bluetooth or Type & Press Enter)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-black dark:text-neo-yellow" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan product barcode (e.g. 8901030010015) or type SKU..."
                    className="w-full rounded-2xl border-3 border-black bg-neo-surface pl-12 pr-4 py-3.5 text-base font-mono font-black text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  onClick={handleScanSubmit}
                  icon={<Plus className="h-5 w-5" />}
                  className="shrink-0"
                >
                  Scan Item
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => setShowCameraScanner(true)}
                  icon={<Camera className="h-5 w-5" />}
                  className="shrink-0 bg-neo-cyan text-black"
                  title="Open live camera barcode scanner"
                >
                  Camera Scan
                </Button>
              </div>
            </form>

            {/* Scan Feedback Banner */}
            {scanMessage && (
              <div
                className={`p-3 rounded-xl border-2 border-black flex items-center gap-2 text-xs font-black uppercase ${
                  scanMessage.isError ? 'bg-neo-pink text-white shadow-neo-sm' : 'bg-neo-lime text-black shadow-neo-sm'
                }`}
              >
                {scanMessage.isError ? (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                )}
                <span>{scanMessage.text}</span>
              </div>
            )}

            {/* Quick Demo Barcode Simulator Chips */}
            {!loadingCatalog && products.length > 0 && (
              <div className="pt-2 border-t-2 border-black/10">
                <span className="block text-[10px] font-black uppercase tracking-wider text-neo-muted mb-2">
                  Fast Barcode Simulator (Click to simulate scanning real EAN/UPC labels):
                </span>
                <div className="flex flex-wrap gap-2">
                  {products.slice(0, 6).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        processBarcode(p.barcode || p.sku);
                      }}
                      className="rounded-lg bg-neo-surface hover:bg-neo-yellow text-neo-text hover:text-black px-2.5 py-1.5 text-xs font-mono font-bold border-2 border-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
                    >
                      {p.name} [{p.barcode?.slice(-4) || p.sku}]
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart Table Card */}
          <div className="rounded-3xl border-3 border-black bg-neo-card shadow-neo-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b-3 border-black bg-neo-bg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-5 w-5 text-black dark:text-neo-yellow" />
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-neo-text">
                  Billed Line Items ({cart.reduce((s, i) => s + i.quantity, 0)} Units)
                </h2>
              </div>
              <span className="font-mono text-xs font-black text-neo-muted">
                {cart.length} Unique SKUs
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-neo-surface border-3 border-black shadow-neo">
                  <ScanLine className="h-8 w-8 text-neo-muted" />
                </div>
                <h3 className="text-lg font-black uppercase text-neo-text">Cart Is Ready</h3>
                <p className="text-xs text-neo-muted font-bold max-w-sm mx-auto">
                  Aim handheld barcode scanner at items or tap any simulated barcode chip above to begin billing.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-sm text-neo-text">
                  <thead className="bg-neo-surface text-xs font-black uppercase tracking-wider text-neo-text border-b-2 border-black">
                    <tr>
                      <th className="px-5 py-3">Item Details</th>
                      <th className="px-4 py-3 text-center">Price</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-5 py-3 text-right">Subtotal</th>
                      <th className="px-4 py-3 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black/10">
                    {cart.map((item) => (
                      <tr key={item.product.id} className="hover:bg-neo-yellow/10 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-sm text-neo-text">{item.product.name}</div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-neo-muted font-mono">
                            <span className="bg-neo-cyan text-black px-1.5 py-0.2 rounded border border-black font-bold text-[10px]">
                              {item.product.barcode || item.product.sku}
                            </span>
                            <span>{item.product.category || 'General'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono font-bold text-sm">
                          ${Number(item.product.unitPrice).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1.5 border-2 border-black rounded-xl p-1 bg-neo-surface shadow-neo-sm">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="rounded-lg p-1 bg-neo-card hover:bg-neo-pink hover:text-white transition-colors cursor-pointer"
                              title="Decrease"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="font-mono font-black text-sm px-2">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="rounded-lg p-1 bg-neo-card hover:bg-neo-lime transition-colors cursor-pointer"
                              title="Increase"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-black text-base">
                          ${(Number(item.product.unitPrice) * item.quantity).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="rounded-xl p-2 bg-neo-pink text-white border-2 border-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Customer Lookup & Checkout Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer Lookup Card */}
          <div className="rounded-3xl border-3 border-black bg-neo-card p-5 sm:p-6 shadow-neo-xl space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-neo-yellow" />
                <h3 className="font-black text-base uppercase tracking-tight text-neo-text">
                  Customer Profile
                </h3>
              </div>
              <span className="text-[10px] font-mono font-black uppercase text-neo-muted">
                Mobile-First
              </span>
            </div>

            {customer ? (
              /* Verified Customer Badge */
              <div className="rounded-2xl border-3 border-black bg-neo-lime/25 p-4 shadow-neo-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-sm uppercase text-neo-text">
                    <CheckCircle2 className="h-4 w-4 text-black dark:text-neo-lime" />
                    <span>{customer.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomer(null);
                      setPhoneInput('');
                    }}
                    className="text-[10px] font-black uppercase text-neo-pink hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                <div className="text-xs font-mono font-bold text-neo-muted space-y-0.5">
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {customer.phone}
                  </p>
                  {customer.address && <p className="truncate">Addr: {customer.address}</p>}
                </div>

                <div className="pt-2 border-t border-black/20 flex items-center justify-between text-xs font-black uppercase">
                  <span>Loyalty Rewards</span>
                  <span className="bg-neo-yellow text-black px-2 py-0.5 rounded border border-black font-mono">
                    {customer.loyaltyPoints || 10} Pts
                  </span>
                </div>
              </div>
            ) : (
              /* Mobile Search Input */
              <form onSubmit={handlePhoneLookup} className="space-y-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                    Customer Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neo-muted" />
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="Enter mobile (e.g. +1 555-0199)"
                        className="w-full rounded-xl border-3 border-black bg-neo-surface pl-10 pr-3 py-2.5 text-xs font-mono font-bold text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="secondary"
                      size="md"
                      loading={lookingUpPhone}
                      className="shrink-0"
                    >
                      Lookup
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] font-bold text-neo-muted">
                  Tip: If number does not exist, system will prompt to quickly register them in 1-click.
                </p>

                {/* Demo Quick Customer Selectors */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput('+1 555-0199');
                    }}
                    className="text-[10px] font-mono font-black bg-neo-surface hover:bg-neo-yellow px-2 py-1 rounded border border-black cursor-pointer"
                  >
                    +1 555-0199
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput('+1 555-0248');
                    }}
                    className="text-[10px] font-mono font-black bg-neo-surface hover:bg-neo-yellow px-2 py-1 rounded border border-black cursor-pointer"
                  >
                    +1 555-0248
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneInput('+1 555-0000'); // New number test
                    }}
                    className="text-[10px] font-mono font-black bg-neo-pink text-white px-2 py-1 rounded border border-black cursor-pointer"
                  >
                    Test New (+1 555-0000)
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Fulfillment & Payment Card */}
          <div className="rounded-3xl border-3 border-black bg-neo-card p-5 sm:p-6 shadow-neo-xl space-y-5">
            {/* Fulfillment Channel */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-2">
                Fulfillment Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('pos_checkout')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                    orderType === 'pos_checkout'
                      ? 'bg-neo-yellow text-black shadow-neo-sm'
                      : 'bg-neo-surface text-neo-text'
                  }`}
                >
                  <Store className="h-4 w-4" /> In-Store Carryout
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('item_delivery')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-black uppercase border-2 border-black transition-all cursor-pointer ${
                    orderType === 'item_delivery'
                      ? 'bg-neo-cyan text-black shadow-neo-sm'
                      : 'bg-neo-surface text-neo-text'
                  }`}
                >
                  <Truck className="h-4 w-4" /> Item Delivery
                </button>
              </div>
            </div>

            {/* If Item Delivery, show address input */}
            {orderType === 'item_delivery' && (
              <div className="space-y-3 p-3.5 bg-neo-surface rounded-2xl border-2 border-black">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase text-neo-text">
                  <Truck className="h-4 w-4 text-neo-cyan" /> Delivery Dispatch Details
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-muted mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Delivery street, apt, building..."
                    className="w-full rounded-xl border-2 border-black bg-neo-card px-3 py-2 text-xs font-bold text-neo-text focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-muted mb-1">
                    Delivery Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder="Leave at front porch, gate code..."
                    className="w-full rounded-xl border-2 border-black bg-neo-card px-3 py-2 text-xs font-bold text-neo-text focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Money (Cash Only) Tender Section */}
            <div className="space-y-3 p-4 bg-neo-surface rounded-2xl border-2 border-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-neo-lime" />
                  <span className="text-xs font-black uppercase tracking-wider text-neo-text">
                    Tender Mode: Money (Cash Only)
                  </span>
                </div>
                <span className="bg-neo-lime text-black text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black shadow-neo-xs">
                  Physical Currency
                </span>
              </div>

              {/* Amount Tendered Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase text-neo-text">
                  Money Received ($ Cash Tendered)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-black text-neo-muted text-base">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder={total > 0 ? total.toFixed(2) : '0.00'}
                    className="w-full rounded-xl border-2 border-black bg-neo-card pl-8 pr-3 py-2 text-sm font-mono font-black text-neo-text focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Quick Bill Currency Preset Buttons */}
              <div className="space-y-1">
                <span className="block text-[10px] font-black uppercase text-neo-muted">
                  Quick Bill Presets:
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAmountTendered(total.toFixed(2))}
                    className="rounded-lg border-2 border-black bg-neo-yellow text-black px-2 py-1.5 text-xs font-black uppercase hover:bg-yellow-400 active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                  >
                    Exact
                  </button>
                  {[5, 10, 20, 50, 100].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => setAmountTendered(bill.toFixed(2))}
                      className="rounded-lg border-2 border-black bg-neo-card text-neo-text px-2 py-1.5 text-xs font-mono font-bold hover:bg-neo-lime hover:text-black active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    >
                      ${bill}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const nextTen = Math.ceil(total / 10) * 10;
                      setAmountTendered(nextTen.toFixed(2));
                    }}
                    className="rounded-lg border-2 border-black bg-neo-card text-neo-text px-2 py-1.5 text-xs font-mono font-bold hover:bg-neo-cyan hover:text-black active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                    title="Round up to next $10"
                  >
                    Next $10
                  </button>
                </div>
              </div>

              {/* Live Change Calculation */}
              <div className="pt-2 border-t-2 border-black/10">
                {tenderedNum >= total && total > 0 ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neo-lime/30 border-2 border-black">
                    <span className="text-xs font-black uppercase text-neo-text">
                      Change to Return:
                    </span>
                    <span className="font-mono text-xl font-black text-black dark:text-neo-lime">
                      ${changeDue.toFixed(2)}
                    </span>
                  </div>
                ) : total > 0 && tenderedNum > 0 && tenderedNum < total ? (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neo-pink/30 border-2 border-black text-neo-pink dark:text-red-300">
                    <span className="text-xs font-black uppercase">Short by:</span>
                    <span className="font-mono text-base font-black">
                      ${(total - tenderedNum).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-neo-muted px-1">
                    <span>Change:</span>
                    <span className="font-mono">$0.00</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="space-y-2 border-t-2 border-black pt-4 text-xs font-bold text-neo-muted">
              <div className="flex justify-between">
                <span className="uppercase">Cart Subtotal:</span>
                <span className="font-mono text-sm text-neo-text font-black">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="uppercase">Sales Tax (5%):</span>
                <span className="font-mono text-sm text-neo-text font-black">${tax.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-baseline border-t-2 border-black pt-3 mt-2">
                <span className="text-sm font-black uppercase text-neo-text">Billed Total:</span>
                <span className="font-mono text-3xl font-black text-neo-text">${total.toFixed(2)}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-xl bg-neo-pink text-white font-bold text-xs border-2 border-black flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Complete Sale Button */}
            <Button
              type="button"
              data-testid="complete-sale-btn"
              variant="primary"
              size="lg"
              loading={submittingOrder}
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
              icon={<Receipt className="h-5 w-5" />}
              className="w-full justify-center py-4 text-base"
            >
              Complete Sale & Print Bill
            </Button>
          </div>
        </div>
      </div>

      {/* New Customer Quick-Registration Modal */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-neo-card border-3 border-black p-6 shadow-neo-xl space-y-5 text-neo-text">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neo-yellow text-black border-2 border-black shadow-neo-sm">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-neo-text">
                    New Customer Found
                  </h3>
                  <p className="text-xs text-neo-muted font-bold">
                    Mobile not recognized — register customer to link bill
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegModal(false)}
                className="rounded-lg p-1.5 text-black dark:text-white hover:bg-black/10 border-2 border-transparent hover:border-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Mobile Number (Recorded)
                </label>
                <input
                  type="text"
                  disabled
                  value={phoneInput}
                  className="block w-full rounded-xl border-2 border-black bg-neo-surface px-3.5 py-2.5 text-xs font-mono font-black text-neo-muted"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. Jessica Alba"
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-sm font-bold text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Home / Delivery Address (Optional)
                </label>
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Street, building, apartment..."
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-xs font-bold text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-neo-text mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="block w-full rounded-xl border-3 border-black bg-neo-surface px-4 py-2.5 text-xs font-bold text-neo-text shadow-neo-sm focus:outline-hidden focus:bg-neo-yellow/10"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t-2 border-black">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRegModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={registeringCustomer}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                >
                  Save & Link to Bill
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completed Supermarket Printable Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-white text-black border-4 border-black p-6 shadow-neo-xl space-y-4 my-8 font-mono">
            {/* Supermarket Header */}
            <div className="text-center border-b-2 border-dashed border-black pb-4 space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tight">PRODUCTHUB SUPERMARKET</h2>
              <p className="text-xs font-bold">LANE 01 • STORE #402</p>
              <p className="text-[10px] text-gray-600">
                DATE: {new Date().toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-600">
                ORDER REF: #{completedOrder.order?.id?.toString().padStart(5, '0')} • CASHIER: {completedOrder.cashierName}
              </p>
            </div>

            {/* Customer & Fulfillment Info */}
            <div className="text-xs space-y-1 border-b-2 border-dashed border-black pb-3">
              <p><strong>CUSTOMER:</strong> {completedOrder.customer.name}</p>
              <p><strong>MOBILE:</strong> {completedOrder.customer.phone}</p>
              <p><strong>FULFILLMENT:</strong> {completedOrder.order.orderType === 'item_delivery' ? 'HOME ITEM DELIVERY' : 'IN-STORE CARRYOUT'}</p>
              {completedOrder.order.deliveryAddress && (
                <p><strong>DISPATCH ADDR:</strong> {completedOrder.order.deliveryAddress}</p>
              )}
            </div>

            {/* Itemized Table */}
            <div className="space-y-2 text-xs border-b-2 border-dashed border-black pb-3">
              <div className="flex justify-between font-black uppercase border-b border-black/20 pb-1 text-[11px]">
                <span>Item</span>
                <span>Qty x Price</span>
                <span>Total</span>
              </div>
              {completedOrder.cart.map((item: CartItem) => (
                <div key={item.product.id} className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[160px]">{item.product.name}</span>
                  <span>{item.quantity} x ${Number(item.product.unitPrice).toFixed(2)}</span>
                  <span className="font-bold">${(Number(item.product.unitPrice) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs border-b-2 border-dashed border-black pb-3">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>${completedOrder.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TAX (5%):</span>
                <span>${completedOrder.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black border-t border-black pt-1">
                <span>TOTAL DUE:</span>
                <span>${completedOrder.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>TENDER TYPE:</span>
                <span className="uppercase">{completedOrder.paymentMethod}</span>
              </div>
              {completedOrder.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span>TENDERED:</span>
                    <span>${completedOrder.tendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>CHANGE:</span>
                    <span>${completedOrder.change.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Receipt Barcode Graphic */}
            <div className="text-center py-2 space-y-1">
              <div className="font-barcode text-2xl tracking-widest font-black">
                ||| | |||| | |||||| || | ||||| | ||
              </div>
              <p className="text-[9px] uppercase tracking-wider text-gray-500">
                THANK YOU FOR SHOPPING AT PRODUCTHUB!
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t-2 border-black">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => window.print()}
                icon={<Printer className="h-4 w-4" />}
                className="flex-1 justify-center"
              >
                Print
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setCompletedOrder(null)}
                className="flex-1 justify-center"
              >
                New Bill
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={handleCameraBarcodeScanned}
      />
    </div>
  );
};
