import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  FileText,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sun,
  Moon,
  Sparkles,
  Calendar,
  ChevronRight,
  Shield,
  Activity,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { fetchDashboardSummary } from '../../api/dashboard.api';
import './overview.css';

const OverviewPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = (user?.role || '').toLowerCase();

  // Range State: '7d' | '30d' | '90d' | 'custom'
  const [range, setRange] = useState('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Data State
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Hover state for SVG chart tooltip
  const [activeTooltip, setActiveTooltip] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDashboardSummary({
        range,
        dateFrom: range === 'custom' ? dateFrom : undefined,
        dateTo: range === 'custom' ? dateTo : undefined,
      });
      setSummary(data || {});
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [range, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Contextual Greeting
  const getGreetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: <Sun size={20} color="#F59E0B" /> };
    if (hour < 18) return { text: 'Good afternoon', icon: <Sparkles size={20} color="#FF540E" /> };
    return { text: 'Good evening', icon: <Moon size={20} color="#8B5CF6" /> };
  };

  const greeting = getGreetingTime();

  // Role permissions
  const canSeeRevenue = ['admin', 'sales', 'accounts'].includes(userRole);
  const canSeeCustomers = ['admin', 'sales'].includes(userRole);
  const canSeeInventory = ['admin', 'warehouse'].includes(userRole);
  const canSeeAuditLog = userRole === 'admin';

  if (loading && !summary) {
    return <DashboardSkeleton />;
  }

  const brief = summary?.executiveBrief || {};
  const revenueData = summary?.revenue || {};
  const customerData = summary?.customers || {};
  const inventoryData = summary?.inventory || {};
  const todayStockActivity = summary?.todayStockActivity || [];
  const recentActivity = summary?.recentActivity || [];

  return (
    <div className="dash-container">
      {/* Top Header Card */}
      <div className="dash-header">
        <div>
          <h1 className="dash-header-title">Dashboard Overview</h1>
          <p className="dash-header-subtitle">
            Real-time business performance, customer pipeline, and stock operations.
          </p>
        </div>

        {/* Time Range Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div className="dash-range-selector">
            <button
              type="button"
              className={`dash-range-btn ${range === '7d' ? 'active' : ''}`}
              onClick={() => setRange('7d')}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`dash-range-btn ${range === '30d' ? 'active' : ''}`}
              onClick={() => setRange('30d')}
            >
              30 Days
            </button>
            <button
              type="button"
              className={`dash-range-btn ${range === '90d' ? 'active' : ''}`}
              onClick={() => setRange('90d')}
            >
              90 Days
            </button>
            <button
              type="button"
              className={`dash-range-btn ${range === 'custom' ? 'active' : ''}`}
              onClick={() => setRange('custom')}
            >
              Custom
            </button>
          </div>

          {range === 'custom' && (
            <div className="dash-custom-dates">
              <input
                type="date"
                className="dash-date-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span style={{ fontSize: '12px', color: '#64748B' }}>to</span>
              <input
                type="date"
                className="dash-date-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Executive Brief Hero Card */}
      <div className="dash-brief-card">
        <div className="dash-brief-header">
          <div>
            <h2 className="dash-brief-greeting">
              {greeting.icon}
              <span>{greeting.text}, {summary?.greetingName || user?.name}!</span>
            </h2>
            <p className="dash-brief-sub">
              Here is your role-specific executive briefing for today.
            </p>
          </div>
          <span className="dash-role-badge">{userRole} Access</span>
        </div>

        {/* Quick Stats Line */}
        <div className="dash-quick-stats">
          {canSeeRevenue && brief.revenueToday !== undefined && (
            <div className="dash-quick-stat-item">
              <div className="dash-quick-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
                ₹
              </div>
              <div>
                <div className="dash-quick-val">₹{Number(brief.revenueToday || 0).toLocaleString('en-IN')}</div>
                <div className="dash-quick-lbl">Revenue Today</div>
              </div>
            </div>
          )}

          {canSeeRevenue && brief.pendingDraftChallans !== undefined && (
            <div
              className="dash-quick-stat-item"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard/challans')}
            >
              <div className="dash-quick-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' }}>
                <FileText size={20} />
              </div>
              <div>
                <div className="dash-quick-val">{brief.pendingDraftChallans || 0}</div>
                <div className="dash-quick-lbl">Pending Draft Challans</div>
              </div>
            </div>
          )}

          {canSeeInventory && brief.lowStockAlerts !== undefined && (
            <div
              className="dash-quick-stat-item"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard/inventory')}
            >
              <div className="dash-quick-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="dash-quick-val">{brief.lowStockAlerts || 0}</div>
                <div className="dash-quick-lbl">Low Stock Alerts</div>
              </div>
            </div>
          )}

          {canSeeCustomers && brief.followUpsDueToday !== undefined && (
            <div
              className="dash-quick-stat-item"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/dashboard/customers')}
            >
              <div className="dash-quick-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div className="dash-quick-val">{brief.followUpsDueToday || 0}</div>
                <div className="dash-quick-lbl">Follow-ups Due Today</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Stat Cards Grid */}
      <div className="dash-stats-grid">
        {canSeeRevenue && (
          <>
            <div className="dash-stat-card">
              <div>
                <div className="dash-stat-label">Total Revenue ({range.toUpperCase()})</div>
                <div className="dash-stat-value">
                  ₹{Number(revenueData.totalRevenuePeriod || 0).toLocaleString('en-IN')}
                </div>
                <div className="dash-stat-period">Confirmed Sales Challans</div>
              </div>
              <div className="dash-stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                <TrendingUp size={22} />
              </div>
            </div>

            <div className="dash-stat-card">
              <div>
                <div className="dash-stat-label">Profit Estimate</div>
                <div className="dash-stat-value">
                  ₹{Number(revenueData.profitEstimate || 0).toLocaleString('en-IN')}
                </div>
                <div className="dash-stat-period">Net Sales Margin</div>
              </div>
              <div className="dash-stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <DollarSign size={22} />
              </div>
            </div>
          </>
        )}

        {canSeeCustomers && (
          <div className="dash-stat-card">
            <div>
              <div className="dash-stat-label">Total Customers</div>
              <div className="dash-stat-value">{customerData.total || 0}</div>
              <div className="dash-stat-period">
                {customerData.byStatus?.Active || 0} Active Accounts
              </div>
            </div>
            <div className="dash-stat-icon" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
              <Users size={22} />
            </div>
          </div>
        )}

        {canSeeInventory && (
          <>
            <div className="dash-stat-card">
              <div>
                <div className="dash-stat-label">Inventory Valuation</div>
                <div className="dash-stat-value">
                  ₹{Number(inventoryData.totalValue || 0).toLocaleString('en-IN')}
                </div>
                <div className="dash-stat-period">{inventoryData.totalProducts || 0} Total Products</div>
              </div>
              <div className="dash-stat-icon" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                <Package size={22} />
              </div>
            </div>

            <div className="dash-stat-card">
              <div>
                <div className="dash-stat-label">Low Stock Count</div>
                <div className="dash-stat-value" style={{ color: inventoryData.lowStockCount > 0 ? '#DC2626' : '#0F172A' }}>
                  {inventoryData.lowStockCount || 0}
                </div>
                <div className="dash-stat-period">Items Below Threshold</div>
              </div>
              <div className="dash-stat-icon" style={{ background: '#FEF2F2', color: '#DC2626' }}>
                <AlertTriangle size={22} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row */}
      <div className="dash-charts-grid">
        {/* Revenue Trend Chart */}
        {canSeeRevenue && (
          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <h3 className="dash-chart-title">Revenue Trend</h3>
                <p className="dash-chart-subtitle">Confirmed sales performance ({range.toUpperCase()})</p>
              </div>
              <TrendingUp size={18} color="#FF540E" />
            </div>

            <div className="dash-chart-body">
              <RevenueTrendChart
                trend={revenueData.trend || []}
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
            </div>
          </div>
        )}

        {/* Customer Breakdown Chart */}
        {canSeeCustomers && (
          <div className="dash-chart-card">
            <div className="dash-chart-header">
              <div>
                <h3 className="dash-chart-title">Customer Pipeline Breakdown</h3>
                <p className="dash-chart-subtitle">Status distribution across CRM database</p>
              </div>
              <Users size={18} color="#7C3AED" />
            </div>

            <div className="dash-chart-body">
              <CustomerBreakdownChart byStatus={customerData.byStatus || {}} total={customerData.total || 0} />
            </div>
          </div>
        )}
      </div>

      {/* Activity Feeds Row */}
      <div className="dash-feeds-grid">
        {/* Today Stock Activity Feed */}
        {canSeeInventory && (
          <div className="dash-feed-card">
            <div className="dash-feed-header">
              <div>
                <h3 className="dash-feed-title">Today's Stock Activity</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Real-time stock movements logged today
                </p>
              </div>
              <Link to="/dashboard/inventory" className="dash-link-btn">
                View Ledger <ChevronRight size={14} />
              </Link>
            </div>

            {todayStockActivity.length === 0 ? (
              <div className="chart-empty-state">
                <Package size={32} style={{ color: '#CBD5E1', marginBottom: '6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  No stock movements recorded today
                </div>
              </div>
            ) : (
              <div className="dash-feed-list">
                {todayStockActivity.map((act) => (
                  <div key={act.id} className="dash-feed-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: act.type === 'IN' ? '#DCFCE7' : '#FEF3C7',
                          color: act.type === 'IN' ? '#15803D' : '#B45309',
                        }}
                      >
                        {act.type}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {act.product}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Qty: <strong>{act.quantity}</strong> • {act.reason}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent System Activity (Audit Log) */}
        {canSeeAuditLog && (
          <div className="dash-feed-card">
            <div className="dash-feed-header">
              <div>
                <h3 className="dash-feed-title">Recent System Activity</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Unified audit log of system events
                </p>
              </div>
              <Link to="/dashboard/audit-log" className="dash-link-btn">
                Full Audit Log <ChevronRight size={14} />
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <div className="chart-empty-state">
                <Activity size={32} style={{ color: '#CBD5E1', marginBottom: '6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                  No recent audit activity found
                </div>
              </div>
            ) : (
              <div className="dash-feed-list">
                {recentActivity.map((act) => (
                  <div key={act.id} className="dash-feed-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#F1F5F9',
                          color: '#475569',
                        }}
                      >
                        {act.category}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                          {act.action}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {act.description} • <em>By {act.actorName}</em>
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* Interactive SVG Revenue Trend Chart */
const RevenueTrendChart = ({ trend, activeTooltip, setActiveTooltip }) => {
  if (!trend || trend.length === 0 || trend.every((t) => Number(t.revenue) === 0)) {
    return (
      <div className="chart-empty-state">
        <TrendingUp size={36} style={{ color: '#CBD5E1', marginBottom: '8px' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
          No confirmed sales in this period
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
          Confirm sales challans to view revenue trends over time.
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...trend.map((t) => Number(t.revenue || 0))) || 1;
  const svgWidth = 500;
  const svgHeight = 200;
  const padding = 30;

  const barWidth = Math.max(12, Math.min(30, (svgWidth - padding * 2) / trend.length - 8));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="svg-chart-container">
        {/* Baseline grid lines */}
        <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#E2E8F0" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#F1F5F9" strokeDasharray="4 4" strokeWidth="1" />

        {/* Bars */}
        {trend.map((point, idx) => {
          const rev = Number(point.revenue || 0);
          const barHeight = ((svgHeight - padding * 2) * rev) / maxRevenue;
          const x = padding + idx * ((svgWidth - padding * 2) / trend.length) + 6;
          const y = svgHeight - padding - barHeight;

          return (
            <g
              key={idx}
              onMouseEnter={() => setActiveTooltip({ x: x + barWidth / 2, y, point })}
              onMouseLeave={() => setActiveTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(4, barHeight)}
                rx="4"
                fill={activeTooltip?.point === point ? '#FF540E' : '#FF7A45'}
                opacity={activeTooltip?.point === point ? 1 : 0.85}
              />
            </g>
          );
        })}
      </svg>

      {/* Hover Tooltip */}
      {activeTooltip && (
        <div
          className="chart-tooltip"
          style={{ left: `${(activeTooltip.x / svgWidth) * 100}%`, top: `${(activeTooltip.y / svgHeight) * 100}%` }}
        >
          <strong>{activeTooltip.point.date}</strong>: ₹{Number(activeTooltip.point.revenue).toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
};

/* Interactive Customer Breakdown Donut / Progress Component */
const CustomerBreakdownChart = ({ byStatus = {}, total = 0 }) => {
  const lead = byStatus.Lead || 0;
  const active = byStatus.Active || 0;
  const inactive = byStatus.Inactive || 0;

  if (total === 0) {
    return (
      <div className="chart-empty-state">
        <Users size={36} style={{ color: '#CBD5E1', marginBottom: '8px' }} />
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
          No customer accounts found
        </div>
      </div>
    );
  }

  const leadPct = Math.round((lead / total) * 100) || 0;
  const activePct = Math.round((active / total) * 100) || 0;
  const inactivePct = Math.round((inactive / total) * 100) || 0;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Segmented Distribution Bar */}
      <div style={{ height: '20px', borderRadius: '10px', background: '#F1F5F9', overflow: 'hidden', display: 'flex' }}>
        <div style={{ width: `${activePct}%`, background: '#10B981' }} title={`Active: ${active}`} />
        <div style={{ width: `${leadPct}%`, background: '#3B82F6' }} title={`Lead: ${lead}`} />
        <div style={{ width: `${inactivePct}%`, background: '#94A3B8' }} title={`Inactive: ${inactive}`} />
      </div>

      {/* Legend & Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
        <div style={{ background: '#ECFDF5', padding: '12px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#065F46' }}>{active}</div>
          <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>Active ({activePct}%)</div>
        </div>

        <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1E40AF' }}>{lead}</div>
          <div style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: 600 }}>Lead ({leadPct}%)</div>
        </div>

        <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#334155' }}>{inactive}</div>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Inactive ({inactivePct}%)</div>
        </div>
      </div>
    </div>
  );
};

/* Skeleton Loader */
const DashboardSkeleton = () => (
  <div className="dash-container">
    <div className="skeleton-dash-card" style={{ height: '80px' }} />
    <div className="skeleton-dash-card" style={{ height: '180px' }} />
    <div className="dash-stats-grid">
      <div className="skeleton-dash-card" style={{ height: '100px' }} />
      <div className="skeleton-dash-card" style={{ height: '100px' }} />
      <div className="skeleton-dash-card" style={{ height: '100px' }} />
      <div className="skeleton-dash-card" style={{ height: '100px' }} />
    </div>
    <div className="dash-charts-grid">
      <div className="skeleton-dash-card" style={{ height: '260px' }} />
      <div className="skeleton-dash-card" style={{ height: '260px' }} />
    </div>
  </div>
);

export default OverviewPage;
