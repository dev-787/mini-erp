import { getInventorySummary, findGlobalStockMovements } from './product.db.js';
import { getCustomerMetricsInDb } from './customer.db.js';
import { getChallanMetricsInDb } from './challan.db.js';
import { findAuditLogs } from './audit.db.js';

export interface DashboardSummaryQueryParams {
  range?: string;
  date_from?: string;
  date_to?: string;
  role: string;
  userName: string;
}

export const getDashboardSummaryInDb = async (params: DashboardSummaryQueryParams): Promise<any> => {
  const { range = '30d', date_from, date_to, role, userName } = params;

  // Determine date boundaries for trend/period queries
  let startDate: Date;
  let endDate: Date = new Date();

  if (range === '7d') {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === '90d') {
    startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === 'custom' && date_from) {
    startDate = new Date(date_from);
    if (date_to) endDate = new Date(date_to);
  } else {
    // Default 30d
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  const roleLower = (role || '').toLowerCase();

  // Role permissions
  const canSeeRevenue = ['admin', 'sales', 'accounts'].includes(roleLower);
  const canSeeCustomers = ['admin', 'sales'].includes(roleLower);
  const canSeeInventory = ['admin', 'warehouse'].includes(roleLower);
  const canSeeAuditLog = roleLower === 'admin';

  // Fetch underlying metrics concurrently
  const [
    inventorySummary,
    customerMetrics,
    challanMetrics,
  ] = await Promise.all([
    canSeeInventory || roleLower === 'admin' ? getInventorySummary() : null,
    canSeeCustomers || roleLower === 'admin' ? getCustomerMetricsInDb() : null,
    canSeeRevenue || roleLower === 'admin' ? getChallanMetricsInDb(startDate.toISOString(), endDate.toISOString()) : getChallanMetricsInDb(),
  ]);

  // Executive Brief Quick Stats (Role-Tailored)
  const executiveBrief: Record<string, any> = {};

  if (canSeeRevenue) {
    executiveBrief.revenueToday = challanMetrics.revenue.revenueToday;
    executiveBrief.pendingDraftChallans = challanMetrics.pendingDraftChallans;
  }

  if (canSeeCustomers && customerMetrics) {
    executiveBrief.followUpsDueToday = customerMetrics.followUpsDueToday;
  }

  if (canSeeInventory && inventorySummary) {
    executiveBrief.lowStockAlerts = inventorySummary.lowStockCount;
  }

  // Construct Role-Aware Result
  const responsePayload: Record<string, any> = {
    greetingName: userName || 'User',
    range,
    executiveBrief,
  };

  // Section 1: Revenue (Admin, Sales, Accounts)
  if (canSeeRevenue) {
    responsePayload.revenue = challanMetrics.revenue;
  }

  // Section 2: Customers (Admin, Sales)
  if (canSeeCustomers && customerMetrics) {
    responsePayload.customers = {
      total: customerMetrics.total,
      byStatus: customerMetrics.byStatus,
    };
  }

  // Section 3: Inventory (Admin, Warehouse)
  if (canSeeInventory && inventorySummary) {
    responsePayload.inventory = {
      totalValue: inventorySummary.totalInventoryValue,
      totalProducts: inventorySummary.totalProducts,
      lowStockCount: inventorySummary.lowStockCount,
    };
  }

  // Section 4: Today Stock Activity (Admin, Warehouse)
  if (canSeeInventory) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const movementsRes = await findGlobalStockMovements({
      date_from: startOfToday.toISOString(),
      limit: 10,
    });

    responsePayload.todayStockActivity = movementsRes.data.map((m) => ({
      id: m.id,
      product: m.product_name,
      sku: m.product_sku,
      type: m.movement_type,
      quantity: m.quantity,
      reason: m.reason,
      time: m.created_at,
    }));
  }

  // Section 5: Recent System Activity (Admin Only)
  if (canSeeAuditLog) {
    const auditRes = await findAuditLogs({ page: 1, limit: 10 });
    responsePayload.recentActivity = auditRes.data.map((a) => ({
      id: a.id,
      category: a.category,
      actorName: a.performed_by,
      action: a.action,
      description: a.details,
      entityRef: a.entity_ref,
      time: a.created_at,
    }));
  }

  return responsePayload;
};
