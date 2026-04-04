import { TransactionNoteSenderType, UpdateRequestStatus } from '@prisma/client';
import prisma from '../config/database';
import cacheService from './cache.service';

export interface AdminNotificationCounts {
  pendingApplications: number;
  pendingCitizens: number;
  pendingUpdateRequests: number;
  unreadMessages: number;
  total: number;
  pendingApplicationsByService: Record<string, number>; // service code -> count
}

export interface SubscriberNotificationCounts {
  pendingUpdateRequests: number;
  unreadMessages: number;
  statusUpdates: number;
  total: number;
}

export const getAdminNotificationCounts = async (): Promise<AdminNotificationCounts> => {
  // Check Redis cache first
  const cacheKey = 'admin:notificationCounts';
  const cached = await cacheService.get<AdminNotificationCounts>(cacheKey);
  if (cached) {
    return cached;
  }

  // HYPER-OPTIMIZATION: Fetch ALL counts in a single round-trip using raw SQL.
  // This avoids parallel independent count queries that each overhead the DB.
  
  const [countsRaw, pendingAppsByServiceRaw] = await Promise.all([
    prisma.$queryRaw<{ 
      pending_citizens: number; 
      pending_update_requests: number; 
      unread_messages: number; 
    }[]>`
      SELECT 
        (SELECT CAST(COUNT(*) AS INTEGER) FROM residents WHERE status = 'pending') as pending_citizens,
        (SELECT CAST(COUNT(*) AS INTEGER) FROM transactions WHERE update_request_status = 'PENDING_ADMIN') as pending_update_requests,
        (SELECT CAST(COUNT(*) AS INTEGER) FROM transaction_notes WHERE is_read = false AND sender_type = 'RESIDENT') as unread_messages
    `,
    // Get pending applications per service code
    prisma.$queryRaw<{ code: string; count: number }[]>`
      SELECT s.code, CAST(COUNT(t.id) AS INTEGER) as count
      FROM services s
      LEFT JOIN transactions t ON s.id = t.service_id 
      AND t.payment_status = (CASE 
        WHEN s.payment_statuses->>0 IS NOT NULL THEN s.payment_statuses->>0 
        ELSE 'PENDING' 
      END)
      WHERE s.is_active = true
      GROUP BY s.code
      HAVING COUNT(t.id) > 0
    `,
  ]);

  const { pending_citizens, pending_update_requests, unread_messages } = countsRaw[0] || {
    pending_citizens: 0,
    pending_update_requests: 0,
    unread_messages: 0,
  };

  let pendingApplications = 0;
  const pendingApplicationsByService: Record<string, number> = {};
  
  pendingAppsByServiceRaw.forEach(item => {
    pendingApplications += item.count;
    pendingApplicationsByService[item.code] = item.count;
  });

  const total = pendingApplications + Number(pending_citizens) + Number(pending_update_requests) + Number(unread_messages);

  const result = {
    pendingApplications,
    pendingCitizens: Number(pending_citizens),
    pendingUpdateRequests: Number(pending_update_requests),
    unreadMessages: Number(unread_messages),
    total,
    pendingApplicationsByService,
  };

  // Cache for 30 seconds (short TTL because counts change frequently)
  await cacheService.set(cacheKey, result, 30);

  return result;
};

export const getSubscriberNotificationCounts = async (
  residentId: string
): Promise<SubscriberNotificationCounts> => {
  // Check Redis cache first (per-user cache)
  const cacheKey = `subscriber:${residentId}:notificationCounts`;
  const cached = await cacheService.get<SubscriberNotificationCounts>(cacheKey);
  if (cached) {
    return cached;
  }

  // 1. Count transactions with updateRequestStatus = 'PENDING_PORTAL' for this subscriber
  const pendingUpdateRequests = await prisma.transaction.count({
    where: {
      residentId,
      updateRequestStatus: UpdateRequestStatus.PENDING_PORTAL,
    },
  });

  // 2. Count unread transaction notes for subscriber (isRead = false AND senderType = 'ADMIN')
  const unreadMessages = await prisma.transactionNote.count({
    where: {
      isRead: false,
      senderType: TransactionNoteSenderType.ADMIN,
      transaction: {
        residentId,
      },
    },
  });

  // 3. Count transactions with recent status changes (updated in last 24 hours)
  // Only count transactions that have meaningful status changes (not just any update)
  // This helps users see new updates without overwhelming them with old transactions
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const statusUpdates = await prisma.transaction.count({
    where: {
      residentId,
      updatedAt: {
        gte: oneDayAgo,
      },
      // Only count transactions with meaningful status changes
      OR: [
        { status: { in: ['APPROVED', 'REJECTED', 'FOR_PICKUP', 'RELEASED', 'FOR_PRINTING'] } },
        { paymentStatus: { in: ['PAID', 'APPROVED', 'REJECTED'] } },
      ],
      // Exclude transactions that are still in initial pending state
      // Use OR to check if status is null OR pending, and paymentStatus is pending
      NOT: {
        AND: [
          {
            OR: [{ status: 'PENDING' }, { status: null }],
          },
          { paymentStatus: 'PENDING' },
        ],
      },
    },
  });

  const total = pendingUpdateRequests + unreadMessages + statusUpdates;

  const result = {
    pendingUpdateRequests,
    unreadMessages,
    statusUpdates,
    total,
  };

  // Cache for 30 seconds (short TTL because counts change frequently)
  await cacheService.set(cacheKey, result, 30);

  return result;
};

