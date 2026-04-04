-- =============================================================================
-- ROLLBACK — Truncate all unified DB tables in reverse FK dependency order
-- =============================================================================
-- PURPOSE: Clean slate for re-running migration scripts during development
--          or to fully roll back the unified DB to empty.
--
-- WARNING: This DESTROYS all data in the unified database.
--          Do NOT run against a production database unless intentionally
--          rolling back a failed migration.
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" -f rollback.sql
--
-- Uses TRUNCATE ... CASCADE which handles FK chains automatically.
-- Sequences are reset to 0.
-- =============================================================================

SET search_path TO public;

-- Confirmation guard — comment out this block to allow execution
DO $$
BEGIN
    RAISE EXCEPTION
        'ROLLBACK GUARD: This script will delete ALL data. '
        'Comment out this DO block to confirm you intend to run it.';
END$$;

-- ---------------------------------------------------------------------------
-- Disable triggers during truncation
-- ---------------------------------------------------------------------------
SET session_replication_role = replica;

-- ---------------------------------------------------------------------------
-- BRIDGE TABLE (references both sides — truncate first)
-- ---------------------------------------------------------------------------
TRUNCATE TABLE public.citizen_resident_mapping RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- E-SERVICES — reverse dependency order
-- ---------------------------------------------------------------------------
TRUNCATE TABLE public.beneficiary_program_pivots  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.senior_citizen_pension_type_pivots RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.senior_citizen_beneficiaries RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.pwd_beneficiaries            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.student_beneficiaries        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.solo_parent_beneficiaries    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.government_programs          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.social_amelioration_settings RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.payments                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.exemptions                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tax_computations             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tax_profile_versions         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tax_profiles                 RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.appointment_notes            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.transaction_notes            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.transactions                 RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.services                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.eservices                    RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.otp_verifications            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.faqs                         RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.addresses                    RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.sessions                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.refresh_tokens               RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.citizen_registration_requests RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.place_of_birth               RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.mother_info                  RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.subscribers                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.non_citizens                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.citizens                     RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.user_roles                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.role_permissions             RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.permissions                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.roles                        RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.eservice_users               RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- BIMS — reverse dependency order
-- ---------------------------------------------------------------------------
TRUNCATE TABLE public.audit_logs                   RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.api_keys                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.bims_users                   RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.vaccines                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.pets                         RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.archives                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.inventories                  RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.requests                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.officials                    RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.family_members               RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.families                     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.households                   RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.resident_classifications     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.residents                    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.resident_counters            RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.classification_types         RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.gis_barangay                 RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.gis_municipality             RESTART IDENTITY CASCADE;

TRUNCATE TABLE public.puroks                       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.barangays                    RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.municipalities               RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------------------
-- Re-enable triggers
-- ---------------------------------------------------------------------------
SET session_replication_role = DEFAULT;

-- ---------------------------------------------------------------------------
-- Verify all tables are empty
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t   TEXT;
    cnt INTEGER;
    all_tables TEXT[] := ARRAY[
        'municipalities','barangays','puroks','gis_municipality','gis_barangay',
        'residents','resident_classifications','resident_counters','classification_types',
        'households','families','family_members',
        'officials','requests','inventories','archives',
        'pets','vaccines','bims_users','api_keys','audit_logs',
        'eservice_users','roles','permissions','role_permissions','user_roles',
        'citizens','non_citizens','subscribers','citizen_registration_requests',
        'place_of_birth','mother_info',
        'services','eservices',
        'transactions','transaction_notes','appointment_notes',
        'tax_profiles','tax_profile_versions','tax_computations',
        'exemptions','payments',
        'social_amelioration_settings',
        'senior_citizen_beneficiaries','senior_citizen_pension_type_pivots',
        'pwd_beneficiaries','student_beneficiaries','solo_parent_beneficiaries',
        'government_programs','beneficiary_program_pivots',
        'refresh_tokens','sessions',
        'otp_verifications','addresses','faqs',
        'citizen_resident_mapping'
    ];
BEGIN
    RAISE NOTICE '=== Rollback verification: all tables should be 0 rows ===';
    FOREACH t IN ARRAY all_tables LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO cnt;
        IF cnt > 0 THEN
            RAISE WARNING '  [NOT EMPTY] %: % rows', t, cnt;
        ELSE
            RAISE NOTICE  '  [EMPTY]     %', t;
        END IF;
    END LOOP;
    RAISE NOTICE '=== Rollback complete ===';
END$$;
