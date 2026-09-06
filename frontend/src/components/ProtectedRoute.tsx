import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';
import { ShieldX } from 'lucide-react';
import { Button } from './ui/Button';

export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requireAdmin?: boolean;
}> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neo-bg">
        <Spinner label="Verifying session credentials..." size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neo-pink text-white border-3 border-black shadow-neo mb-4">
          <ShieldX className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-neo-text">Access Denied</h2>
        <p className="mt-2 text-sm text-neo-muted max-w-md font-medium">
          Administrator privileges are required to view or execute actions in this section.
        </p>
        <div className="mt-6">
          <Button variant="primary" onClick={() => window.history.back()}>
            Return to Safety
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};