export interface DashboardStatistics {
  // Overview
  totalTransactions: number;
  totalTransactionsThisMonth: number;
  totalRevenue: number;
  totalRevenueThisMonth: number;
  totalResidents: number;
  totalActiveResidents: number;
  totalPendingResidents: number;
  activeServicesCount: number;

  // Transaction breakdowns
  transactionsByStatus: Record<string, number>;
  transactionsByPaymentStatus: Record<string, number>;
  transactionsByService: Array<{
    serviceCode: string;
    serviceName: string;
    count: number;
    revenue: number;
  }>;

  // Trends
  transactionTrends: Array<{ date: string; count: number; revenue: number }>; // Daily/Monthly
  subscriberGrowthTrends: Array<{ date: string; active: number; pending: number }>;

  // Citizen status
  citizensByStatus: Record<string, number>;

  // Recent activity
  recentTransactions: Array<{
    id: string;
    transactionId: string;
    serviceName: string;
    serviceCode: string;
    residentName: string;
    paymentStatus: string;
    status: string | null;
    paymentAmount: number;
    createdAt: string;
  }>;
  recentCitizens: Array<{
    id: string;
    firstName: string;
    lastName: string;
    contactNumber: string | null;
    status: string;
    createdAt: string;
  }>;

  // Social Amelioration
  beneficiaryCounts: {
    seniorCitizens: number;
    pwd: number;
    students: number;
    soloParents: number;
  };
}

