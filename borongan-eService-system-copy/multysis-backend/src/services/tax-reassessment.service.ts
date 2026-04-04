import prisma from '../config/database';
import { computeTaxForTransaction } from './tax-computation.service';

export interface ReassessTaxData {
  reason: string;
  computedBy: string; // User ID
}

/**
 * Reassess tax for a transaction
 * Deactivates old computation and creates new one with difference calculation
 */
export const reassessTax = async (transactionId: string, data: ReassessTaxData) => {
  // Get current active computation
  const oldComputation = await prisma.taxComputation.findFirst({
    where: {
      transactionId,
      isActive: true,
    },
    include: {
      taxProfileVersion: true,
    },
  });

  if (!oldComputation) {
    throw new Error('No active tax computation found for this transaction');
  }

  // Deactivate old computation
  await prisma.taxComputation.update({
    where: { id: oldComputation.id },
    data: {
      isActive: false,
    },
  });

  // Recompute tax using current serviceData
  const newComputation = await computeTaxForTransaction(transactionId, data.computedBy);

  // Calculate difference
  const oldTax = Number(oldComputation.adjustedTax ?? oldComputation.totalTax);
  const newTax = Number(newComputation.adjustedTax ?? newComputation.totalTax);
  const differenceAmount = newTax - oldTax;

  // Update new computation with reassessment fields
  const updatedComputation = await prisma.taxComputation.update({
    where: { id: newComputation.id },
    data: {
      isReassessment: true,
      reassessmentReason: data.reason,
      previousComputationId: oldComputation.id,
      differenceAmount,
    },
    include: {
      taxProfileVersion: {
        include: {
          taxProfile: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      previousComputation: {
        select: {
          id: true,
          totalTax: true,
          adjustedTax: true,
          breakdown: true,
          computedAt: true,
        },
      },
    },
  });

  return {
    newComputation: updatedComputation,
    oldComputation: {
      id: oldComputation.id,
      totalTax: oldComputation.totalTax,
      adjustedTax: oldComputation.adjustedTax,
      breakdown: oldComputation.breakdown,
      computedAt: oldComputation.computedAt,
    },
    differenceAmount,
  };
};

/**
 * Get reassessment history for a transaction
 */
export const getReassessmentHistory = async (transactionId: string) => {
  // Get all computations ordered by computedAt
  const computations = await prisma.taxComputation.findMany({
    where: { transactionId },
    include: {
      taxProfileVersion: {
        include: {
          taxProfile: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      previousComputation: {
        select: {
          id: true,
          totalTax: true,
          adjustedTax: true,
          computedAt: true,
        },
      },
    },
    orderBy: { computedAt: 'desc' },
  });

  return computations;
};

/**
 * Get reassessment comparison (old vs new)
 */
export const getReassessmentComparison = async (computationId: string) => {
  const computation = await prisma.taxComputation.findUnique({
    where: { id: computationId },
    include: {
      previousComputation: {
        select: {
          id: true,
          totalTax: true,
          adjustedTax: true,
          breakdown: true,
          inputs: true,
          derivedValues: true,
          computedAt: true,
        },
      },
      taxProfileVersion: {
        include: {
          taxProfile: {
            include: {
              service: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!computation) {
    throw new Error('Tax computation not found');
  }

  if (!computation.isReassessment || !computation.previousComputation) {
    throw new Error('This computation is not a reassessment');
  }

  return {
    oldComputation: computation.previousComputation,
    newComputation: {
      id: computation.id,
      totalTax: computation.totalTax,
      adjustedTax: computation.adjustedTax,
      breakdown: computation.breakdown,
      inputs: computation.inputs,
      derivedValues: computation.derivedValues,
      computedAt: computation.computedAt,
      reassessmentReason: computation.reassessmentReason,
      differenceAmount: computation.differenceAmount,
    },
    differenceAmount: computation.differenceAmount,
  };
};
