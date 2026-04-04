// React imports
import React, { useEffect, useState, useMemo, useCallback } from 'react';

// UI Components (shadcn/ui)
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Custom Components
import { AppointmentCalendar } from '@/components/appointments/AppointmentCalendar';
import { AppointmentList } from '@/components/appointments/AppointmentList';
import { ApplicationDetailsModal } from '@/components/services/ApplicationDetailsModal';

// Hooks
import { useAppointmentSocket } from '@/hooks/useAppointmentSocket';
import { useToast } from '@/hooks/use-toast';

// Services
import { transactionService, type Transaction } from '@/services/api/transaction.service';
import { serviceService, type Service } from '@/services/api/service.service';

// Config
import { adminMenuItems } from '@/config/admin-menu';

// Utils
import { cn } from '@/lib/utils';

export const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  // Calculate current month date range for socket filtering
  const currentMonthRange = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: startOfMonth, endDate: endOfMonth };
  }, []);

  // Use appointment socket hook for real-time updates
  const { newAppointment, appointmentUpdate, clearNewAppointment, clearAppointmentUpdate } = useAppointmentSocket({
    startDate: currentMonthRange.startDate,
    endDate: currentMonthRange.endDate,
    enabled: true,
  });

  // Fetch all appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch appointments for the current month (can be expanded later)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const data = await transactionService.getAppointments({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
      });
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle new appointment from socket
  useEffect(() => {
    if (!newAppointment) return;

    const handleNewAppointment = async () => {
      try {
        // Fetch full transaction data for the new appointment
        const fullTransaction = await transactionService.getTransaction(newAppointment.transactionId);
        
        setAppointments((prev) => {
          // Check if appointment already exists (prevent duplicates)
          const exists = prev.some((a) => a.id === fullTransaction.id);
          if (exists) return prev;
          
          // Add new appointment to the list
          return [...prev, fullTransaction];
        });

        toast({
          title: 'New Appointment',
          description: `New appointment scheduled for ${new Date(newAppointment.appointmentDate).toLocaleDateString()}`,
        });

        clearNewAppointment();
      } catch (error) {
        console.error('Failed to fetch new appointment details:', error);
        clearNewAppointment();
      }
    };

    handleNewAppointment();
  }, [newAppointment, clearNewAppointment, toast]);

  // Handle appointment update from socket
  useEffect(() => {
    if (!appointmentUpdate) return;

    const handleAppointmentUpdate = async () => {
      try {
        // Fetch updated transaction data
        const updatedTransaction = await transactionService.getTransaction(appointmentUpdate.transactionId);
        
        setAppointments((prev) => {
          const index = prev.findIndex((a) => a.id === appointmentUpdate.transactionId);
          
          if (index === -1) {
            // Appointment not in current list, might be from different month
            // Check if it's in current month range, if so add it
            const appointmentDate = appointmentUpdate.appointmentDate 
              ? new Date(appointmentUpdate.appointmentDate)
              : null;
            
            if (appointmentDate && 
                appointmentDate >= currentMonthRange.startDate && 
                appointmentDate <= currentMonthRange.endDate) {
              return [...prev, updatedTransaction];
            }
            return prev;
          }

          // Update existing appointment
          const updated = [...prev];
          updated[index] = updatedTransaction;
          return updated;
        });

        toast({
          title: 'Appointment Updated',
          description: `Appointment status updated to ${appointmentUpdate.appointmentStatus || 'unknown'}`,
        });

        clearAppointmentUpdate();
      } catch (error) {
        console.error('Failed to fetch updated appointment details:', error);
        clearAppointmentUpdate();
      }
    };

    handleAppointmentUpdate();
  }, [appointmentUpdate, clearAppointmentUpdate, toast, currentMonthRange]);

  // Group appointments by date for calendar highlighting
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    appointments.forEach((appointment) => {
      if (appointment.preferredAppointmentDate) {
        // Normalize date to YYYY-MM-DD format (ignore time and timezone)
        const appointmentDate = new Date(appointment.preferredAppointmentDate);
        const normalizedDate = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());
        const dateKey = normalizedDate.toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(appointment);
      }
    });
    return grouped;
  }, [appointments]);

  // Get appointments count for a specific date
  const getAppointmentCount = (date: Date): number => {
    // Normalize date to YYYY-MM-DD format (ignore time and timezone)
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dateKey = normalizedDate.toISOString().split('T')[0];
    return appointmentsByDate[dateKey]?.length || 0;
  };

  // Get appointments for selected date
  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split('T')[0];
    return appointmentsByDate[dateKey] || [];
  }, [selectedDate, appointmentsByDate]);

  // Handle appointment click
  const handleAppointmentClick = async (transaction: Transaction) => {
    try {
      // Fetch full transaction details
      const fullTransaction = await transactionService.getTransaction(transaction.id);
      setSelectedTransaction(fullTransaction);
      
      // Fetch service details
      if (fullTransaction.serviceId) {
        const service = await serviceService.getService(fullTransaction.serviceId);
        setSelectedService(service);
      }
      
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch transaction details:', error);
    }
  };

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className={cn('space-y-6')}>
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-heading-800">Appointments</h1>
          <p className="text-gray-600 mt-2">
            View and manage appointment requests from e-government service applications
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[70%_30%] gap-6 items-start">
          {/* Left: Calendar (70%) */}
          <div className="w-full">
            <AppointmentCalendar
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              getAppointmentCount={getAppointmentCount}
            />
          </div>

          {/* Right: Appointment List (30%) */}
          <div className="w-full h-full">
            <AppointmentList
              appointments={selectedDateAppointments}
              selectedDate={selectedDate}
              isLoading={isLoading}
              onAppointmentClick={handleAppointmentClick}
            />
          </div>
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && selectedService && (
          <ApplicationDetailsModal
            open={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedTransaction(null);
              setSelectedService(null);
            }}
            transaction={selectedTransaction}
            service={selectedService}
            readOnly={true}
            onUpdate={() => {
              // Refresh appointments after update
              fetchAppointments();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

