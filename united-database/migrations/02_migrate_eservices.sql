-- =============================================================================
-- MIGRATION 02 — Import E-Services (Multysis) data into the Unified Database
-- =============================================================================
-- Source DB:  multysis  (PostgreSQL, Prisma ORM)
-- Target DB:  unified Supabase instance (schema already applied via schema.sql)
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" \
--     -v eservice_conn="host=<HOST> dbname=multysis user=<USER> password=<PASS>" \
--     -f 02_migrate_eservices.sql
--
-- IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING throughout.
--             Safe to re-run after a partial failure.
--
-- KEY RENAME: source table `users`  →  target table `eservice_users`
--
-- ORDER matters (FK dependencies):
--   eservice_users → roles → permissions → role_permissions → user_roles
--   citizens → non_citizens → subscribers → citizen_registration_requests
--   place_of_birth, mother_info
--   services, eservices
--   transactions → transaction_notes → appointment_notes
--   tax_profiles → tax_profile_versions → tax_computations
--   exemptions, payments
--   social_amelioration_settings → beneficiaries → pivots
--   government_programs → beneficiary_program_pivots
--   refresh_tokens → sessions
--   otp_verifications, addresses, faqs
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS dblink;

SET search_path TO public;
SET session_replication_role = replica;

-- =============================================================================
-- AUTH — eservice_users (source table name: users)
-- =============================================================================

INSERT INTO public.eservice_users (id, email, password, name, role, created_at, updated_at)
SELECT id, email, password, name, role, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, email, password, name, role, created_at, updated_at FROM public.users'
) AS t(
    id text, email text, password text, name text, role text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.roles (id, name, description, created_at, updated_at)
SELECT id, name, description, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, name, description, created_at, updated_at FROM public.roles'
) AS t(id text, name text, description text, created_at timestamp, updated_at timestamp)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.permissions (id, resource, action, created_at, updated_at)
SELECT id, resource, action::public.permission_action, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, resource, action, created_at, updated_at FROM public.permissions'
) AS t(id text, resource text, action text, created_at timestamp, updated_at timestamp)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.role_permissions (id, role_id, permission_id, created_at)
SELECT id, role_id, permission_id, created_at
FROM dblink(:'eservice_conn',
    'SELECT id, role_id, permission_id, created_at FROM public.role_permissions'
) AS t(id text, role_id text, permission_id text, created_at timestamp)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.user_roles (id, user_id, role_id, created_at)
SELECT id, user_id, role_id, created_at
FROM dblink(:'eservice_conn',
    'SELECT id, user_id, role_id, created_at FROM public.user_roles'
) AS t(id text, user_id text, role_id text, created_at timestamp)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- CITIZENS / NON-CITIZENS / SUBSCRIBERS
-- =============================================================================

