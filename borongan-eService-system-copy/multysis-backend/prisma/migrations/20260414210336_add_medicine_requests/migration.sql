-- CreateEnum
CREATE TYPE "permission_action" AS ENUM ('READ', 'ALL');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('PENDING', 'ACCEPTED', 'REQUESTED_UPDATE', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "appointment_note_type" AS ENUM ('GENERAL', 'DATE_CHANGE_REASON', 'FOLLOW_UP', 'INTERNAL');

-- CreateEnum
CREATE TYPE "transaction_note_sender_type" AS ENUM ('ADMIN', 'RESIDENT');

-- CreateEnum
CREATE TYPE "update_request_status" AS ENUM ('NONE', 'PENDING_PORTAL', 'PENDING_ADMIN', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "update_requested_by" AS ENUM ('PORTAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "beneficiary_status" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');

-- CreateEnum
CREATE TYPE "beneficiary_type" AS ENUM ('SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT');

-- CreateEnum
CREATE TYPE "government_program_type" AS ENUM ('SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL');

-- CreateEnum
CREATE TYPE "social_amelioration_setting_type" AS ENUM ('PENSION_TYPE', 'DISABILITY_TYPE', 'GRADE_LEVEL', 'SOLO_PARENT_CATEGORY');

-- CreateEnum
CREATE TYPE "tax_version_status" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "exemption_type" AS ENUM ('SENIOR_CITIZEN', 'PWD', 'SOLO_PARENT', 'OTHER');

-- CreateEnum
CREATE TYPE "exemption_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CHECK', 'ONLINE', 'BANK_TRANSFER', 'GCASH', 'PAYMAYA', 'OTHER');

-- CreateEnum
CREATE TYPE "medicine_request_status" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PREPARING', 'READY_FOR_PICKUP', 'PICKED_UP', 'DONE');

-- CreateTable
CREATE TABLE "municipalities" (
    "id" SERIAL NOT NULL,
    "municipality_name" TEXT NOT NULL,
    "municipality_code" TEXT NOT NULL,
    "gis_code" TEXT,
    "region" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "description" TEXT,
    "setup_status" TEXT NOT NULL DEFAULT 'pending',
    "municipality_logo_path" TEXT,
    "id_background_front_path" TEXT,
    "id_background_back_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barangays" (
    "id" SERIAL NOT NULL,
    "municipality_id" INTEGER NOT NULL,
    "barangay_name" TEXT NOT NULL,
    "barangay_code" TEXT NOT NULL,
    "gis_code" TEXT,
    "barangay_logo_path" TEXT,
    "certificate_background_path" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barangays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "resident_id" TEXT,
    "barangay_id" INTEGER,
    "street_address" TEXT,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "extension_name" TEXT,
    "sex" TEXT,
    "civil_status" TEXT,
    "birthdate" DATE NOT NULL,
    "birth_region" TEXT,
    "birth_province" TEXT,
    "birth_municipality" TEXT,
    "citizenship" TEXT,
    "contact_number" TEXT,
    "email" TEXT,
    "occupation" TEXT,
    "profession" TEXT,
    "employment_status" TEXT,
    "education_attainment" TEXT,
    "monthly_income" DECIMAL(65,30),
    "height" TEXT,
    "weight" TEXT,
    "is_voter" BOOLEAN NOT NULL DEFAULT false,
    "is_employed" BOOLEAN NOT NULL DEFAULT false,
    "indigenous_person" BOOLEAN NOT NULL DEFAULT false,
    "id_type" TEXT,
    "id_document_number" TEXT,
    "acr_no" TEXT,
    "emergency_contact_person" TEXT,
    "emergency_contact_number" TEXT,
    "spouse_name" TEXT,
    "picture_path" TEXT,
    "proof_of_identification" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "application_remarks" TEXT,
    "username" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resident_credentials" (
    "id" TEXT NOT NULL,
    "resident_fk" TEXT NOT NULL,
    "password" TEXT,
    "google_id" TEXT,
    "google_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resident_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" TEXT NOT NULL,
    "resident_fk" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "selfie_url" TEXT,
    "admin_notes" TEXT,
    "amelioration_data" JSONB,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eservice_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eservice_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" "permission_action" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "resident_id" TEXT,
    "token" TEXT NOT NULL,
    "device_info" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "resident_id" TEXT,
    "refresh_token_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "device_info" TEXT,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "requires_payment" BOOLEAN NOT NULL DEFAULT true,
    "default_amount" DECIMAL(65,30),
    "payment_statuses" JSONB,
    "form_fields" JSONB,
    "display_in_sidebar" BOOLEAN NOT NULL DEFAULT true,
    "display_in_subscriber_tabs" BOOLEAN NOT NULL DEFAULT true,
    "appointment_duration" INTEGER,
    "requires_appointment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT,
    "applicant_name" TEXT,
    "applicant_contact" TEXT,
    "applicant_email" TEXT,
    "applicant_address" TEXT,
    "transaction_id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "payment_amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "transmital_no" TEXT,
    "reference_number_generated_at" TIMESTAMP(3),
    "is_local_resident" BOOLEAN NOT NULL DEFAULT false,
    "permit_type" TEXT,
    "status" TEXT,
    "is_posted" BOOLEAN NOT NULL DEFAULT false,
    "valid_id_to_present" TEXT,
    "remarks" TEXT,
    "service_id" TEXT NOT NULL,
    "service_data" JSONB,
    "application_date" TIMESTAMP(3),
    "preferred_appointment_date" TIMESTAMP(3),
    "scheduled_appointment_date" TIMESTAMP(3),
    "appointment_status" "appointment_status" DEFAULT 'PENDING',
    "update_request_status" "update_request_status" NOT NULL DEFAULT 'NONE',
    "update_request_description" TEXT,
    "update_requested_by" "update_requested_by",
    "pending_service_data" JSONB,
    "admin_update_request_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_notes" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "type" "appointment_note_type" NOT NULL,
    "note" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_notes" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender_type" "transaction_note_sender_type" NOT NULL,
    "sender_id" TEXT NOT NULL,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_profiles" (
    "id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_profile_versions" (
    "id" TEXT NOT NULL,
    "tax_profile_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "status" "tax_version_status" NOT NULL DEFAULT 'DRAFT',
    "change_reason" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_profile_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_computations" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "tax_profile_version_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "inputs" JSONB NOT NULL,
    "derived_values" JSONB NOT NULL,
    "breakdown" JSONB NOT NULL,
    "total_tax" DECIMAL(65,30) NOT NULL,
    "adjusted_tax" DECIMAL(65,30),
    "is_reassessment" BOOLEAN NOT NULL DEFAULT false,
    "reassessment_reason" TEXT,
    "previous_computation_id" TEXT,
    "difference_amount" DECIMAL(65,30),
    "exemptions_applied" JSONB,
    "discounts_applied" JSONB,
    "penalties_applied" JSONB,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computed_by" TEXT,

    CONSTRAINT "tax_computations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exemptions" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "tax_computation_id" TEXT,
    "exemption_type" "exemption_type" NOT NULL,
    "status" "exemption_status" NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "request_reason" TEXT NOT NULL,
    "rejection_reason" TEXT,
    "supporting_documents" JSONB,
    "exemption_amount" DECIMAL(65,30),
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "tax_computation_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by" TEXT NOT NULL,
    "reference_number" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_amelioration_settings" (
    "id" TEXT NOT NULL,
    "type" "social_amelioration_setting_type" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_amelioration_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "senior_citizen_beneficiaries" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "senior_citizen_id" TEXT NOT NULL,
    "status" "beneficiary_status" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "senior_citizen_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "senior_citizen_pension_type_pivots" (
    "id" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "setting_id" TEXT NOT NULL,

    CONSTRAINT "senior_citizen_pension_type_pivots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pwd_beneficiaries" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "pwd_id" TEXT NOT NULL,
    "disability_level" TEXT,
    "disability_type_id" TEXT,
    "monetary_allowance" BOOLEAN NOT NULL DEFAULT false,
    "assisted_device" BOOLEAN NOT NULL DEFAULT false,
    "donor_device" TEXT,
    "status" "beneficiary_status" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pwd_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_beneficiaries" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "grade_level_id" TEXT,
    "status" "beneficiary_status" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solo_parent_beneficiaries" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "solo_parent_id" TEXT NOT NULL,
    "category_id" TEXT,
    "status" "beneficiary_status" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solo_parent_beneficiaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "types" "government_program_type"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "government_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "government_program_applications" (
    "id" TEXT NOT NULL,
    "resident_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "submitted_data" JSONB,
    "attachments" JSONB,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,

    CONSTRAINT "government_program_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_requests" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "resident_id" TEXT NOT NULL,
    "prescription_path" TEXT NOT NULL,
    "status" "medicine_request_status" NOT NULL DEFAULT 'SUBMITTED',
    "note" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "prepared_at" TIMESTAMP(3),
    "ready_at" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beneficiary_program_pivots" (
    "id" TEXT NOT NULL,
    "beneficiary_type" "beneficiary_type" NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beneficiary_program_pivots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" TEXT NOT NULL,
    "municipality_id" INTEGER NOT NULL,
    "certificate_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "html_content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "barangays_municipality_id_idx" ON "barangays"("municipality_id");

-- CreateIndex
CREATE INDEX "barangays_gis_code_idx" ON "barangays"("gis_code");

-- CreateIndex
CREATE UNIQUE INDEX "barangays_name_per_muni_key" ON "barangays"("municipality_id", "barangay_name");

-- CreateIndex
CREATE UNIQUE INDEX "residents_resident_id_key" ON "residents"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "residents_username_key" ON "residents"("username");

-- CreateIndex
CREATE INDEX "residents_barangay_id_idx" ON "residents"("barangay_id");

-- CreateIndex
CREATE INDEX "residents_resident_id_idx" ON "residents"("resident_id");

-- CreateIndex
CREATE INDEX "residents_status_idx" ON "residents"("status");

-- CreateIndex
CREATE INDEX "residents_last_name_first_name_idx" ON "residents"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "residents_username_idx" ON "residents"("username");

-- CreateIndex
CREATE UNIQUE INDEX "resident_credentials_resident_fk_key" ON "resident_credentials"("resident_fk");

-- CreateIndex
CREATE UNIQUE INDEX "resident_credentials_google_id_key" ON "resident_credentials"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_resident_fk_key" ON "registration_requests"("resident_fk");

-- CreateIndex
CREATE INDEX "registration_requests_status_idx" ON "registration_requests"("status");

-- CreateIndex
CREATE INDEX "registration_requests_resident_fk_idx" ON "registration_requests"("resident_fk");

-- CreateIndex
CREATE UNIQUE INDEX "eservice_users_email_key" ON "eservice_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_action_key" ON "permissions"("resource", "action");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_resident_id_idx" ON "refresh_tokens"("resident_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_resident_id_idx" ON "sessions"("resident_id");

-- CreateIndex
CREATE INDEX "sessions_refresh_token_id_idx" ON "sessions"("refresh_token_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "sessions_last_activity_at_idx" ON "sessions"("last_activity_at");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");

-- CreateIndex
CREATE INDEX "services_is_active_idx" ON "services"("is_active");

-- CreateIndex
CREATE INDEX "services_category_idx" ON "services"("category");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transaction_id_key" ON "transactions"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_reference_number_key" ON "transactions"("reference_number");

-- CreateIndex
CREATE INDEX "transactions_resident_id_idx" ON "transactions"("resident_id");

-- CreateIndex
CREATE INDEX "transactions_service_id_idx" ON "transactions"("service_id");

-- CreateIndex
CREATE INDEX "transactions_payment_status_idx" ON "transactions"("payment_status");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_update_request_status_idx" ON "transactions"("update_request_status");

-- CreateIndex
CREATE INDEX "transactions_created_at_idx" ON "transactions"("created_at");

-- CreateIndex
CREATE INDEX "transactions_application_date_idx" ON "transactions"("application_date");

-- CreateIndex
CREATE INDEX "appointment_notes_transaction_id_idx" ON "appointment_notes"("transaction_id");

-- CreateIndex
CREATE INDEX "appointment_notes_type_idx" ON "appointment_notes"("type");

-- CreateIndex
CREATE INDEX "transaction_notes_transaction_id_idx" ON "transaction_notes"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_notes_is_read_idx" ON "transaction_notes"("is_read");

-- CreateIndex
CREATE INDEX "transaction_notes_sender_type_idx" ON "transaction_notes"("sender_type");

-- CreateIndex
CREATE INDEX "tax_profiles_service_id_idx" ON "tax_profiles"("service_id");

-- CreateIndex
CREATE INDEX "tax_profiles_is_active_idx" ON "tax_profiles"("is_active");

-- CreateIndex
CREATE INDEX "tax_profile_versions_tax_profile_id_idx" ON "tax_profile_versions"("tax_profile_id");

-- CreateIndex
CREATE INDEX "tax_profile_versions_effective_from_effective_to_idx" ON "tax_profile_versions"("effective_from", "effective_to");

-- CreateIndex
CREATE INDEX "tax_profile_versions_status_idx" ON "tax_profile_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tax_profile_versions_tax_profile_id_version_key" ON "tax_profile_versions"("tax_profile_id", "version");

-- CreateIndex
CREATE INDEX "tax_computations_transaction_id_is_active_idx" ON "tax_computations"("transaction_id", "is_active");

-- CreateIndex
CREATE INDEX "tax_computations_tax_profile_version_id_idx" ON "tax_computations"("tax_profile_version_id");

-- CreateIndex
CREATE INDEX "tax_computations_previous_computation_id_idx" ON "tax_computations"("previous_computation_id");

-- CreateIndex
CREATE INDEX "exemptions_transaction_id_idx" ON "exemptions"("transaction_id");

-- CreateIndex
CREATE INDEX "exemptions_status_idx" ON "exemptions"("status");

-- CreateIndex
CREATE INDEX "exemptions_tax_computation_id_idx" ON "exemptions"("tax_computation_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_tax_computation_id_idx" ON "payments"("tax_computation_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "social_amelioration_settings_type_idx" ON "social_amelioration_settings"("type");

-- CreateIndex
CREATE INDEX "social_amelioration_settings_is_active_idx" ON "social_amelioration_settings"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "senior_citizen_beneficiaries_resident_id_key" ON "senior_citizen_beneficiaries"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "senior_citizen_beneficiaries_senior_citizen_id_key" ON "senior_citizen_beneficiaries"("senior_citizen_id");

-- CreateIndex
CREATE UNIQUE INDEX "senior_citizen_pension_type_pivots_beneficiary_id_setting_i_key" ON "senior_citizen_pension_type_pivots"("beneficiary_id", "setting_id");

-- CreateIndex
CREATE UNIQUE INDEX "pwd_beneficiaries_resident_id_key" ON "pwd_beneficiaries"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "pwd_beneficiaries_pwd_id_key" ON "pwd_beneficiaries"("pwd_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_beneficiaries_resident_id_key" ON "student_beneficiaries"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_beneficiaries_student_id_key" ON "student_beneficiaries"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "solo_parent_beneficiaries_resident_id_key" ON "solo_parent_beneficiaries"("resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "solo_parent_beneficiaries_solo_parent_id_key" ON "solo_parent_beneficiaries"("solo_parent_id");

-- CreateIndex
CREATE INDEX "government_programs_is_active_idx" ON "government_programs"("is_active");

-- CreateIndex
CREATE INDEX "government_program_applications_status_idx" ON "government_program_applications"("status");

-- CreateIndex
CREATE INDEX "government_program_applications_program_id_idx" ON "government_program_applications"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "government_program_applications_resident_id_program_id_key" ON "government_program_applications"("resident_id", "program_id");

-- CreateIndex
CREATE INDEX "medicine_requests_resident_id_idx" ON "medicine_requests"("resident_id");

-- CreateIndex
CREATE INDEX "medicine_requests_status_idx" ON "medicine_requests"("status");

-- CreateIndex
CREATE INDEX "medicine_requests_created_at_idx" ON "medicine_requests"("created_at");

-- CreateIndex
CREATE INDEX "beneficiary_program_pivots_beneficiary_type_beneficiary_id_idx" ON "beneficiary_program_pivots"("beneficiary_type", "beneficiary_id");

-- CreateIndex
CREATE INDEX "beneficiary_program_pivots_program_id_idx" ON "beneficiary_program_pivots"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "beneficiary_program_pivots_beneficiary_type_beneficiary_id__key" ON "beneficiary_program_pivots"("beneficiary_type", "beneficiary_id", "program_id");

-- CreateIndex
CREATE INDEX "faqs_is_active_idx" ON "faqs"("is_active");

-- CreateIndex
CREATE INDEX "faqs_order_idx" ON "faqs"("order");

-- CreateIndex
CREATE INDEX "certificate_templates_municipality_id_idx" ON "certificate_templates"("municipality_id");

-- CreateIndex
CREATE INDEX "certificate_templates_certificate_type_idx" ON "certificate_templates"("certificate_type");

-- CreateIndex
CREATE UNIQUE INDEX "certificate_templates_municipality_id_certificate_type_key" ON "certificate_templates"("municipality_id", "certificate_type");

-- AddForeignKey
ALTER TABLE "barangays" ADD CONSTRAINT "barangays_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "residents" ADD CONSTRAINT "residents_barangay_id_fkey" FOREIGN KEY ("barangay_id") REFERENCES "barangays"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resident_credentials" ADD CONSTRAINT "resident_credentials_resident_fk_fkey" FOREIGN KEY ("resident_fk") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_resident_fk_fkey" FOREIGN KEY ("resident_fk") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "eservice_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "eservice_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_refresh_token_id_fkey" FOREIGN KEY ("refresh_token_id") REFERENCES "refresh_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "eservice_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notes" ADD CONSTRAINT "appointment_notes_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_notes" ADD CONSTRAINT "transaction_notes_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_profiles" ADD CONSTRAINT "tax_profiles_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_profile_versions" ADD CONSTRAINT "tax_profile_versions_tax_profile_id_fkey" FOREIGN KEY ("tax_profile_id") REFERENCES "tax_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_computations" ADD CONSTRAINT "tax_computations_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_computations" ADD CONSTRAINT "tax_computations_tax_profile_version_id_fkey" FOREIGN KEY ("tax_profile_version_id") REFERENCES "tax_profile_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_computations" ADD CONSTRAINT "tax_computations_previous_computation_id_fkey" FOREIGN KEY ("previous_computation_id") REFERENCES "tax_computations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exemptions" ADD CONSTRAINT "exemptions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exemptions" ADD CONSTRAINT "exemptions_tax_computation_id_fkey" FOREIGN KEY ("tax_computation_id") REFERENCES "tax_computations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tax_computation_id_fkey" FOREIGN KEY ("tax_computation_id") REFERENCES "tax_computations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senior_citizen_beneficiaries" ADD CONSTRAINT "senior_citizen_beneficiaries_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senior_citizen_pension_type_pivots" ADD CONSTRAINT "senior_citizen_pension_type_pivots_beneficiary_id_fkey" FOREIGN KEY ("beneficiary_id") REFERENCES "senior_citizen_beneficiaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senior_citizen_pension_type_pivots" ADD CONSTRAINT "senior_citizen_pension_type_pivots_setting_id_fkey" FOREIGN KEY ("setting_id") REFERENCES "social_amelioration_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pwd_beneficiaries" ADD CONSTRAINT "pwd_beneficiaries_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pwd_beneficiaries" ADD CONSTRAINT "pwd_beneficiaries_disability_type_id_fkey" FOREIGN KEY ("disability_type_id") REFERENCES "social_amelioration_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_beneficiaries" ADD CONSTRAINT "student_beneficiaries_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_beneficiaries" ADD CONSTRAINT "student_beneficiaries_grade_level_id_fkey" FOREIGN KEY ("grade_level_id") REFERENCES "social_amelioration_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solo_parent_beneficiaries" ADD CONSTRAINT "solo_parent_beneficiaries_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solo_parent_beneficiaries" ADD CONSTRAINT "solo_parent_beneficiaries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "social_amelioration_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_program_applications" ADD CONSTRAINT "government_program_applications_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "government_program_applications" ADD CONSTRAINT "government_program_applications_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "government_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_requests" ADD CONSTRAINT "medicine_requests_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beneficiary_program_pivots" ADD CONSTRAINT "beneficiary_program_pivots_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "government_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificate_templates" ADD CONSTRAINT "certificate_templates_municipality_id_fkey" FOREIGN KEY ("municipality_id") REFERENCES "municipalities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
