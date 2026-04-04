import { serviceService, type Service } from '@/services/api/service.service';
import React from 'react';
import { FiCheckCircle, FiClock, FiFileText, FiPackage, FiPrinter, FiSend, FiXCircle } from 'react-icons/fi';
import { LuPhilippinePeso } from "react-icons/lu";

let cachedTabServices: Service[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch services that should be displayed in subscriber tabs
 */
export const getSubscriberTabServices = async (): Promise<Service[]> => {
  const now = Date.now();
  
  // Return cached services if still valid
  if (cachedTabServices && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedTabServices;
  }

  try {
    const services = await serviceService.getActiveServices({
      displayInSubscriberTabs: true,
    });
    cachedTabServices = services;
    cacheTimestamp = now;
    return services.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error('Failed to fetch subscriber tab services:', error);
    return cachedTabServices || [];
  }
};

/**
 * Clear the cache for subscriber tab services
 */
export const clearSubscriberTabCache = () => {
  cachedTabServices = null;
  cacheTimestamp = 0;
};

/**
 * Normalize service code to tab value format
 * Converts "BIRTH_CERTIFICATE" to "birth-certificate"
 */
export const normalizeServiceCode = (code: string): string => {
  return code.toLowerCase().replace(/_/g, '-');
};

/**
 * Get color classes for payment status badge
 */
export const getPaymentStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase().replace(/\s+/g, '-');
  
  const colorMap: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'approved': 'bg-green-100 text-green-700 border-green-200',
    'for-printing': 'bg-blue-100 text-blue-700 border-blue-200',
    'for_printing': 'bg-blue-100 text-blue-700 border-blue-200',
    'for-pickup': 'bg-purple-100 text-purple-700 border-purple-200',
    'for_pick_up': 'bg-purple-100 text-purple-700 border-purple-200',
    'released': 'bg-gray-100 text-gray-700 border-gray-200',
    'paid': 'bg-green-100 text-green-700 border-green-200',
    'assessed': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'for-payment': 'bg-orange-100 text-orange-700 border-orange-200',
    'for_payment': 'bg-orange-100 text-orange-700 border-orange-200',
    'acknowledged': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'complied': 'bg-green-100 text-green-700 border-green-200',
    'for-hearing': 'bg-red-100 text-red-700 border-red-200',
    'for_hearing': 'bg-red-100 text-red-700 border-red-200',
    'settled': 'bg-gray-100 text-gray-700 border-gray-200',
    'issued': 'bg-blue-100 text-blue-700 border-blue-200',
    'unpaid': 'bg-red-100 text-red-700 border-red-200',
    'waived': 'bg-gray-100 text-gray-700 border-gray-200',
    'for-inspection': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'for_inspection': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'for-release': 'bg-purple-100 text-purple-700 border-purple-200',
    'for_release': 'bg-purple-100 text-purple-700 border-purple-200',
    'rejected': 'bg-red-100 text-red-700 border-red-200',
  };

  return colorMap[statusLower] || 'bg-gray-100 text-gray-700 border-gray-200';
};

/**
 * Get icon component for payment status
 */
