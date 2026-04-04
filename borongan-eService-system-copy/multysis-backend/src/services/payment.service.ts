import prisma from '../config/database';

export interface RecordPaymentData {
  transactionId: string;
  taxComputationId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CHECK' | 'ONLINE' | 'BANK_TRANSFER' | 'GCASH' | 'PAYMAYA' | 'OTHER';
  paymentDate?: Date;
  receivedBy: string; // User ID
  referenceNumber?: string;
  notes?: string;
}

export interface PaymentBalance {
  totalTax: number;
  totalPaid: number;
  balance: number;
}

/**
 * Record a payment for a tax computation
 */
export const recordPayment = async (data: RecordPaymentData) => {
  // Validate transaction exists
  const transaction = await prisma.transaction.findUnique({
    where: { id: data.transactionId },
  });

  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Validate tax computation exists
  const taxComputation = await prisma.taxComputation.findUnique({
    where: { id: data.taxComputationId },
  });

  if (!taxComputation) {
    throw new Error('Tax computation not found');
  }

  // Verify computation belongs to transaction
  if (taxComputation.transactionId !== data.transactionId) {
    throw new Error('Tax computation does not belong to this transaction');
  }

  // Create payment record
  const payment = await prisma.payment.create({
    data: {
      transactionId: data.transactionId,
      taxComputationId: data.taxComputationId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate || new Date(),
      receivedBy: data.receivedBy,
      referenceNumber: data.referenceNumber || null,
      notes: data.notes || null,
    },
  });

  // Calculate new balance and update transaction payment status
  await updateTransactionPaymentStatus(data.transactionId, data.taxComputationId);

  // Get updated balance
  const balance = await calculateBalance(data.transactionId, data.taxComputationId);

  return {
    ...payment,
    balance: balance.balance,
  };
};

/**
 * Get all payments for a transaction
 */
export const getPaymentsByTransaction = async (transactionId: string) => {
  const payments = await prisma.payment.findMany({
    where: { transactionId },
    orderBy: { paymentDate: 'desc' },
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

  return payments;
};

/**
 * Get payments for a specific tax computation
 */
export const getPaymentsByComputation = async (taxComputationId: string) => {
  const payments = await prisma.payment.findMany({
    where: { taxComputationId },
    orderBy: { paymentDate: 'desc' },
  });

  return payments;
};

/**
 * Calculate balance for a tax computation
 */
export const calculateBalance = async (
  transactionId: string,
  taxComputationId: string
): Promise<PaymentBalance> => {
  // Get the active tax computation
  const taxComputation = await prisma.taxComputation.findFirst({
    where: {
      transactionId,
      id: taxComputationId,
      isActive: true,
    },
  });

  if (!taxComputation) {
    throw new Error('Active tax computation not found');
  }

  // Use adjustedTax if available, otherwise use totalTax
  const totalTax = Number(taxComputation.adjustedTax ?? taxComputation.totalTax);

  // Sum all payments for this computation
  const payments = await prisma.payment.findMany({
    where: { taxComputationId },
  });

  const totalPaid = payments.reduce((sum, payment) => {
    return sum + Number(payment.amount);
  }, 0);

  const balance = totalTax - totalPaid;

  return {
    totalTax,
    totalPaid,
    balance: Math.max(0, balance), // Balance should not be negative
  };
};

/**
 * Update transaction payment status based on balance
 */
export const updateTransactionPaymentStatus = async (
  transactionId: string,
  taxComputationId: string
) => {
  const balance = await calculateBalance(transactionId, taxComputationId);

  // Determine payment status
  let paymentStatus = 'UNPAID';
  if (balance.balance <= 0) {
    paymentStatus = 'PAID';
  } else if (balance.totalPaid > 0) {
    paymentStatus = 'PARTIAL';
  }

  // Update transaction payment status and amount
  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      paymentStatus,
      paymentAmount: balance.totalTax,
    },
  });
};

/**
 * Get payment by ID
 */
export const getPayment = async (paymentId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
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

  if (!payment) {
    throw new Error('Payment not found');
  }

  return payment;
};
