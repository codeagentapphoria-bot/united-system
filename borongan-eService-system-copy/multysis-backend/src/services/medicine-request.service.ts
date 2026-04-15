import { MedicineRequestStatus, Prisma } from '@prisma/client';
import prisma from '../config/database';

// =============================================================================
// TYPES
// =============================================================================

export interface MedicineRequestFilters {
  status?: MedicineRequestStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// Valid status transitions — enforced server-side
const VALID_TRANSITIONS: Record<MedicineRequestStatus, MedicineRequestStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['PREPARING'],
  REJECTED: [],
  PREPARING: ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP: ['PICKED_UP'],
  PICKED_UP: ['DONE'],
  DONE: [],
};

// Map status -> timestamp field to stamp on transition
const STATUS_TIMESTAMP_FIELD: Partial<Record<MedicineRequestStatus, string>> = {
  UNDER_REVIEW: 'reviewedAt',
  APPROVED: 'reviewedAt',
  REJECTED: 'reviewedAt',
  PREPARING: 'preparedAt',
  READY_FOR_PICKUP: 'readyAt',
  PICKED_UP: 'pickedUpAt',
  DONE: 'completedAt',
};

// =============================================================================
// LIST (paginated, filterable)
// =============================================================================

export const getMedicineRequests = async (filters: MedicineRequestFilters) => {
  const { status, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.MedicineRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.resident = {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    };
  }

  const [data, total] = await Promise.all([
    prisma.medicineRequest.findMany({
      where,
      include: {
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            username: true,
            contactNumber: true,
            email: true,
            barangay: {
              select: {
                barangayName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.medicineRequest.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

// =============================================================================
// GET BY ID
// =============================================================================

export const getMedicineRequest = async (id: string) => {
  const request = await prisma.medicineRequest.findUnique({
    where: { id },
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          extensionName: true,
          username: true,
          contactNumber: true,
          email: true,
          picturePath: true,
          barangay: {
            select: {
              barangayName: true,
            },
          },
        },
      },
    },
  });

  if (!request) {
    throw new Error('Medicine request not found');
  }

  return request;
};

// =============================================================================
// STATS (dashboard counts)
// =============================================================================

export const getMedicineRequestStats = async () => {
  const counts = await prisma.medicineRequest.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const statusMap: Record<string, number> = {};
  for (const row of counts) {
    statusMap[row.status] = row._count.id;
  }

  return {
    total: Object.values(statusMap).reduce((a, b) => a + b, 0),
    pendingReview: (statusMap.SUBMITTED || 0) + (statusMap.UNDER_REVIEW || 0),
    approvedPreparing: (statusMap.APPROVED || 0) + (statusMap.PREPARING || 0),
    readyForPickup: statusMap.READY_FOR_PICKUP || 0,
    completed: (statusMap.PICKED_UP || 0) + (statusMap.DONE || 0),
    rejected: statusMap.REJECTED || 0,
  };
};

// =============================================================================
// UPDATE STATUS (with transition validation)
// =============================================================================

export const updateMedicineRequestStatus = async (
  id: string,
  newStatus: MedicineRequestStatus,
  adminId: string,
  note?: string
) => {
  const request = await prisma.medicineRequest.findUnique({ where: { id } });

  if (!request) {
    throw new Error('Medicine request not found');
  }

  const allowed = VALID_TRANSITIONS[request.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${request.status} → ${newStatus}`
    );
  }

  const updateData: Prisma.MedicineRequestUpdateInput = {
    status: newStatus,
  };

  // Stamp the relevant timestamp
  const timestampField = STATUS_TIMESTAMP_FIELD[newStatus];
  if (timestampField) {
    (updateData as any)[timestampField] = new Date();
  }

  // Set reviewedBy on first review action
  if (
    (newStatus === 'UNDER_REVIEW' || newStatus === 'APPROVED' || newStatus === 'REJECTED') &&
    !request.reviewedBy
  ) {
    updateData.reviewedBy = adminId;
  }

  // Update note if provided
  if (note !== undefined) {
    updateData.note = note;
  }

  return prisma.medicineRequest.update({
    where: { id },
    data: updateData,
    include: {
      resident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          middleName: true,
          username: true,
          contactNumber: true,
          email: true,
          barangay: {
            select: {
              barangayName: true,
            },
          },
        },
      },
    },
  });
};
