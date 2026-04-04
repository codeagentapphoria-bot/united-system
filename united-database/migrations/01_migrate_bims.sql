-- =============================================================================
-- MIGRATION 01 — Import BIMS data into the Unified Database
-- =============================================================================
-- Source DB:  bims_production  (PostgreSQL, raw pg pool)
-- Target DB:  unified Supabase instance (schema already applied via schema.sql)
--
-- HOW TO RUN:
--   This script uses dblink to pull data directly from the source DB.
--   Run it connected to the unified (target) Supabase DB:
--
--   psql "$UNIFIED_DB_URL" \
--     -v bims_conn="host=<BIMS_HOST> dbname=bims_production user=<USER> password=<PASS>" \
--     -f 01_migrate_bims.sql
--
--   Or replace :'bims_conn' below with the full connection string literal.
--
-- IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING throughout.
--             Safe to re-run after a partial failure.
--
-- KEY RENAME: source table `users`  →  target table `bims_users`
--             source sequence `users_id_seq` →  `bims_users_id_seq`
--
-- ORDER matters (FK dependencies):
--   municipalities → barangays → puroks
--   residents → households → families → family_members
--   classification_types → resident_classifications
--   officials, requests, inventories, archives, pets, vaccines
--   bims_users, api_keys, audit_logs
--   resident_counters (no FK)
--   gis_municipality, gis_barangay (PostGIS — no FK)
-- =============================================================================

-- Requires dblink extension on the unified DB
CREATE EXTENSION IF NOT EXISTS dblink;

-- ---------------------------------------------------------------------------
-- Helper: set search path for this session
-- ---------------------------------------------------------------------------
SET search_path TO public;

-- ---------------------------------------------------------------------------
-- Disable triggers during bulk import to avoid audit log spam.
-- Re-enable at the end.
-- ---------------------------------------------------------------------------
SET session_replication_role = replica;  -- disables triggers & FK checks during import

-- =============================================================================
-- GEOGRAPHY / ADMIN
-- =============================================================================

