export type Role = 'admin' | 'staff' | 'cashier';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  category?: string;
  description: string | null;
  unitPrice: string | number;
  quantityInStock: number;
  reorderThreshold: number;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orderItems: number;
    stockMovements: number;
  };
  stockMovements?: StockMovement[];
}

export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone: string | null;
  address: string | null;
  loyaltyPoints?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
}

export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'cancelled';
export type OrderType = 'pos_checkout' | 'item_delivery';
export type DeliveryStatus =
  | 'not_applicable'
  | 'pending'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceAtOrder: string | number;
  product?: Product;
}

export interface Order {
  id: number;
  customerId: number;
  customer?: Customer;
  status: OrderStatus;
  orderType?: OrderType;
  deliveryStatus?: DeliveryStatus;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  cashierId?: number | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export type MovementReason = 'order' | 'restock' | 'adjustment';

export interface StockMovement {
  id: number;
  productId: number;
  changeQuantity: number;
  reason: MovementReason;
  createdAt: string;
}

export interface StockRefillItem {
  id: number;
  refillId: number;
  productId: number;
  quantity: number;
  costPrice?: string | number | null;
  product?: Product;
}

export interface StockRefill {
  id: number;
  referenceNo: string;
  supplierName: string;
  status: string;
  notes: string | null;
  receivedBy: string | null;
  totalItems: number;
  createdAt: string;
  items?: StockRefillItem[];
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalOrders: number;
  ordersThisMonth: number;
}
