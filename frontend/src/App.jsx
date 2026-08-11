import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/auth/LoginPage';
import AcceptInvitePage from './pages/auth/AcceptInvitePage';
import SignupPage from './pages/auth/SignupPage';

import AuthGuard from './components/auth/AuthGuard';
import RoleGuard from './components/auth/RoleGuard';
import DashboardLayout from './components/layout/DashboardLayout';

import OverviewPage from './pages/dashboard/OverviewPage';
import CustomersListPage from './pages/dashboard/customers/CustomersListPage';
import CustomerDetailPage from './pages/dashboard/customers/CustomerDetailPage';

import ProductsListPage from './pages/dashboard/products/ProductsListPage';
import ProductDetailPage from './pages/dashboard/products/ProductDetailPage';
import InventoryOverviewPage from './pages/dashboard/inventory/InventoryOverviewPage';

import ChallansPage from './pages/dashboard/ChallansPage';
import UsersPage from './pages/dashboard/UsersPage';
import AuditLogPage from './pages/dashboard/AuditLogPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Nested Protected Dashboard Shell Routes */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <DashboardLayout />
            </AuthGuard>
          }
        >
          <Route index element={<OverviewPage />} />

          {/* Customer CRM Routes */}
          <Route
            path="customers"
            element={
              <RoleGuard path="/dashboard/customers">
                <CustomersListPage />
              </RoleGuard>
            }
          />
          <Route
            path="customers/:id"
            element={
              <RoleGuard path="/dashboard/customers">
                <CustomerDetailPage />
              </RoleGuard>
            }
          />

          {/* Product Catalog & Inventory Routes */}
          <Route
            path="products"
            element={
              <RoleGuard path="/dashboard/products">
                <ProductsListPage />
              </RoleGuard>
            }
          />
          <Route
            path="products/:id"
            element={
              <RoleGuard path="/dashboard/products">
                <ProductDetailPage />
              </RoleGuard>
            }
          />
          <Route
            path="inventory"
            element={
              <RoleGuard path="/dashboard/inventory">
                <InventoryOverviewPage />
              </RoleGuard>
            }
          />

          <Route
            path="challans"
            element={
              <RoleGuard path="/dashboard/challans">
                <ChallansPage />
              </RoleGuard>
            }
          />
          <Route
            path="users"
            element={
              <RoleGuard path="/dashboard/users">
                <UsersPage />
              </RoleGuard>
            }
          />
          <Route
            path="audit-log"
            element={
              <RoleGuard path="/dashboard/audit-log">
                <AuditLogPage />
              </RoleGuard>
            }
          />
        </Route>

        {/* Alias legacy role routes if navigated directly */}
        <Route path="/sales" element={<Navigate to="/dashboard" replace />} />
        <Route path="/warehouse" element={<Navigate to="/dashboard" replace />} />
        <Route path="/accounts" element={<Navigate to="/dashboard" replace />} />

        {/* Fallback */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
}

export default App;