INSERT INTO public.municipalities (
    id, municipality_name, municipality_code, gis_code,
    region, province, description,
    municipality_logo_path, id_background_front_path, id_background_back_path,
    created_at, updated_at
)
SELECT
    id, municipality_name, municipality_code, gis_code,
    region, province, description,
    municipality_logo_path, id_background_front_path, id_background_back_path,
    created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, municipality_name, municipality_code, gis_code,
            region, province, description,
            municipality_logo_path, id_background_front_path, id_background_back_path,
            created_at, updated_at
     FROM public.municipalities'
) AS t(
    id integer, municipality_name varchar(50), municipality_code varchar(8),
    gis_code varchar(20), region varchar(20), province varchar(50),
    description text, municipality_logo_path text,
    id_background_front_path text, id_background_back_path text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

-- Sync sequence
SELECT setval('public.municipalities_id_seq', COALESCE((SELECT MAX(id) FROM public.municipalities), 0));


INSERT INTO public.barangays (
    id, municipality_id, barangay_name, barangay_code,
    barangay_logo_path, certificate_background_path, organizational_chart_path,
    contact_number, email, gis_code, created_at, updated_at
)
SELECT
    id, municipality_id, barangay_name, barangay_code,
    barangay_logo_path, certificate_background_path, organizational_chart_path,
    contact_number, email, gis_code, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, municipality_id, barangay_name, barangay_code,
            barangay_logo_path, certificate_background_path, organizational_chart_path,
            contact_number, email, gis_code, created_at, updated_at
     FROM public.barangays'
) AS t(
    id integer, municipality_id integer, barangay_name varchar(50),
    barangay_code varchar(20), barangay_logo_path text,
    certificate_background_path text, organizational_chart_path text,
    contact_number varchar(50), email varchar(50), gis_code varchar(20),
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.barangays_id_seq', COALESCE((SELECT MAX(id) FROM public.barangays), 0));


INSERT INTO public.puroks (
    id, barangay_id, purok_name, purok_leader, description, created_at, updated_at
)
SELECT
    id, barangay_id, purok_name, purok_leader, description, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, barangay_id, purok_name, purok_leader, description, created_at, updated_at
     FROM public.puroks'
) AS t(
    id integer, barangay_id integer, purok_name varchar(50),
    purok_leader varchar(50), description text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.puroks_id_seq', COALESCE((SELECT MAX(id) FROM public.puroks), 0));


-- =============================================================================
-- GIS (PostGIS geometry data)
-- =============================================================================

INSERT INTO public.gis_municipality (
    id, name, gis_municipality_code, geom, shape_sqkm
)
SELECT id, name, gis_municipality_code, geom, shape_sqkm
FROM dblink(:'bims_conn',
    'SELECT id, name, gis_municipality_code, geom, shape_sqkm
     FROM public.gis_municipality'
) AS t(
    id integer, name varchar(50), gis_municipality_code varchar(20),
    geom geometry, shape_sqkm numeric
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.gis_municipality_id_seq', COALESCE((SELECT MAX(id) FROM public.gis_municipality), 0));


INSERT INTO public.gis_barangay (
    id, name, gis_barangay_code, gis_municipality_code, geom, shape_sqkm
)
SELECT id, name, gis_barangay_code, gis_municipality_code, geom, shape_sqkm
FROM dblink(:'bims_conn',
    'SELECT id, name, gis_barangay_code, gis_municipality_code, geom, shape_sqkm
     FROM public.gis_barangay'
) AS t(
    id integer, name varchar(50), gis_barangay_code varchar(20),
    gis_municipality_code varchar(20), geom geometry, shape_sqkm numeric
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.gis_barangay_id_seq', COALESCE((SELECT MAX(id) FROM public.gis_barangay), 0));


-- =============================================================================
-- PEOPLE / RESIDENCY
-- =============================================================================

INSERT INTO public.residents (
    id, barangay_id, last_name, first_name, middle_name, suffix,
    sex, civil_status, birthdate, birthplace,
    contact_number, email, occupation, monthly_income,
    employment_status, education_attainment, resident_status,
    picture_path, indigenous_person, created_at, updated_at
)
SELECT
    id, barangay_id, last_name, first_name, middle_name, suffix,
    sex, civil_status, birthdate, birthplace,
    contact_number, email, occupation, monthly_income,
    employment_status, education_attainment, resident_status,
    picture_path, indigenous_person, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, barangay_id, last_name, first_name, middle_name, suffix,
            sex, civil_status, birthdate, birthplace,
            contact_number, email, occupation, monthly_income,
            employment_status, education_attainment, resident_status,
            picture_path, indigenous_person, created_at, updated_at
     FROM public.residents'
) AS t(
    id varchar(20), barangay_id integer, last_name varchar(50),
    first_name varchar(50), middle_name varchar(50), suffix varchar(10),
    sex varchar(10), civil_status varchar(25), birthdate date,
    birthplace text, contact_number varchar(50), email varchar(100),
    occupation text, monthly_income numeric, employment_status varchar(20),
    education_attainment varchar(30), resident_status varchar(20),
    picture_path text, indigenous_person boolean,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO public.resident_classifications (
    id, resident_id, classification_type, classification_details
)
SELECT id, resident_id, classification_type, classification_details
FROM dblink(:'bims_conn',
    'SELECT id, resident_id, classification_type, classification_details
     FROM public.resident_classifications'
) AS t(
    id integer, resident_id varchar(20),
    classification_type varchar(50), classification_details jsonb
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.resident_classifications_id_seq', COALESCE((SELECT MAX(id) FROM public.resident_classifications), 0));


INSERT INTO public.resident_counters (year, counter, prefix)
SELECT year, counter, prefix
FROM dblink(:'bims_conn',
    'SELECT year, counter, prefix FROM public.resident_counters'
) AS t(year integer, counter integer, prefix char(4))
ON CONFLICT (year) DO UPDATE SET counter = EXCLUDED.counter;


INSERT INTO public.classification_types (
    id, municipality_id, name, description, color, details, is_active, created_at, updated_at
)
SELECT id, municipality_id, name, description, color, details, is_active, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, municipality_id, name, description, color, details, is_active, created_at, updated_at
     FROM public.classification_types'
) AS t(
    id integer, municipality_id integer, name varchar(100),
    description text, color varchar(7), details jsonb,
    is_active boolean, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.classification_types_id_seq', COALESCE((SELECT MAX(id) FROM public.classification_types), 0));


-- =============================================================================
-- HOUSEHOLD / FAMILY
-- =============================================================================

INSERT INTO public.households (
    id, house_number, street, purok_id, barangay_id, house_head,
    housing_type, structure_type, electricity, water_source,
    toilet_facility, geom, area, household_image_path, created_at, updated_at
)
SELECT
    id, house_number, street, purok_id, barangay_id, house_head,
    housing_type, structure_type, electricity, water_source,
    toilet_facility, geom, area, household_image_path, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, house_number, street, purok_id, barangay_id, house_head,
            housing_type, structure_type, electricity, water_source,
            toilet_facility, geom, area, household_image_path, created_at, updated_at
     FROM public.households'
) AS t(
    id integer, house_number varchar(10), street varchar(50),
    purok_id integer, barangay_id integer, house_head varchar(20),
    housing_type varchar(30), structure_type varchar(30),
    electricity boolean, water_source varchar(30),
    toilet_facility varchar(30), geom geometry, area numeric,
    household_image_path text, created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.households_id_seq', COALESCE((SELECT MAX(id) FROM public.households), 0));


INSERT INTO public.families (
    id, household_id, family_group, family_head, created_at, updated_at
)
SELECT id, household_id, family_group, family_head, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, household_id, family_group, family_head, created_at, updated_at
     FROM public.families'
) AS t(
    id integer, household_id integer, family_group varchar(20),
    family_head varchar(20), created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.families_id_seq', COALESCE((SELECT MAX(id) FROM public.families), 0));


INSERT INTO public.family_members (
    id, family_id, family_member, relationship_to_head, created_at, updated_at
)
SELECT id, family_id, family_member, relationship_to_head, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, family_id, family_member, relationship_to_head, created_at, updated_at
     FROM public.family_members'
) AS t(
    id integer, family_id integer, family_member varchar(20),
    relationship_to_head varchar(50), created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.family_members_id_seq', COALESCE((SELECT MAX(id) FROM public.family_members), 0));


-- =============================================================================
-- OFFICIALS / REQUESTS / INVENTORY / ARCHIVES
-- =============================================================================

INSERT INTO public.officials (
    id, barangay_id, resident_id, position, committee,
    term_start, term_end, responsibilities, created_at, updated_at
)
SELECT
    id, barangay_id, resident_id, position, committee,
    term_start, term_end, responsibilities, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, barangay_id, resident_id, position, committee,
            term_start, term_end, responsibilities, created_at, updated_at
     FROM public.officials'
) AS t(
    id integer, barangay_id integer, resident_id varchar(20),
    position varchar(100), committee varchar(50),
    term_start date, term_end date, responsibilities text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.officials_id_seq', COALESCE((SELECT MAX(id) FROM public.officials), 0));


INSERT INTO public.requests (
    id, resident_id, full_name, contact_number, email, address,
    barangay_id, type, status, certificate_type, urgency, purpose,
    requirements, appointment_with, appointment_date, notes,
    created_at, updated_at, uuid
)
SELECT
    id, resident_id, full_name, contact_number, email, address,
    barangay_id, type, status, certificate_type, urgency, purpose,
    requirements, appointment_with, appointment_date, notes,
    created_at, updated_at, uuid
FROM dblink(:'bims_conn',
    'SELECT id, resident_id, full_name, contact_number, email, address,
            barangay_id, type, status, certificate_type, urgency, purpose,
            requirements, appointment_with, appointment_date, notes,
            created_at, updated_at, uuid
     FROM public.requests'
) AS t(
    id integer, resident_id varchar(20), full_name varchar(200),
    contact_number varchar(50), email varchar(50), address text,
    barangay_id integer, type varchar(50), status varchar(50),
    certificate_type varchar(100), urgency varchar(50), purpose text,
    requirements jsonb, appointment_with varchar(255),
    appointment_date date, notes text,
    created_at timestamptz, updated_at timestamptz, uuid uuid
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.requests_id_seq', COALESCE((SELECT MAX(id) FROM public.requests), 0));


INSERT INTO public.inventories (
    id, barangay_id, item_name, item_type, description,
    sponsors, quantity, unit, file_path, created_at, updated_at
)
SELECT
    id, barangay_id, item_name, item_type, description,
    sponsors, quantity, unit, file_path, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, barangay_id, item_name, item_type, description,
            sponsors, quantity, unit, file_path, created_at, updated_at
     FROM public.inventories'
) AS t(
    id integer, barangay_id integer, item_name varchar(255),
    item_type varchar(50), description text, sponsors varchar(50),
    quantity integer, unit varchar(20), file_path text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.inventories_id_seq', COALESCE((SELECT MAX(id) FROM public.inventories), 0));


INSERT INTO public.archives (
    id, barangay_id, title, document_type, description,
    author, signatory, relate_resident, file_path, created_at, updated_at
)
SELECT
    id, barangay_id, title, document_type, description,
    author, signatory, relate_resident, file_path, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, barangay_id, title, document_type, description,
            author, signatory, relate_resident, file_path, created_at, updated_at
     FROM public.archives'
) AS t(
    id integer, barangay_id integer, title varchar(255),
    document_type varchar(50), description text, author varchar(50),
    signatory varchar(50), relate_resident varchar(20), file_path text,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.archives_id_seq', COALESCE((SELECT MAX(id) FROM public.archives), 0));


-- =============================================================================
-- HEALTH / PETS / VACCINES
-- =============================================================================

INSERT INTO public.pets (
    id, owner_id, pet_name, species, breed, sex, birthdate,
    color, picture_path, description, created_at, updated_at, uuid
)
SELECT
    id, owner_id, pet_name, species, breed, sex, birthdate,
    color, picture_path, description, created_at, updated_at, uuid
FROM dblink(:'bims_conn',
    'SELECT id, owner_id, pet_name, species, breed, sex, birthdate,
            color, picture_path, description, created_at, updated_at, uuid
     FROM public.pets'
) AS t(
    id integer, owner_id varchar(20), pet_name varchar(50),
    species varchar(50), breed varchar(50), sex varchar(10),
    birthdate date, color varchar(20), picture_path text,
    description text, created_at timestamp, updated_at timestamp, uuid uuid
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.pets_id_seq', COALESCE((SELECT MAX(id) FROM public.pets), 0));


INSERT INTO public.vaccines (
    id, target_type, target_id, vaccine_name, vaccine_type,
    vaccine_description, vaccination_date, created_at, updated_at
)
SELECT
    id, target_type, target_id, vaccine_name, vaccine_type,
    vaccine_description, vaccination_date, created_at, updated_at
FROM dblink(:'bims_conn',
    'SELECT id, target_type, target_id, vaccine_name, vaccine_type,
            vaccine_description, vaccination_date, created_at, updated_at
     FROM public.vaccines'
) AS t(
    id integer, target_type varchar(10), target_id varchar(20),
    vaccine_name varchar(100), vaccine_type varchar(100),
    vaccine_description text, vaccination_date date,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.vaccines_id_seq', COALESCE((SELECT MAX(id) FROM public.vaccines), 0));


-- =============================================================================
-- AUTH — bims_users (source table name: users)
-- =============================================================================

INSERT INTO public.bims_users (
    id, target_type, target_id, full_name, email, password, role,
    picture_path, last_login, failed_login_attempts, is_active,
    reset_token, reset_token_expiry, created_at, updated_at
)
SELECT
    id, target_type, target_id, full_name, email, password, role,
    picture_path, last_login, failed_login_attempts, is_active,
    reset_token, reset_token_expiry, created_at, updated_at
FROM dblink(:'bims_conn',
    -- Source table is named "users" in bims_production
    'SELECT id, target_type, target_id, full_name, email, password, role,
            picture_path, last_login, failed_login_attempts, is_active,
            reset_token, reset_token_expiry, created_at, updated_at
     FROM public.users'
) AS t(
    id integer, target_type varchar(15), target_id varchar(20),
    full_name varchar(100), email varchar(100), password text,
    role varchar(20), picture_path text,
    last_login timestamp, failed_login_attempts integer,
    is_active boolean, reset_token text, reset_token_expiry timestamp,
    created_at timestamp, updated_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.bims_users_id_seq', COALESCE((SELECT MAX(id) FROM public.bims_users), 0));


-- =============================================================================
-- API KEYS
-- NOTE: api_keys is a dynamic table created at runtime by ApiKey.js.
--       It may not exist in bims_production if never seeded.
--       The DO block below handles the case gracefully.
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM dblink(:'bims_conn', 'SELECT to_regclass(''public.api_keys'')')
        AS t(result text) WHERE result IS NOT NULL
    ) THEN
        INSERT INTO public.api_keys (
            id, key, name, municipality_id, scopes, rate_limit_per_minute,
            expires_at, revoked, created_by_user_id, last_used_at,
            created_at, updated_at
        )
        SELECT
            id, key, name, municipality_id, scopes, rate_limit_per_minute,
            expires_at, revoked,
            created_by_user_id,
            last_used_at,
            created_at, updated_at
        FROM dblink(:'bims_conn',
            'SELECT id, key, name, municipality_id, scopes, rate_limit_per_minute,
                    expires_at, revoked, created_by_user_id, last_used_at,
                    created_at, updated_at
             FROM public.api_keys'
        ) AS t(
            id integer, key text, name varchar(100), municipality_id integer,
            scopes text[], rate_limit_per_minute integer,
            expires_at timestamp, revoked boolean,
            created_by_user_id integer, last_used_at timestamp,
            created_at timestamp, updated_at timestamp
        )
        ON CONFLICT (id) DO NOTHING;

        PERFORM setval('public.api_keys_id_seq', COALESCE((SELECT MAX(id) FROM public.api_keys), 0));
    END IF;
END$$;


-- =============================================================================
-- AUDIT LOGS
-- Imported last — references bims_users which must exist first.
-- changed_by references the OLD integer user IDs from bims_users.
-- =============================================================================

INSERT INTO public.audit_logs (
    id, barangay_id, table_name, operation, record_id,
    old_values, new_values, changed_by, changed_at
)
SELECT
    id, barangay_id, table_name, operation, record_id,
    old_values, new_values, changed_by, changed_at
FROM dblink(:'bims_conn',
    'SELECT id, barangay_id, table_name, operation, record_id,
            old_values, new_values, changed_by, changed_at
     FROM public.audit_logs'
) AS t(
    id integer, barangay_id integer, table_name varchar(50),
    operation varchar(10), record_id varchar(20),
    old_values jsonb, new_values jsonb,
    changed_by integer, changed_at timestamp
)
ON CONFLICT (id) DO NOTHING;

SELECT setval('public.audit_logs_id_seq', COALESCE((SELECT MAX(id) FROM public.audit_logs), 0));


-- =============================================================================
-- Re-enable triggers
-- =============================================================================
SET session_replication_role = DEFAULT;


-- =============================================================================
-- COMPLETION REPORT
-- =============================================================================
DO $$
DECLARE
    r RECORD;
    bims_tables TEXT[] := ARRAY[
        'municipalities','barangays','puroks',
        'gis_municipality','gis_barangay',
        'residents','resident_classifications','resident_counters','classification_types',
        'households','families','family_members',
        'officials','requests','inventories','archives',
        'pets','vaccines',
        'bims_users','api_keys','audit_logs'
    ];
    t TEXT;
    cnt INTEGER;
BEGIN
    RAISE NOTICE '=== BIMS Migration Row Counts ===';
    FOREACH t IN ARRAY bims_tables LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO cnt;
        RAISE NOTICE '  %-40s %s rows', t, cnt;
    END LOOP;
END$$;