export const getDashboardStatistics = async (): Promise<DashboardStatistics> => {
  const cacheKey = 'dashboard:statistics';
  
  const cached = await cacheService.get<DashboardStatistics>(cacheKey);
  if (cached) {
    return cached;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // HYPER-OPTIMIZATION: Every single DB hit is parallelized in ONE block.
  // Trends use raw SQL to avoid fetching thousands of records.
  const [
    totalTransactions,
    totalTransactionsThisMonth,
    totalResidents,
    totalActiveResidents,
    totalPendingResidents,
    activeServicesCount,
    revenueAggregation,
    revenueThisMonthAggregation,
    transactionsByStatusRaw,
    transactionsByPaymentStatusRaw,
    serviceAggregations,
    services,
    citizensByStatus,
    seniorCitizens,
    pwd,
    students,
    soloParents,
    recentTransactionsData,
    recentResidentsData,
    transactionTrendsRaw,
    activeResidentGrowthRaw,
    pendingResidentGrowthRaw,
  ] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.resident.count(),
    prisma.resident.count({ where: { status: 'active' } }),
    prisma.resident.count({ where: { status: 'pending' } }),
    prisma.service.count({
      where: { isActive: true },
    }),
    prisma.transaction.aggregate({
      _sum: { paymentAmount: true },
    }),
    prisma.transaction.aggregate({
      where: { createdAt: { gte: startOfMonth } },
      _sum: { paymentAmount: true },
    }),
    prisma.transaction.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ['paymentStatus'],
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ['serviceId'],
      _count: { id: true },
      _sum: { paymentAmount: true },
    }),
    prisma.service.findMany({
      select: { id: true, code: true, name: true },
    }),
    prisma.resident.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.seniorCitizenBeneficiary.count({ where: { status: 'ACTIVE' } }),
    prisma.pWDBeneficiary.count({ where: { status: 'ACTIVE' } }),
    prisma.studentBeneficiary.count({ where: { status: 'ACTIVE' } }),
    prisma.soloParentBeneficiary.count({ where: { status: 'ACTIVE' } }),
    // Optimized recent activity: select only what's needed, avoid big JSON blobs
    prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        transactionId: true,
        paymentStatus: true,
        status: true,
        paymentAmount: true,
        createdAt: true,
        service: { select: { name: true, code: true } },
        resident: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
    prisma.resident.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        contactNumber: true,
        status: true,
        createdAt: true,
      },
    }),
    // RAW SQL: Grouping trends inside the DB
    prisma.$queryRaw<{ date: Date; count: number; revenue: number }[]>`
      SELECT DATE_TRUNC('day', created_at) as date, CAST(COUNT(id) AS INTEGER) as count, CAST(SUM(payment_amount) AS DOUBLE PRECISION) as revenue
      FROM transactions
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE_TRUNC('month', created_at) as date, CAST(COUNT(id) AS INTEGER) as count
      FROM residents
      WHERE status = 'active' AND created_at >= ${twelveMonthsAgo}
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE_TRUNC('month', created_at) as date, CAST(COUNT(id) AS INTEGER) as count
      FROM residents
      WHERE status = 'pending' AND created_at >= ${twelveMonthsAgo}
      GROUP BY date
      ORDER BY date ASC
    `,
  ]);

  // 1. Process Revenue
  const totalRevenue = Number(revenueAggregation._sum?.paymentAmount || 0);
  const totalRevenueThisMonth = Number(revenueThisMonthAggregation._sum?.paymentAmount || 0);

  // 2. Process Breakdowns
  const transactionsByStatus: Record<string, number> = {};
  transactionsByStatusRaw.forEach((item) => {
    transactionsByStatus[item.status || 'PENDING'] = item._count.id;
  });

  const transactionsByPaymentStatus: Record<string, number> = {};
  transactionsByPaymentStatusRaw.forEach((item) => {
    transactionsByPaymentStatus[item.paymentStatus || 'UNKNOWN'] = item._count.id;
  });

  const citizensByStatusMap: Record<string, number> = {};
  citizensByStatus.forEach((item) => {
    citizensByStatusMap[item.status ?? 'unknown'] = item._count.id;
  });

  // 3. Process Service Breakdowns
  const aggregationMap = new Map(serviceAggregations.map((a) => [a.serviceId, a]));
  const transactionsByService = services
    .map((service) => {
      const agg = aggregationMap.get(service.id);
      return {
        serviceCode: service.code,
        serviceName: service.name,
        count: agg?._count.id || 0,
        revenue: Number(agg?._sum?.paymentAmount || 0),
      };
    })
    .sort((a, b) => b.count - a.count);

  // 4. Process Trends (Already grouped by DB)
  const transactionTrends = transactionTrendsRaw.map((t) => ({
    date: t.date.toISOString().split('T')[0],
    count: t.count,
    revenue: t.revenue,
  }));

  // Resident growth trends (active vs pending registrations per month)
  const residentGrowthMap = new Map<string, { active: number; pending: number }>();
  (activeResidentGrowthRaw as any[]).forEach((c) => {
    const dateKey = c.date.toISOString().split('T')[0];
    const existing = residentGrowthMap.get(dateKey) || { active: 0, pending: 0 };
    residentGrowthMap.set(dateKey, { ...existing, active: Number(c.count) });
  });
  (pendingResidentGrowthRaw as any[]).forEach((nc) => {
    const dateKey = nc.date.toISOString().split('T')[0];
    const existing = residentGrowthMap.get(dateKey) || { active: 0, pending: 0 };
    residentGrowthMap.set(dateKey, { ...existing, pending: Number(nc.count) });
  });
  const subscriberGrowthTrends: Array<{ date: string; active: number; pending: number }> =
    Array.from(residentGrowthMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

  // Recent Activity Processing
  const recentTransactions: DashboardStatistics['recentTransactions'] =
    recentTransactionsData.map((t: any) => ({
      id: t.id,
      transactionId: t.transactionId,
      serviceName: t.service.name,
      serviceCode: t.service.code,
      residentName: t.resident
        ? `${t.resident.firstName} ${t.resident.lastName}`
        : 'Unknown',
      paymentStatus: t.paymentStatus,
      status: t.status,
      paymentAmount: Number(t.paymentAmount || 0),
      createdAt: t.createdAt.toISOString(),
    }));

  const recentCitizens: DashboardStatistics['recentCitizens'] =
    recentResidentsData.map((c: any) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      contactNumber: c.contactNumber,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    }));

  const result: DashboardStatistics = {
    totalTransactions,
    totalTransactionsThisMonth,
    totalRevenue,
    totalRevenueThisMonth,
    totalResidents,
    totalActiveResidents,
    totalPendingResidents,
    activeServicesCount,
    transactionsByStatus,
    transactionsByPaymentStatus,
    transactionsByService,
    transactionTrends,
    subscriberGrowthTrends,
    citizensByStatus: citizensByStatusMap,
    recentTransactions,
    recentCitizens,
    beneficiaryCounts: {
      seniorCitizens,
      pwd,
      students,
      soloParents,
    },
  };

  await cacheService.set(cacheKey, result, 60);
  
  return result;
};