export const getPaymentStatusIcon = (status: string): React.ReactNode => {
  const statusLower = status.toLowerCase().replace(/\s+/g, '-');
  
  const iconMap: Record<string, React.ReactNode> = {
    'pending': React.createElement(FiClock, { size: 20 }),
    'approved': React.createElement(FiCheckCircle, { size: 20 }),
    'for-printing': React.createElement(FiPrinter, { size: 20 }),
    'for_printing': React.createElement(FiPrinter, { size: 20 }),
    'for-pickup': React.createElement(FiPackage, { size: 20 }),
    'for_pick_up': React.createElement(FiPackage, { size: 20 }),
    'released': React.createElement(FiSend, { size: 20 }),
    'paid': React.createElement(FiCheckCircle, { size: 20 }),
    'assessed': React.createElement(FiFileText, { size: 20 }),
    'for-payment': React.createElement(LuPhilippinePeso, { size: 20 }),
    'for_payment': React.createElement(LuPhilippinePeso, { size: 20 }),
    'acknowledged': React.createElement(FiCheckCircle, { size: 20 }),
    'complied': React.createElement(FiCheckCircle, { size: 20 }),
    'for-hearing': React.createElement(FiXCircle, { size: 20 }),
    'for_hearing': React.createElement(FiXCircle, { size: 20 }),
    'settled': React.createElement(FiCheckCircle, { size: 20 }),
    'issued': React.createElement(FiFileText, { size: 20 }),
    'unpaid': React.createElement(FiXCircle, { size: 20 }),
    'waived': React.createElement(FiCheckCircle, { size: 20 }),
    'for-inspection': React.createElement(FiClock, { size: 20 }),
    'for_inspection': React.createElement(FiClock, { size: 20 }),
    'for-release': React.createElement(FiPackage, { size: 20 }),
    'for_release': React.createElement(FiPackage, { size: 20 }),
    'rejected': React.createElement(FiXCircle, { size: 20 }),
  };

  return iconMap[statusLower] || React.createElement(FiClock, { size: 20 });
};

/**
 * Get background color for payment status overview card
 */
export const getPaymentStatusCardBg = (status: string): string => {
  const statusLower = status.toLowerCase().replace(/\s+/g, '-');
  
  const bgMap: Record<string, string> = {
    'pending': 'bg-yellow-50 border-yellow-200',
    'approved': 'bg-green-50 border-green-200',
    'for-printing': 'bg-blue-50 border-blue-200',
    'for_printing': 'bg-blue-50 border-blue-200',
    'for-pickup': 'bg-purple-50 border-purple-200',
    'for_pick_up': 'bg-purple-50 border-purple-200',
    'released': 'bg-gray-50 border-gray-200',
    'paid': 'bg-green-50 border-green-200',
    'assessed': 'bg-indigo-50 border-indigo-200',
    'for-payment': 'bg-orange-50 border-orange-200',
    'for_payment': 'bg-orange-50 border-orange-200',
    'acknowledged': 'bg-cyan-50 border-cyan-200',
    'complied': 'bg-green-50 border-green-200',
    'for-hearing': 'bg-red-50 border-red-200',
    'for_hearing': 'bg-red-50 border-red-200',
    'settled': 'bg-gray-50 border-gray-200',
    'issued': 'bg-blue-50 border-blue-200',
    'unpaid': 'bg-red-50 border-red-200',
    'waived': 'bg-gray-50 border-gray-200',
    'for-inspection': 'bg-yellow-50 border-yellow-200',
    'for_inspection': 'bg-yellow-50 border-yellow-200',
    'for-release': 'bg-purple-50 border-purple-200',
    'for_release': 'bg-purple-50 border-purple-200',
    'rejected': 'bg-red-50 border-red-200',
  };

  return bgMap[statusLower] || 'bg-gray-50 border-gray-200';
};

/**
 * Get text color for payment status overview card
 */
export const getPaymentStatusTextColor = (status: string): string => {
  const statusLower = status.toLowerCase().replace(/\s+/g, '-');
  
  const textMap: Record<string, string> = {
    'pending': 'text-yellow-800',
    'approved': 'text-green-800',
    'for-printing': 'text-blue-800',
    'for_printing': 'text-blue-800',
    'for-pickup': 'text-purple-800',
    'for_pick_up': 'text-purple-800',
    'released': 'text-gray-800',
    'paid': 'text-green-800',
    'assessed': 'text-indigo-800',
    'for-payment': 'text-orange-800',
    'for_payment': 'text-orange-800',
    'acknowledged': 'text-cyan-800',
    'complied': 'text-green-800',
    'for-hearing': 'text-red-800',
    'for_hearing': 'text-red-800',
    'settled': 'text-gray-800',
    'issued': 'text-blue-800',
    'unpaid': 'text-red-800',
    'waived': 'text-gray-800',
    'for-inspection': 'text-yellow-800',
    'for_inspection': 'text-yellow-800',
    'for-release': 'text-purple-800',
    'for_release': 'text-purple-800',
    'rejected': 'text-red-800',
  };

  return textMap[statusLower] || 'text-gray-800';
};

