import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Package, ClipboardList, Shield, Lock, LogOut, Crown, Briefcase, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import AdminAuthManager from '../../components/admin/AdminAuthManager';
import rapidLogo from '../../assets/new-rapid-logo.png';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout, checkAuth, initialized } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!initialized) {
      checkAuth();
    }
  }, [initialized, checkAuth]);

  if (!user && initialized) {
    navigate('/login', { replace: true });
    return null;
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0F172A', color: '#FFF' }}>
        Loading session...
      </div>
    );
  }

  const role = user.role?.toLowerCase() || 'sales';

  const roleBadgeColors = {
    admin: { bg: '#FEE2E2', color: '#991B1B', label: 'Admin (Super User)', icon: <Crown size={14} /> },
    sales: { bg: '#DBEAFE', color: '#1E40AF', label: 'Sales Team', icon: <Briefcase size={14} /> },
    warehouse: { bg: '#FEF3C7', color: '#92400E', label: 'Warehouse Manager', icon: <Package size={14} /> },
    accounts: { bg: '#D1FAE5', color: '#065F46', label: 'Accounts Officer', icon: <BarChart3 size={14} /> },
  };

  const badge = roleBadgeColors[role] || roleBadgeColors.sales;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A', fontFamily: 'system-ui, sans-serif' }}>
      {/* Top Navbar */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={rapidLogo} alt="ERP" style={{ height: '32px', objectFit: 'contain' }} />
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A' }}>Wholesale ERP</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Role Badge */}
          <span style={{
            background: badge.bg,
            color: badge.color,
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {badge.icon} {badge.label}
          </span>

          {/* User Info */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F172A' }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>{user.email}</div>
          </div>

          {/* Security & Invites Control Modal Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            style={{
              padding: '8px 14px',
              background: '#0F172A',
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Lock size={14} /> {user.role?.toLowerCase() === 'admin' ? 'Manage Invites & Sessions' : 'Active Sessions'}
          </button>

          {/* Logout Button */}
          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            style={{
              padding: '8px 14px',
              background: '#F1F5F9',
              color: '#EF4444',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '32px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          marginBottom: '24px',
        }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: '800' }}>
            Welcome back, {user.name}!
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: '15px' }}>
            You are authenticated as <strong>{user.email}</strong> with role <strong>{user.role?.toUpperCase()}</strong>.
          </p>
        </div>

        {/* System Module Overview Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          <div style={{
            background: '#FFF',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}>
            <div style={{ marginBottom: '12px', color: '#FF540E' }}><Users size={28} /></div>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700' }}>CRM & Customers</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>
              Manage leads, active customers, and follow-up logs.
            </p>
            <span style={{ fontSize: '12px', fontWeight: '600', color: role === 'sales' || role === 'admin' ? '#10B981' : '#64748B' }}>
              {role === 'sales' || role === 'admin' ? '✓ Full Access' : '• Read Only'}
            </span>
          </div>

          <div style={{
            background: '#FFF',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}>
            <div style={{ marginBottom: '12px', color: '#FF540E' }}><Package size={28} /></div>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700' }}>Inventory & Stock</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>
              Track product stock, low-stock alerts, and stock movements.
            </p>
            <span style={{ fontSize: '12px', fontWeight: '600', color: role === 'warehouse' || role === 'admin' ? '#10B981' : '#64748B' }}>
              {role === 'warehouse' || role === 'admin' ? '✓ Full Access' : '• Read Only'}
            </span>
          </div>

          <div style={{
            background: '#FFF',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}>
            <div style={{ marginBottom: '12px', color: '#FF540E' }}><ClipboardList size={28} /></div>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700' }}>Sales Challans</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>
              Create draft dispatches & confirm atomic stock deduction.
            </p>
            <span style={{ fontSize: '12px', fontWeight: '600', color: role === 'sales' || role === 'accounts' || role === 'admin' ? '#10B981' : '#64748B' }}>
              {role === 'sales' || role === 'admin' ? '✓ Full Access' : '• View Access'}
            </span>
          </div>

          <div style={{
            background: '#FFF',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}>
            <div style={{ marginBottom: '12px', color: '#FF540E' }}><Shield size={28} /></div>
            <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: '700' }}>Auth & Security</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748B' }}>
              Invite system, session revocation, and JWT cookie security.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '6px 12px',
                background: '#FF540E',
                color: '#FFF',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Open Control Panel
            </button>
          </div>
        </div>
      </main>

      {showAuthModal && (
        <AdminAuthManager user={user} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

export default DashboardPage;
