import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { computeTaxForTransaction } from './tax-computation.service';

export interface CreateExemptionRequestData {
  transactionId: string;
  exemptionType: 'SENIOR_CITIZEN' | 'PWD' | 'SOLO_PARENT' | 'OTHER';
  requestReason: string;
  supportingDocuments?: string[]; // Array of file paths
  requestedBy: string; // Subscriber ID
}

export interface ApproveExemptionData {
  exemptionAmount: number;
  approvedBy: string; // User ID
}

export interface RejectExemptionData {
  rejectionReason: string;
}

/**
 * Create an exemption request
 */
export const createExemptionRequest = async (data: CreateExemptionRequestData) => {
  // Validate transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: data.transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Create exemption with status PENDING
  const exemption = await prisma.exemption.create({
    data: {
      transactionId: data.transactionId,
      exemptionType: data.exemptionType,
      status: 'PENDING',
      requestedBy: data.requestedBy,
      requestReason: data.requestReason,
      supportingDocuments: data.supportingDocuments
        ? (data.supportingDocuments as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  return exemption;
};

/**
 * Approve an exemption
 */
export const approveExemption = async (exemptionId: string, data: ApproveExemptionData) => {
  const exemption = await prisma.exemption.findUnique({
    where: { id: exemptionId },
    include: {
      transaction: true,
    },
  });

  if (!exemption) {
    throw new Error('Exemption not found');
  }

  if (exemption.status !== 'PENDING') {
    throw new Error(`Exemption is already ${exemption.status}`);
  }

  // Update exemption status
  const updatedExemption = await prisma.exemption.update({
    where: { id: exemptionId },
    data: {
      status: 'APPROVED',
      approvedBy: data.approvedBy,
      approvedAt: new Date(),
      exemptionAmount: data.exemptionAmount,
    },
  });

  // If there's an existing tax computation, trigger recomputation
  if (exemption.taxComputationId) {
    try {
      await computeTaxForTransaction(exemption.transactionId, data.approvedBy);
    } catch (error: any) {
      // Log error but don't fail the approval
      console.error('Failed to recompute tax after exemption approval:', error.message);
    }
  }

  return updatedExemption;
};

/**
 * Reject an exemption
 */
export const rejectExemption = async (exemptionId: string, data: RejectExemptionData) => {
  const exemption = await prisma.exemption.findUnique({
    where: { id: exemptionId },
  });

  if (!exemption) {
    throw new Error('Exemption not found');
  }

  if (exemption.status !== 'PENDING') {
    throw new Error(`Exemption is already ${exemption.status}`);
  }

  const updatedExemption = await prisma.exemption.update({
    where: { id: exemptionId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectionReason: data.rejectionReason,
    },
  });

  return updatedExemption;
};

/**
 * Get all exemptions for a transaction
 */
export const getExemptionsByTransaction = async (transactionId: string) => {
  const exemptions = await prisma.exemption.findMany({
    where: { transactionId },
    orderBy: { createdAt: 'desc' },
    include: {
      taxComputation: {
        select: {
          id: true,
          totalTax: true,
          adjustedTax: true,
        },
      },
    },
  });

  return exemptions;
};

/**
 * Get exemption by ID
 */
export const getExemption = async (exemptionId: string) => {
  const exemption = await prisma.exemption.findUnique({
    where: { id: exemptionId },
    include: {
      transaction: {
        select: {
          id: true,
          transactionId: true,
          referenceNumber: true,
        },
      },
      taxComputation: {
        select: {
          id: true,
          totalTax: true,
          adjustedTax: true,
        },
      },
    },
  });

  if (!exemption) {
    throw new Error('Exemption not found');
  }

  return exemption;
};

/**
 * Apply approved exemptions to a tax computation
 */
export const applyExemptionsToComputation = async (
  taxComputationId: string,
  exemptionIds: string[]
) => {
  // Verify all exemptions are approved
  const exemptions = await prisma.exemption.findMany({
    where: {
      id: { in: exemptionIds },
      status: 'APPROVED',
    },
  });

  if (exemptions.length !== exemptionIds.length) {
    throw new Error('Some exemptions are not approved or not found');
  }

  // Update computation's exemptionsApplied field
  const computation = await prisma.taxComputation.update({
    where: { id: taxComputationId },
    data: {
      exemptionsApplied: exemptionIds as unknown as Prisma.InputJsonValue,
    },
    include: {
      exemptions: true,
    },
  });

  // Link exemptions to computation
  await prisma.exemption.updateMany({
    where: {
      id: { in: exemptionIds },
    },
    data: {
      taxComputationId,
    },
  });

  return computation;
};

/**
 * Get all pending exemptions (for admin)
 */
export const getPendingExemptions = async () => {
  const exemptions = await prisma.exemption.findMany({
    where: { status: 'PENDING' },
    include: {
      transaction: {
        select: {
          id: true,
          transactionId: true,
          referenceNumber: true,
          service: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return exemptions;
};
