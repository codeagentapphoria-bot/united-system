// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Services
import type { Transaction } from '@/services/api/transaction.service';

// Utils
import { cn } from '@/lib/utils';

// Icons
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

interface AppointmentListProps {
  appointments: Transaction[];
  selectedDate: Date | null;
  isLoading: boolean;
  onAppointmentClick: (transaction: Transaction) => void;
}

export const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  selectedDate,
  isLoading,
  onAppointmentClick,
}) => {
  const formatStatus = (status: string | undefined): string => {
    if (!status) return 'N/A';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatPaymentStatus = (status: string): string => {
    if (!status) return 'N/A';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getSubscriberName = (transaction: Transaction): string => {
    if (transaction.resident?.firstName && transaction.resident?.lastName) {
      return `${transaction.resident.firstName} ${transaction.resident.lastName}`;
    }
    if (transaction.applicantName) return transaction.applicantName;
    return 'Unknown';
  };

  const getAppointmentStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'REQUESTED_UPDATE':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'FAILED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatAppointmentTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'No date selected';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading appointments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <style>{`
        .appointment-list-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .appointment-list-scroll::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .appointment-list-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .appointment-list-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
      <Card className="h-full flex flex-col max-h-[calc(100vh-200px)]">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-lg">Appointments</CardTitle>
          <p className="text-sm text-gray-600 mt-1">{formatDate(selectedDate)}</p>
          {appointments.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</p>
          )}
        </CardHeader>
        <CardContent 
          className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-300px)] appointment-list-scroll" 
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
        >
        {appointments.length === 0 ? (
          <div className="text-center py-8">
            <FiCalendar className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-sm text-gray-500">No appointments for this date</p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => onAppointmentClick(appointment)}
                className={cn(
                  'p-4 border border-gray-200 rounded-lg cursor-pointer',
                  'hover:bg-gray-50 hover:border-primary-300 transition-colors',
                  'space-y-3'
                )}
              >
                {/* Subscriber Name */}
                <div className="flex items-center gap-2">
                  <FiUser className="text-gray-400" size={16} />
                  <span className="font-semibold text-heading-700">
                    {getSubscriberName(appointment)}
                  </span>
                </div>

                {/* Service Name */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Service</p>
                  <p className="text-sm font-medium text-heading-700">
                    {appointment.service?.name || 'Unknown Service'}
                  </p>
                </div>

                {/* Appointment Time */}
                {appointment.preferredAppointmentDate && (
                  <div className="flex items-center gap-2">
                    <FiClock className="text-gray-400" size={14} />
                    <span className="text-sm text-gray-700">
                      {formatAppointmentTime(appointment.preferredAppointmentDate)}
                    </span>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {appointment.appointmentStatus && (
                    <Badge className={cn('text-xs', getAppointmentStatusColor(appointment.appointmentStatus))}>
                      {formatStatus(appointment.appointmentStatus)}
                    </Badge>
                  )}
                  <Badge className={cn('text-xs', getPaymentStatusColor(appointment.paymentStatus))}>
                    {formatPaymentStatus(appointment.paymentStatus)}
                  </Badge>
                </div>

                {/* Reference Number */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Reference Number</p>
                  <p className="text-xs font-mono text-heading-600">
                    {appointment.referenceNumber}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

