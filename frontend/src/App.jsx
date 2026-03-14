import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import WarehousesPage from './pages/warehouses/WarehousesPage';
import ReceiptsPage from './pages/receipts/ReceiptsPage';
import DeliveriesPage from './pages/deliveries/DeliveriesPage';
import TransfersPage from './pages/transfers/TransfersPage';
import AdjustmentsPage from './pages/adjustments/AdjustmentsPage';
import StockPage from './pages/inventory/StockPage';
import MovementsPage from './pages/inventory/MovementsPage';
import ProfilePage from './pages/profile/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            {/* Shared routes (All authenticated users) */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/inventory/stock" element={<StockPage />} />
            <Route path="/inventory/movements" element={<MovementsPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Operations & Warehouses (Admin & Manager only) */}
            <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']}><div className="contents"><Outlet /></div></ProtectedRoute>}>
              <Route path="/receipts" element={<ReceiptsPage />} />
              <Route path="/deliveries" element={<DeliveriesPage />} />
              <Route path="/transfers" element={<TransfersPage />} />
              <Route path="/adjustments" element={<AdjustmentsPage />} />
              <Route path="/warehouses" element={<WarehousesPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </AuthProvider>
  );
}
