import { TransactionNoteSenderType, UpdateRequestStatus } from '@prisma/client';
import prisma from '../config/database';

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
  // HYPER-OPTIMIZATION: Fetch ALL counts in a single round-trip using raw SQL.
  // This avoids parallel independent count queries that each overhead the DB.
  
  const [countsRaw, pendingAppsByServiceRaw] = await Promise.all([
    prisma.$queryRaw<{ 
      pending_citizens: number; 
      pending_update_requests: number; 
      unread_messages: number; 
    }[]>`
      SELECT 
        (SELECT CAST(COUNT(*) AS INTEGER) FROM citizens WHERE "residencyStatus" = 'PENDING') as pending_citizens,
        (SELECT CAST(COUNT(*) AS INTEGER) FROM transactions WHERE "updateRequestStatus" = 'PENDING_ADMIN') as pending_update_requests,
        (SELECT CAST(COUNT(*) AS INTEGER) FROM transaction_notes WHERE "isRead" = false AND "senderType" = 'SUBSCRIBER') as unread_messages
    `,
    // Get pending applications per service code
    prisma.$queryRaw<{ code: string; count: number }[]>`
      SELECT s.code, CAST(COUNT(t.id) AS INTEGER) as count
      FROM services s
      LEFT JOIN transactions t ON s.id = t."serviceId" 
      AND t."paymentStatus" = (CASE 
        WHEN s."paymentStatuses"->>0 IS NOT NULL THEN s."paymentStatuses"->>0 
        ELSE 'PENDING' 
      END)
      WHERE s."isActive" = true
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

  return {
    pendingApplications,
    pendingCitizens: Number(pending_citizens),
    pendingUpdateRequests: Number(pending_update_requests),
    unreadMessages: Number(unread_messages),
    total,
    pendingApplicationsByService,
  };
};

export const getSubscriberNotificationCounts = async (
  subscriberId: string
): Promise<SubscriberNotificationCounts> => {
  // 1. Count transactions with updateRequestStatus = 'PENDING_PORTAL' for this subscriber
  const pendingUpdateRequests = await prisma.transaction.count({
    where: {
      subscriberId,
      updateRequestStatus: UpdateRequestStatus.PENDING_PORTAL,
    },
  });

  // 2. Count unread transaction notes for subscriber (isRead = false AND senderType = 'ADMIN')
  const unreadMessages = await prisma.transactionNote.count({
    where: {
      isRead: false,
      senderType: TransactionNoteSenderType.ADMIN,
      transaction: {
        subscriberId,
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
      subscriberId,
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

  return {
    pendingUpdateRequests,
    unreadMessages,
    statusUpdates,
    total,
  };
};

export interface DashboardStatistics {
  // Overview
  totalTransactions: number;
  totalTransactionsThisMonth: number;
  totalRevenue: number;
  totalRevenueThisMonth: number;
  totalSubscribers: number;
  totalCitizens: number;
  totalNonCitizens: number;
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
  subscriberGrowthTrends: Array<{ date: string; citizens: number; nonCitizens: number }>;

  // Citizen status
  citizensByStatus: Record<string, number>;

  // Recent activity
  recentTransactions: Array<{
    id: string;
    transactionId: string;
    serviceName: string;
    serviceCode: string;
    subscriberName: string;
    paymentStatus: string;
    status: string | null;
    paymentAmount: number;
    createdAt: string;
  }>;
  recentCitizens: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    residencyStatus: string;
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
    totalSubscribers,
    totalCitizens,
    totalNonCitizens,
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
    recentCitizensData,
    transactionTrendsRaw,
    citizenGrowthRaw,
    nonCitizenGrowthRaw,
  ] = await Promise.all([
    prisma.transaction.count(),
    prisma.transaction.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
    prisma.subscriber.count(),
    prisma.citizen.count(),
    prisma.nonCitizen.count(),
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
    prisma.citizen.groupBy({
      by: ['residencyStatus'],
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
        subscriber: {
          select: {
            citizen: { select: { firstName: true, lastName: true } },
            nonCitizen: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.citizen.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        residencyStatus: true,
        createdAt: true,
      },
    }),
    // RAW SQL: Grouping trends inside the DB
    prisma.$queryRaw<{ date: Date; count: number; revenue: number }[]>`
      SELECT DATE_TRUNC('day', "createdAt") as date, CAST(COUNT(id) AS INTEGER) as count, CAST(SUM("paymentAmount") AS DOUBLE PRECISION) as revenue
      FROM transactions
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE_TRUNC('month', "createdAt") as date, CAST(COUNT(id) AS INTEGER) as count
      FROM citizens
      WHERE "createdAt" >= ${twelveMonthsAgo}
      GROUP BY date
      ORDER BY date ASC
    `,
    prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT DATE_TRUNC('month', "createdAt") as date, CAST(COUNT(id) AS INTEGER) as count
      FROM non_citizens
      WHERE "createdAt" >= ${twelveMonthsAgo}
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
    citizensByStatusMap[item.residencyStatus] = item._count.id;
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

  const subscriberGrowthMap = new Map<string, { citizens: number; nonCitizens: number }>();
  citizenGrowthRaw.forEach((c) => {
    const dateKey = c.date.toISOString().split('T')[0];
    const existing = subscriberGrowthMap.get(dateKey) || { citizens: 0, nonCitizens: 0 };
    subscriberGrowthMap.set(dateKey, { ...existing, citizens: c.count });
  });

  nonCitizenGrowthRaw.forEach((nc) => {
    const dateKey = nc.date.toISOString().split('T')[0];
    const existing = subscriberGrowthMap.get(dateKey) || { citizens: 0, nonCitizens: 0 };
    subscriberGrowthMap.set(dateKey, { ...existing, nonCitizens: nc.count });
  });

  const subscriberGrowthTrends = Array.from(subscriberGrowthMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 5. Recent Activity Processing
  const recentTransactions = recentTransactionsData.map((t) => ({
    id: t.id,
    transactionId: t.transactionId,
    serviceName: t.service.name,
    serviceCode: t.service.code,
    subscriberName: t.subscriber.citizen
      ? `${t.subscriber.citizen.firstName} ${t.subscriber.citizen.lastName}`
      : t.subscriber.nonCitizen
        ? `${t.subscriber.nonCitizen.firstName} ${t.subscriber.nonCitizen.lastName}`
        : 'Unknown',
    paymentStatus: t.paymentStatus,
    status: t.status,
    paymentAmount: Number(t.paymentAmount || 0),
    createdAt: t.createdAt.toISOString(),
  }));

  const recentCitizens = recentCitizensData.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phoneNumber: c.phoneNumber,
    residencyStatus: c.residencyStatus,
    createdAt: c.createdAt.toISOString(),
  }));

  return {
    totalTransactions,
    totalTransactionsThisMonth,
    totalRevenue,
    totalRevenueThisMonth,
    totalSubscribers,
    totalCitizens,
    totalNonCitizens,
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
};