INSERT INTO public.citizens (
    id, first_name, middle_name, last_name, extension_name,
    email, phone_number, citizen_picture, birth_date,
    civil_status, sex, username, pin, resident_id,
    residency_status, residency_application_remarks,
    is_resident, is_voter, proof_of_identification, address,
    is_employed, citizenship, acr_no, profession,
    height, weight,
    address_barangay, address_municipality, address_postal_code,
    address_province, address_region, address_street_address,
    emergency_contact_number, emergency_contact_person,
    id_type, id_document_number, spouse_name,
    created_at, updated_at
)
SELECT
    id, first_name, middle_name, last_name, extension_name,
    email, phone_number, citizen_picture, birth_date,
    civil_status, sex, username, pin, resident_id,
    residency_status::public.citizen_status, residency_application_remarks,
    is_resident, is_voter, proof_of_identification, address,
    is_employed, citizenship, acr_no, profession,
    height, weight,
    address_barangay, address_municipality, address_postal_code,
    address_province, address_region, address_street_address,
    emergency_contact_number, emergency_contact_person,
    id_type, id_document_number, spouse_name,
    created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "firstName", "middleName", "lastName", "extensionName",
            email, "phoneNumber", "citizenPicture", "birthDate",
            "civilStatus", sex, username, pin, "residentId",
            "residencyStatus", "residencyApplicationRemarks",
            "isResident", "isVoter", "proofOfIdentification", address,
            "isEmployed", citizenship, "acrNo", profession,
            height, weight,
            "addressBarangay", "addressMunicipality", "addressPostalCode",
            "addressProvince", "addressRegion", "addressStreetAddress",
            "emergencyContactNumber", "emergencyContactPerson",
            "idType", "idDocumentNumber", "spouseName",
            "createdAt", "updatedAt"
     FROM public.citizens'
) AS t(
    id text, first_name text, middle_name text, last_name text, extension_name text,
    email text, phone_number text, citizen_picture text, birth_date timestamp,
    civil_status text, sex text, username text, pin text, resident_id text,
    residency_status text, residency_application_remarks text,
    is_resident boolean, is_voter boolean, proof_of_identification text, address text,
    is_employed boolean, citizenship text, acr_no text, profession text,
    height text, weight text,
    address_barangay text, address_municipality text, address_postal_code text,
    address_province text, address_region text, address_street_address text,
    emergency_contact_number text, emergency_contact_person text,
    id_type text, id_document_number text, spouse_name text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.non_citizens (
    id, first_name, middle_name, last_name, extension_name,
    email, phone_number, resident_id, residency_status,
    profile_picture, birth_date, civil_status, sex,
    resident_address, status, residency_type, created_at, updated_at
)
SELECT
    id, first_name, middle_name, last_name, extension_name,
    email, phone_number, resident_id, residency_status,
    profile_picture, birth_date, civil_status, sex,
    resident_address, status::public.subscriber_status,
    residency_type::public.residency_type,
    created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "firstName", "middleName", "lastName", "extensionName",
            email, "phoneNumber", "residentId", "residencyStatus",
            "profilePicture", "birthDate", "civilStatus", sex,
            "residentAddress", status, "residencyType", "createdAt", "updatedAt"
     FROM public.non_citizens'
) AS t(
    id text, first_name text, middle_name text, last_name text, extension_name text,
    email text, phone_number text, resident_id text, residency_status text,
    profile_picture text, birth_date timestamp, civil_status text, sex text,
    resident_address text, status text, residency_type text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.subscribers (
    id, type, citizen_id, non_citizen_id, password,
    google_id, google_email, created_at, updated_at
)
SELECT
    id, type::public.person_type, citizen_id, non_citizen_id, password,
    google_id, google_email, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, type, "citizenId", "nonCitizenId", password,
            "googleId", "googleEmail", "createdAt", "updatedAt"
     FROM public.subscribers'
) AS t(
    id text, type text, citizen_id text, non_citizen_id text, password text,
    google_id text, google_email text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.citizen_registration_requests (
    id, status, admin_notes, reviewed_by, reviewed_at,
    citizen_id, selfie_url, subscriber_id, created_at, updated_at
)
SELECT
    id, status::public.registration_status, admin_notes, reviewed_by, reviewed_at,
    citizen_id, selfie_url, subscriber_id, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, status, "adminNotes", "reviewedBy", "reviewedAt",
            "citizenId", "selfieUrl", "subscriberId", "createdAt", "updatedAt"
     FROM public.citizen_registration_requests'
) AS t(
    id text, status text, admin_notes text, reviewed_by text, reviewed_at timestamp,
    citizen_id text, selfie_url text, subscriber_id text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.place_of_birth (
    id, region, province, municipality, citizen_id, non_citizen_id, created_at, updated_at
)
SELECT id, region, province, municipality, citizen_id, non_citizen_id, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, region, province, municipality, "citizenId", "nonCitizenId", "createdAt", "updatedAt"
     FROM public.place_of_birth'
) AS t(
    id text, region text, province text, municipality text,
    citizen_id text, non_citizen_id text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.mother_info (
    id, first_name, middle_name, last_name, non_citizen_id, created_at, updated_at
)
SELECT id, first_name, middle_name, last_name, non_citizen_id, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "firstName", "middleName", "lastName", "nonCitizenId", "createdAt", "updatedAt"
     FROM public.mother_info'
) AS t(
    id text, first_name text, middle_name text, last_name text,
    non_citizen_id text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SERVICES
-- =============================================================================

INSERT INTO public.services (
    id, code, name, description, category, icon, "order",
    is_active, requires_payment, default_amount,
    payment_statuses, form_fields,
    display_in_sidebar, display_in_subscriber_tabs,
    appointment_duration, requires_appointment,
    created_at, updated_at
)
SELECT
    id, code, name, description, category, icon, "order",
    is_active, requires_payment, default_amount,
    payment_statuses, form_fields,
    display_in_sidebar, display_in_subscriber_tabs,
    appointment_duration, requires_appointment,
    created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, code, name, description, category, icon, "order",
            "isActive", "requiresPayment", "defaultAmount",
            "paymentStatuses", "formFields",
            "displayInSidebar", "displayInSubscriberTabs",
            "appointmentDuration", "requiresAppointment",
            "createdAt", "updatedAt"
     FROM public.services'
) AS t(
    id text, code text, name text, description text, category text, icon text,
    "order" integer, is_active boolean, requires_payment boolean,
    default_amount numeric, payment_statuses jsonb, form_fields jsonb,
    display_in_sidebar boolean, display_in_subscriber_tabs boolean,
    appointment_duration integer, requires_appointment boolean,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.eservices (
    id, code, name, description, category, icon, "order",
    is_active, requires_payment, default_amount, created_at, updated_at
)
SELECT
    id, code, name, description, category, icon, "order",
    is_active, requires_payment, default_amount, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, code, name, description, category, icon, "order",
            "isActive", "requiresPayment", "defaultAmount", "createdAt", "updatedAt"
     FROM public.eservices'
) AS t(
    id text, code text, name text, description text, category text, icon text,
    "order" integer, is_active boolean, requires_payment boolean,
    default_amount numeric, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- TRANSACTIONS
-- =============================================================================

INSERT INTO public.transactions (
    id, subscriber_id, transaction_id, reference_number,
    payment_status, payment_amount, transmital_no,
    reference_number_generated_at, is_resident_of_borongan,
    permit_type, status, is_posted, valid_id_to_present, remarks,
    service_id, service_data, application_date,
    preferred_appointment_date, scheduled_appointment_date,
    appointment_status, update_request_status,
    update_request_description, update_requested_by,
    pending_service_data, admin_update_request_description,
    created_at, updated_at
)
SELECT
    id, subscriber_id, transaction_id, reference_number,
    payment_status, payment_amount, transmital_no,
    reference_number_generated_at, is_resident_of_borongan,
    permit_type, status, is_posted, valid_id_to_present, remarks,
    service_id, service_data, application_date,
    preferred_appointment_date, scheduled_appointment_date,
    appointment_status::public.appointment_status,
    update_request_status::public.update_request_status,
    update_request_description,
    update_requested_by::public.update_requested_by,
    pending_service_data, admin_update_request_description,
    created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "subscriberId", "transactionId", "referenceNumber",
            "paymentStatus", "paymentAmount", "transmitalNo",
            "referenceNumberGeneratedAt", "isResidentOfBorongan",
            "permitType", status, "isPosted", "validIdToPresent", remarks,
            "serviceId", "serviceData", "applicationDate",
            "preferredAppointmentDate", "scheduledAppointmentDate",
            "appointmentStatus", "updateRequestStatus",
            "updateRequestDescription", "updateRequestedBy",
            "pendingServiceData", "adminUpdateRequestDescription",
            "createdAt", "updatedAt"
     FROM public.transactions'
) AS t(
    id text, subscriber_id text, transaction_id text, reference_number text,
    payment_status text, payment_amount numeric, transmital_no text,
    reference_number_generated_at timestamp, is_resident_of_borongan boolean,
    permit_type text, status text, is_posted boolean, valid_id_to_present text, remarks text,
    service_id text, service_data jsonb, application_date timestamp,
    preferred_appointment_date timestamp, scheduled_appointment_date timestamp,
    appointment_status text, update_request_status text,
    update_request_description text, update_requested_by text,
    pending_service_data jsonb, admin_update_request_description text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.transaction_notes (
    id, transaction_id, message, sender_type, sender_id,
    is_internal, is_read, created_at, updated_at
)
SELECT
    id, transaction_id, message,
    sender_type::public.transaction_note_sender_type,
    sender_id, is_internal, is_read, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "transactionId", message, "senderType", "senderId",
            "isInternal", "isRead", "createdAt", "updatedAt"
     FROM public.transaction_notes'
) AS t(
    id text, transaction_id text, message text, sender_type text,
    sender_id text, is_internal boolean, is_read boolean,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.appointment_notes (
    id, transaction_id, type, note, created_by, created_at, updated_at
)
SELECT
    id, transaction_id, type::public.appointment_note_type,
    note, created_by, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "transactionId", type, note, "createdBy", "createdAt", "updatedAt"
     FROM public.appointment_notes'
) AS t(
    id text, transaction_id text, type text, note text,
    created_by text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- TAX & PAYMENTS
-- =============================================================================

INSERT INTO public.tax_profiles (
    id, service_id, name, variant, is_active, created_at, updated_at
)
SELECT id, service_id, name, variant, is_active, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "serviceId", name, variant, "isActive", "createdAt", "updatedAt"
     FROM public.tax_profiles'
) AS t(
    id text, service_id text, name text, variant text,
    is_active boolean, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.tax_profile_versions (
    id, tax_profile_id, version, effective_from, effective_to,
    status, change_reason, configuration, created_by, created_at
)
SELECT
    id, tax_profile_id, version, effective_from, effective_to,
    status::public.tax_version_status, change_reason, configuration,
    created_by, created_at
FROM dblink(:'eservice_conn',
    'SELECT id, "taxProfileId", version, "effectiveFrom", "effectiveTo",
            status, "changeReason", configuration, "createdBy", "createdAt"
     FROM public.tax_profile_versions'
) AS t(
    id text, tax_profile_id text, version text,
    effective_from timestamp, effective_to timestamp,
    status text, change_reason text, configuration jsonb,
    created_by text, created_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.tax_computations (
    id, transaction_id, tax_profile_version_id, is_active,
    inputs, derived_values, breakdown, total_tax, adjusted_tax,
    is_reassessment, reassessment_reason, previous_computation_id,
    difference_amount, exemptions_applied, discounts_applied,
    penalties_applied, computed_at, computed_by
)
SELECT
    id, transaction_id, tax_profile_version_id, is_active,
    inputs, derived_values, breakdown, total_tax, adjusted_tax,
    is_reassessment, reassessment_reason, previous_computation_id,
    difference_amount, exemptions_applied, discounts_applied,
    penalties_applied, computed_at, computed_by
FROM dblink(:'eservice_conn',
    'SELECT id, "transactionId", "taxProfileVersionId", "isActive",
            inputs, "derivedValues", breakdown, "totalTax", "adjustedTax",
            "isReassessment", "reassessmentReason", "previousComputationId",
            "differenceAmount", "exemptionsApplied", "discountsApplied",
            "penaltiesApplied", "computedAt", "computedBy"
     FROM public.tax_computations'
) AS t(
    id text, transaction_id text, tax_profile_version_id text, is_active boolean,
    inputs jsonb, derived_values jsonb, breakdown jsonb,
    total_tax numeric, adjusted_tax numeric,
    is_reassessment boolean, reassessment_reason text, previous_computation_id text,
    difference_amount numeric, exemptions_applied jsonb,
    discounts_applied jsonb, penalties_applied jsonb,
    computed_at timestamp, computed_by text
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.exemptions (
    id, transaction_id, tax_computation_id, exemption_type, status,
    requested_by, approved_by, request_reason, rejection_reason,
    supporting_documents, exemption_amount,
    approved_at, rejected_at, created_at, updated_at
)
SELECT
    id, transaction_id, tax_computation_id,
    exemption_type::public.exemption_type,
    status::public.exemption_status,
    requested_by, approved_by, request_reason, rejection_reason,
    supporting_documents, exemption_amount,
    approved_at, rejected_at, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "transactionId", "taxComputationId", "exemptionType", status,
            "requestedBy", "approvedBy", "requestReason", "rejectionReason",
            "supportingDocuments", "exemptionAmount",
            "approvedAt", "rejectedAt", "createdAt", "updatedAt"
     FROM public.exemptions'
) AS t(
    id text, transaction_id text, tax_computation_id text,
    exemption_type text, status text,
    requested_by text, approved_by text, request_reason text,
    rejection_reason text, supporting_documents jsonb, exemption_amount numeric,
    approved_at timestamp, rejected_at timestamp,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.payments (
    id, transaction_id, tax_computation_id, amount, payment_method,
    payment_date, received_by, reference_number, notes, created_at, updated_at
)
SELECT
    id, transaction_id, tax_computation_id, amount,
    payment_method::public.payment_method,
    payment_date, received_by, reference_number, notes, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "transactionId", "taxComputationId", amount, "paymentMethod",
            "paymentDate", "receivedBy", "referenceNumber", notes, "createdAt", "updatedAt"
     FROM public.payments'
) AS t(
    id text, transaction_id text, tax_computation_id text,
    amount numeric, payment_method text,
    payment_date timestamp, received_by text,
    reference_number text, notes text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SOCIAL AMELIORATION / BENEFICIARIES
-- =============================================================================

INSERT INTO public.social_amelioration_settings (
    id, type, name, description, is_active, created_at, updated_at
)
SELECT
    id, type::public.social_amelioration_setting_type,
    name, description, is_active, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, type, name, description, "isActive", "createdAt", "updatedAt"
     FROM public.social_amelioration_settings'
) AS t(
    id text, type text, name text, description text,
    is_active boolean, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.senior_citizen_beneficiaries (
    id, citizen_id, senior_citizen_id, status, remarks, created_at, updated_at
)
SELECT
    id, citizen_id, senior_citizen_id,
    status::public.beneficiary_status,
    remarks, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "citizenId", "seniorCitizenId", status, remarks, "createdAt", "updatedAt"
     FROM public.senior_citizen_beneficiaries'
) AS t(
    id text, citizen_id text, senior_citizen_id text, status text,
    remarks text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.senior_citizen_pension_type_pivots (id, beneficiary_id, setting_id)
SELECT id, beneficiary_id, setting_id
FROM dblink(:'eservice_conn',
    'SELECT id, "beneficiaryId", "settingId" FROM public.senior_citizen_pension_type_pivots'
) AS t(id text, beneficiary_id text, setting_id text)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.pwd_beneficiaries (
    id, citizen_id, pwd_id, disability_level, disability_type_id,
    monetary_allowance, assisted_device, donor_device,
    status, remarks, created_at, updated_at
)
SELECT
    id, citizen_id, pwd_id, disability_level, disability_type_id,
    monetary_allowance, assisted_device, donor_device,
    status::public.beneficiary_status,
    remarks, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "citizenId", "pwdId", "disabilityLevel", "disabilityTypeId",
            "monetaryAllowance", "assistedDevice", "donorDevice",
            status, remarks, "createdAt", "updatedAt"
     FROM public.pwd_beneficiaries'
) AS t(
    id text, citizen_id text, pwd_id text, disability_level text,
    disability_type_id text, monetary_allowance boolean,
    assisted_device boolean, donor_device text,
    status text, remarks text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.student_beneficiaries (
    id, citizen_id, student_id, grade_level_id, status, remarks, created_at, updated_at
)
SELECT
    id, citizen_id, student_id, grade_level_id,
    status::public.beneficiary_status,
    remarks, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "citizenId", "studentId", "gradeLevelId",
            status, remarks, "createdAt", "updatedAt"
     FROM public.student_beneficiaries'
) AS t(
    id text, citizen_id text, student_id text, grade_level_id text,
    status text, remarks text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.solo_parent_beneficiaries (
    id, citizen_id, solo_parent_id, category_id, status, remarks, created_at, updated_at
)
SELECT
    id, citizen_id, solo_parent_id, category_id,
    status::public.beneficiary_status,
    remarks, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "citizenId", "soloParentId", "categoryId",
            status, remarks, "createdAt", "updatedAt"
     FROM public.solo_parent_beneficiaries'
) AS t(
    id text, citizen_id text, solo_parent_id text, category_id text,
    status text, remarks text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.government_programs (
    id, name, description, type, is_active, created_at, updated_at
)
SELECT
    id, name, description,
    type::public.government_program_type,
    is_active, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, name, description, type, "isActive", "createdAt", "updatedAt"
     FROM public.government_programs'
) AS t(
    id text, name text, description text, type text,
    is_active boolean, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.beneficiary_program_pivots (
    id, beneficiary_type, beneficiary_id, program_id, created_at
)
SELECT
    id, beneficiary_type::public.beneficiary_type,
    beneficiary_id, program_id, created_at
FROM dblink(:'eservice_conn',
    'SELECT id, "beneficiaryType", "beneficiaryId", "programId", "createdAt"
     FROM public.beneficiary_program_pivots'
) AS t(
    id text, beneficiary_type text, beneficiary_id text,
    program_id text, created_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- AUTH TOKENS / SESSIONS
-- =============================================================================

INSERT INTO public.refresh_tokens (
    id, user_id, subscriber_id, token, device_info, ip_address, user_agent,
    expires_at, revoked_at, revoked_reason, created_at, updated_at
)
SELECT
    id, user_id, subscriber_id, token, device_info, ip_address, user_agent,
    expires_at, revoked_at, revoked_reason, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "userId", "subscriberId", token, "deviceInfo", "ipAddress", "userAgent",
            "expiresAt", "revokedAt", "revokedReason", "createdAt", "updatedAt"
     FROM public.refresh_tokens'
) AS t(
    id text, user_id text, subscriber_id text, token text,
    device_info text, ip_address text, user_agent text,
    expires_at timestamp, revoked_at timestamp, revoked_reason text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.sessions (
    id, user_id, subscriber_id, refresh_token_id, ip_address,
    user_agent, device_info, last_activity_at, created_at, expires_at
)
SELECT
    id, user_id, subscriber_id, refresh_token_id, ip_address,
    user_agent, device_info, last_activity_at, created_at, expires_at
FROM dblink(:'eservice_conn',
    'SELECT id, "userId", "subscriberId", "refreshTokenId", "ipAddress",
            "userAgent", "deviceInfo", "lastActivityAt", "createdAt", "expiresAt"
     FROM public.sessions'
) AS t(
    id text, user_id text, subscriber_id text, refresh_token_id text,
    ip_address text, user_agent text, device_info text,
    last_activity_at timestamp, created_at timestamp, expires_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- UTILITY
-- =============================================================================

INSERT INTO public.otp_verifications (
    id, phone_number, code, expires_at, is_used,
    attempts, max_attempts, created_at, updated_at
)
SELECT id, phone_number, code, expires_at, is_used,
       attempts, max_attempts, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, "phoneNumber", code, "expiresAt", "isUsed",
            attempts, "maxAttempts", "createdAt", "updatedAt"
     FROM public.otp_verifications'
) AS t(
    id text, phone_number text, code text, expires_at timestamp,
    is_used boolean, attempts integer, max_attempts integer,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.addresses (
    id, region, province, municipality, barangay, postal_code,
    street_address, is_active, created_at, updated_at
)
SELECT id, region, province, municipality, barangay, postal_code,
       street_address, is_active, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, region, province, municipality, barangay, "postalCode",
            "streetAddress", "isActive", "createdAt", "updatedAt"
     FROM public.addresses'
) AS t(
    id text, region text, province text, municipality text,
    barangay text, postal_code text, street_address text,
    is_active boolean, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.faqs (id, question, answer, "order", is_active, created_at, updated_at)
SELECT id, question, answer, "order", is_active, created_at, updated_at
FROM dblink(:'eservice_conn',
    'SELECT id, question, answer, "order", "isActive", "createdAt", "updatedAt"
     FROM public.faqs'
) AS t(
    id text, question text, answer text, "order" integer,
    is_active boolean, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Re-enable triggers
-- =============================================================================
SET session_replication_role = DEFAULT;


-- =============================================================================
-- COMPLETION REPORT
-- =============================================================================
DO $$
DECLARE
    eservice_tables TEXT[] := ARRAY[
        'eservice_users','roles','permissions','role_permissions','user_roles',
        'citizens','non_citizens','subscribers','citizen_registration_requests',
        'place_of_birth','mother_info',
        'services','eservices',
        'transactions','transaction_notes','appointment_notes',
        'tax_profiles','tax_profile_versions','tax_computations',
        'exemptions','payments',
        'social_amelioration_settings',
        'senior_citizen_beneficiaries','senior_citizen_pension_type_pivots',
        'pwd_beneficiaries','student_beneficiaries',
        'solo_parent_beneficiaries','government_programs',
        'beneficiary_program_pivots',
        'refresh_tokens','sessions',
        'otp_verifications','addresses','faqs'
    ];
    t TEXT;
    cnt INTEGER;
BEGIN
    RAISE NOTICE '=== E-Services Migration Row Counts ===';
    FOREACH t IN ARRAY eservice_tables LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO cnt;
        RAISE NOTICE '  %-45s %s rows', t, cnt;
    END LOOP;
END$$;
