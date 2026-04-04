import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { computeTax, TaxComputationResult } from './tax-engine.service';
import { getTaxVersionForDate } from './tax-profile.service';
import { applyAdjustments } from './tax-adjustments.service';
import { getExemptionsByTransaction } from './exemption.service';

/**
 * Compute tax for a transaction
 */
export const computeTaxForTransaction = async (transactionId: string, computedBy?: string) => {
  // Get transaction with service data
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      service: {
        include: {
          taxProfiles: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Check if service has a tax profile
  if (!transaction.service.taxProfiles || transaction.service.taxProfiles.length === 0) {
    throw new Error('Service does not have an active tax profile');
  }

  const taxProfile = transaction.service.taxProfiles[0];

  // Determine application date (use applicationDate if provided, otherwise createdAt)
  const applicationDate = transaction.applicationDate || transaction.createdAt;

  // Get the appropriate tax version for the application date
  const taxVersion = await getTaxVersionForDate(taxProfile.id, applicationDate);

  if (!taxVersion) {
    throw new Error(`No active tax version found for date ${applicationDate.toISOString()}`);
  }

  // Deactivate any existing active computation for this transaction
  await prisma.taxComputation.updateMany({
    where: {
      transactionId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  // Get service data
  const serviceData = (transaction.serviceData as Record<string, any>) || {};

  // Compute base tax using the tax engine
  const configuration = taxVersion.configuration as any;
  const computationResult: TaxComputationResult = computeTax(configuration, serviceData);

  // Get approved exemptions for this transaction
  const exemptions = await getExemptionsByTransaction(transactionId);
  const approvedExemptions = exemptions
    .filter((e) => e.status === 'APPROVED')
    .map((e) => ({
      id: e.id,
      amount: Number(e.exemptionAmount || 0),
    }));

  // Apply adjustments (exemptions, discounts, penalties)
  let adjustedTax = computationResult.totalTax;
  let exemptionsApplied: string[] = [];
  let discountsApplied: string[] = [];
  let penaltiesApplied: string[] = [];

  if (configuration.adjustmentRules && configuration.adjustmentRules.length > 0) {
    const adjustmentResult = applyAdjustments({
      baseTax: computationResult.totalTax,
      configuration,
      serviceData,
      approvedExemptions,
    });

    adjustedTax = adjustmentResult.adjustedTax;
    exemptionsApplied = adjustmentResult.exemptionsApplied;
    discountsApplied = adjustmentResult.discountsApplied;
    penaltiesApplied = adjustmentResult.penaltiesApplied;

    // Update breakdown to include adjustment steps
    const breakdown = computationResult.breakdown as any;
    if (adjustmentResult.breakdown.applied.length > 0) {
      // Add adjustment steps to breakdown
      for (const adjustment of adjustmentResult.breakdown.applied) {
        breakdown.steps.push({
          description: adjustment.description,
          calculation: `${adjustment.rule.type}: ${adjustment.amount}`,
          amount: adjustment.amount,
        });
      }
      // Update total tax in breakdown
      breakdown.totalTax = adjustedTax;
    }
  }

  // Store computation in database
  const taxComputation = await prisma.taxComputation.create({
    data: {
      transactionId,
      taxProfileVersionId: taxVersion.id,
      isActive: true,
      inputs: computationResult.inputs as unknown as Prisma.InputJsonValue,
      derivedValues: computationResult.derivedValues as unknown as Prisma.InputJsonValue,
      breakdown: computationResult.breakdown as unknown as Prisma.InputJsonValue,
      totalTax: computationResult.totalTax,
      adjustedTax: adjustedTax !== computationResult.totalTax ? adjustedTax : null,
      exemptionsApplied:
        exemptionsApplied.length > 0
          ? (exemptionsApplied as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      discountsApplied:
        discountsApplied.length > 0
          ? (discountsApplied as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      penaltiesApplied:
        penaltiesApplied.length > 0
          ? (penaltiesApplied as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      computedBy: computedBy || null,
    },
  });

  // Link approved exemptions to computation
  if (approvedExemptions.length > 0) {
    await prisma.exemption.updateMany({
      where: {
        id: { in: approvedExemptions.map((e) => e.id) },
      },
      data: {
        taxComputationId: taxComputation.id,
      },
    });
  }

  return taxComputation;
};

/**
 * Get active tax computation for a transaction
 */
export const getActiveTaxComputation = async (transactionId: string) => {
  const computation = await prisma.taxComputation.findFirst({
    where: {
      transactionId,
      isActive: true,
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
    },
  });

  return computation;
};

/**
 * Get tax computation history for a transaction
 */
export const getTaxComputationHistory = async (transactionId: string) => {
  const computations = await prisma.taxComputation.findMany({
    where: {
      transactionId,
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
    },
    orderBy: { computedAt: 'desc' },
  });

  return computations;
};

/**
 * Recompute tax with adjustments for a transaction
 * Useful when exemptions are approved or serviceData changes
 */
export const recomputeTaxWithAdjustments = async (transactionId: string, computedBy?: string) => {
  return computeTaxForTransaction(transactionId, computedBy);
};

/**
 * Preview tax computation without creating a transaction
 * Used for showing estimated tax before transaction submission
 */
export const previewTaxComputation = async (
  serviceId: string,
  serviceData: Record<string, any>,
  applicationDate?: Date
): Promise<TaxComputationResult> => {
  // Verify service exists and has tax profile
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      taxProfiles: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  if (!service) {
    throw new Error('Service not found');
  }

  if (!service.taxProfiles || service.taxProfiles.length === 0) {
    throw new Error('Service does not have an active tax profile');
  }

  const taxProfile = service.taxProfiles[0];

  // Use provided application date or current date
  const effectiveDate = applicationDate || new Date();

  // Get the appropriate tax version for the application date
  const taxVersion = await getTaxVersionForDate(taxProfile.id, effectiveDate);

  if (!taxVersion) {
    throw new Error(`No active tax version found for date ${effectiveDate.toISOString()}`);
  }

  // Compute base tax using the tax engine
  const configuration = taxVersion.configuration as any;
  const computationResult: TaxComputationResult = computeTax(configuration, serviceData);

  // Apply adjustments (exemptions, discounts, penalties)
  // Note: For preview, we don't have approved exemptions yet, so we only apply
  // adjustment rules that don't require exemptions
  let adjustedTax = computationResult.totalTax;

  if (configuration.adjustmentRules && configuration.adjustmentRules.length > 0) {
    const adjustmentResult = applyAdjustments({
      baseTax: computationResult.totalTax,
      configuration,
      serviceData,
      approvedExemptions: [], // No exemptions for preview
    });

    adjustedTax = adjustmentResult.adjustedTax;

    // Update breakdown to include adjustment steps
    const breakdown = computationResult.breakdown as any;
    if (adjustmentResult.breakdown.applied.length > 0) {
      // Add adjustment steps to breakdown
      for (const adjustment of adjustmentResult.breakdown.applied) {
        breakdown.steps.push({
          description: adjustment.description,
          calculation: `${adjustment.rule.type}: ${adjustment.amount}`,
          amount: adjustment.amount,
        });
      }
      // Update total tax in breakdown
      breakdown.totalTax = adjustedTax;
    }
  }

  // Return preview result (without saving to database)
  return {
    ...computationResult,
    breakdown: {
      ...computationResult.breakdown,
      totalTax: adjustedTax,
    },
  };
};
