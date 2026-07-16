import { NextFunction, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { getAllowedPages } from './user.service';
import {
  adminPathToServiceCode,
  matchesAllowedPath,
  serviceCodeToAdminPath,
} from '../utils/adminPath';

export interface ServiceAccessScope {
  all: boolean;
  serviceCodes: string[];
}

export type AllowedServiceAccess = { all: boolean; codes: string[] };

type RequestValueGetter = string | ((req: AuthRequest) => string | undefined);

const SERVICE_WILDCARD_PATH = '/admin/e-government/:serviceCode';

const normalizeServiceCode = (serviceCode: string): string =>
  serviceCode.trim().toUpperCase().replace(/-/g, '_');

export const getServiceAccessScope = async (userId: string): Promise<ServiceAccessScope> => {
  const allowedPages = await getAllowedPages(userId);
  const allowedPaths = allowedPages.map((page) => page.path);

  if (matchesAllowedPath('/admin/e-government/__probe__', allowedPaths)) {
    return { all: true, serviceCodes: [] };
  }

  const serviceCodes = Array.from(
    new Set(
      allowedPaths
        .filter((path) => path !== SERVICE_WILDCARD_PATH)
        .map(adminPathToServiceCode)
        .filter((code): code is string => Boolean(code))
    )
  );

  return { all: false, serviceCodes };
};

const serviceCodeIsInScope = (serviceCode: string, scope: ServiceAccessScope): boolean =>
  scope.all || scope.serviceCodes.includes(normalizeServiceCode(serviceCode));

const getRequestValue = (req: AuthRequest, getter: RequestValueGetter): string | undefined => {
  if (typeof getter === 'function') return getter(req);
  return req.params[getter] || req.body?.[getter] || (req.query[getter] as string | undefined);
};

const canAccessResolvedServiceCode = async (
  userId: string,
  serviceCode: string
): Promise<boolean> => {
  try {
    const scope = await getServiceAccessScope(userId);
    return serviceCodeIsInScope(serviceCode, scope);
  } catch {
    return false;
  }
};

const requireScopedAccess = (
  getter: RequestValueGetter,
  canAccess: (userId: string, value: string) => Promise<boolean>,
  missingMessage: string
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }

    if (req.user.type !== 'admin') {
      next();
      return;
    }

    const value = getRequestValue(req, getter);
    if (!value) {
      res.status(400).json({ status: 'error', message: missingMessage });
      return;
    }

    const allowed = await canAccess(req.user.id, value);
    if (!allowed) {
      res.status(403).json({
        status: 'error',
        message: 'Access denied to this service',
        code: 'SERVICE_ACCESS_DENIED',
      });
      return;
    }

    next();
  };
};

export const getAllowedServiceAccess = async (userId: string): Promise<AllowedServiceAccess> => {
  const scope = await getServiceAccessScope(userId);
  return { all: scope.all, codes: scope.serviceCodes };
};

export const canAccessPagePath = async (userId: string, pagePath: string): Promise<boolean> => {
  try {
    const allowedPages = await getAllowedPages(userId);
    return matchesAllowedPath(
      pagePath,
      allowedPages.map((page) => page.path)
    );
  } catch {
    return false;
  }
};

export const canAccessServiceCode = async (
  userId: string,
  serviceCode: string
): Promise<boolean> => {
  const service = await prisma.service.findUnique({
    where: { code: normalizeServiceCode(serviceCode) },
    select: { id: true, code: true },
  });

  if (!service) return false;

  try {
    const scope = await getServiceAccessScope(userId);
    return serviceCodeIsInScope(service.code, scope);
  } catch {
    return false;
  }
};

export const canAccessServiceId = async (userId: string, serviceId: string): Promise<boolean> => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, code: true },
  });

  if (!service) return false;

  try {
    const scope = await getServiceAccessScope(userId);
    return serviceCodeIsInScope(service.code, scope);
  } catch {
    return false;
  }
};

export const canAccessTransaction = async (
  userId: string,
  transactionId: string
): Promise<boolean> => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, service: { select: { code: true } } },
  });

  if (!transaction) return false;

  try {
    const scope = await getServiceAccessScope(userId);
    return serviceCodeIsInScope(transaction.service.code, scope);
  } catch {
    return false;
  }
};

export const canAccessPayment = async (userId: string, paymentId: string): Promise<boolean> => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, transaction: { select: { service: { select: { code: true } } } } },
  });

  if (!payment) return false;
  return canAccessResolvedServiceCode(userId, payment.transaction.service.code);
};

export const canAccessTaxComputation = async (
  userId: string,
  taxComputationId: string
): Promise<boolean> => {
  const taxComputation = await prisma.taxComputation.findUnique({
    where: { id: taxComputationId },
    select: { id: true, transaction: { select: { service: { select: { code: true } } } } },
  });

  if (!taxComputation) return false;
  return canAccessResolvedServiceCode(userId, taxComputation.transaction.service.code);
};

export const canAccessExemption = async (
  userId: string,
  exemptionId: string
): Promise<boolean> => {
  const exemption = await prisma.exemption.findUnique({
    where: { id: exemptionId },
    select: { id: true, transaction: { select: { service: { select: { code: true } } } } },
  });

  if (!exemption) return false;
  return canAccessResolvedServiceCode(userId, exemption.transaction.service.code);
};

export const getTransactionServiceWhereForUser = async (
  userId: string
): Promise<Prisma.TransactionWhereInput> => {
  const scope = await getServiceAccessScope(userId);
  return scope.all ? {} : { service: { code: { in: scope.serviceCodes } } };
};

export const requireServiceCodeAccess = (getter: RequestValueGetter) =>
  requireScopedAccess(getter, canAccessServiceCode, 'Service code is required');

export const requireServiceIdAccess = (getter: RequestValueGetter) =>
  requireScopedAccess(getter, canAccessServiceId, 'Service ID is required');

export const requireTransactionServiceAccess = (getter: RequestValueGetter) =>
  requireScopedAccess(getter, canAccessTransaction, 'Transaction ID is required');

export const requirePaymentServiceAccess = (getter: RequestValueGetter) =>
  requireScopedAccess(getter, canAccessPayment, 'Payment ID is required');

export const requireTaxComputationServiceAccess = (getter: RequestValueGetter) =>
  requireScopedAccess(getter, canAccessTaxComputation, 'Tax computation ID is required');

export const requireExemptionServiceAccess = (getter: RequestValueGetter) =>
  requireScopedAccess(getter, canAccessExemption, 'Exemption ID is required');

export const requirePagePathAccess = (pagePath: string) =>
  requireScopedAccess(() => pagePath, canAccessPagePath, 'Page path is required');

export const serviceCodeToPagePath = serviceCodeToAdminPath;
