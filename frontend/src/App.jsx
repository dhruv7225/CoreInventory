import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './store/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Feature pages
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

          {/* Protected routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/warehouses" element={<WarehousesPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/adjustments" element={<AdjustmentsPage />} />
            <Route path="/inventory/stock" element={<StockPage />} />
            <Route path="/inventory/movements" element={<MovementsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
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
