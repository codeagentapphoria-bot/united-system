/**
 * RegistrationsSection.tsx
 *
 * Reuses the existing AdminRegistrationWorkflow for the registration approval flow.
 * The component handles its own state (approve/reject/request resubmission/classification dialog).
 * No DashboardLayout wrapper — parent AdminCityPopulation provides it.
 * No duplicate AccessControlGate — city-pop admin user has access to /admin/registration-workflow.
 */
export { AdminRegistrationWorkflow as RegistrationsSection } from '@/pages/admin/AdminRegistrationWorkflow';
