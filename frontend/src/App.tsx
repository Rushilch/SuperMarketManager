import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { CustomersPage } from './pages/CustomersPage';
import { OrdersPage } from './pages/OrdersPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { PosBillingPage } from './pages/PosBillingPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { useAuth } from './context/AuthContext';

const HomeRoute: React.FC = () => {
  const { isCashier } = useAuth();
  if (isCashier) {
    return <Navigate to="/pos" replace />;
  }
  return <DashboardPage />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Application Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeRoute />} />
              <Route path="/pos" element={<PosBillingPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/low-stock" element={<ProductsPage />} />

              {/* Admin-only Product Mutation Routes */}
              <Route
                path="/products/new"
                element={
                  <ProtectedRoute requireAdmin>
                    <ProductFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/products/:id/edit"
                element={
                  <ProtectedRoute requireAdmin>
                    <ProductFormPage />
                  </ProtectedRoute>
                }
              />

              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/new" element={<NewOrderPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;