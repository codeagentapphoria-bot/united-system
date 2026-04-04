-- =============================================================================
-- UNITED SYSTEMS — Unified Database Schema v2
-- =============================================================================
-- Revised: Mar 2026
--
-- ARCHITECTURE CHANGES FROM v1:
--   - Unified residents table: merges BIMS residents + E-Services citizens/non_citizens/subscribers
--   - New resident_credentials table for portal auth (username/password/google)
--   - New registration_requests table (replaces citizen_registration_requests)
--   - Households/families self-registered via portal (no purok dependency)
--   - Municipality setup driven by GeoJSON selection (barangays auto-created)
--   - Removed: citizens, non_citizens, subscribers, citizen_resident_mapping,
--              citizen_registration_requests, place_of_birth, mother_info,
--              addresses (lookup), otp_verifications, puroks
--   - Portal auth: username+password + Google OAuth (no phone OTP)
--   - System reusable for any municipality (no Borongan hardcoding)
--
-- Run order:
--   1. Extensions
--   2. Enums
--   3. Functions & trigger bodies
--   4. BIMS tables  (geography → people → household → services → audit)
--   5. E-Services tables (auth → services → tax → beneficiaries → util)
--   6. Primary key constraints
--   7. Unique constraints
--   8. Indexes
--   9. Triggers (attach)
--  10. Foreign keys
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis  WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;


-- =============================================================================
-- ENUMS
-- =============================================================================

-- E-Services: RBAC
CREATE TYPE public.permission_action AS ENUM ('READ', 'ALL');

-- E-Services: Beneficiaries
CREATE TYPE public.beneficiary_status              AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
CREATE TYPE public.beneficiary_type                AS ENUM ('SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT');
CREATE TYPE public.government_program_type         AS ENUM ('SENIOR_CITIZEN', 'PWD', 'STUDENT', 'SOLO_PARENT', 'ALL');
CREATE TYPE public.social_amelioration_setting_type AS ENUM ('PENSION_TYPE', 'DISABILITY_TYPE', 'GRADE_LEVEL', 'SOLO_PARENT_CATEGORY');

-- E-Services: Tax
CREATE TYPE public.tax_version_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE public.exemption_type     AS ENUM ('SENIOR_CITIZEN', 'PWD', 'SOLO_PARENT', 'OTHER');
CREATE TYPE public.exemption_status   AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.payment_method     AS ENUM ('CASH', 'CHECK', 'ONLINE', 'BANK_TRANSFER', 'GCASH', 'PAYMAYA', 'OTHER');

-- E-Services: Transactions
CREATE TYPE public.appointment_status            AS ENUM ('PENDING', 'ACCEPTED', 'REQUESTED_UPDATE', 'DECLINED', 'CANCELLED');
CREATE TYPE public.appointment_note_type         AS ENUM ('GENERAL', 'DATE_CHANGE_REASON', 'FOLLOW_UP', 'INTERNAL');
CREATE TYPE public.transaction_note_sender_type  AS ENUM ('ADMIN', 'RESIDENT');   -- was SUBSCRIBER
CREATE TYPE public.update_request_status         AS ENUM ('NONE', 'PENDING_PORTAL', 'PENDING_ADMIN', 'APPROVED', 'REJECTED');
CREATE TYPE public.update_requested_by           AS ENUM ('PORTAL', 'ADMIN');


-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- BIMS: audit user session helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_audit_user()
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN COALESCE(current_setting('audit.user_id', true)::INTEGER, NULL);
END;
$$;


-- ---------------------------------------------------------------------------
-- BIMS: updated_at auto-stamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- BIMS: audit trigger — writes change history to audit_logs on every
--        INSERT / UPDATE / DELETE on major BIMS tables.
--        record_id is now text to support both UUID and legacy varchar PKs.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    audit_barangay_id INTEGER := NULL;
    audit_record_id   TEXT;
    audit_old_values  JSONB := NULL;
    audit_new_values  JSONB := NULL;
BEGIN
    IF TG_TABLE_NAME = 'residents' THEN
        IF TG_OP = 'DELETE' THEN
            audit_barangay_id := OLD.barangay_id;  audit_record_id := OLD.id;
        ELSE
            audit_barangay_id := NEW.barangay_id;  audit_record_id := NEW.id;
        END IF;

    ELSIF TG_TABLE_NAME = 'households' THEN
        IF TG_OP = 'DELETE' THEN
            audit_barangay_id := OLD.barangay_id;  audit_record_id := OLD.id::TEXT;
        ELSE
            audit_barangay_id := NEW.barangay_id;  audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'families' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT h.barangay_id INTO audit_barangay_id FROM public.households h WHERE h.id = OLD.household_id;
            audit_record_id := OLD.id::TEXT;
        ELSE
            SELECT h.barangay_id INTO audit_barangay_id FROM public.households h WHERE h.id = NEW.household_id;
            audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'family_members' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT h.barangay_id INTO audit_barangay_id
            FROM public.families f JOIN public.households h ON h.id = f.household_id WHERE f.id = OLD.family_id;
            audit_record_id := OLD.id::TEXT;
        ELSE
            SELECT h.barangay_id INTO audit_barangay_id
            FROM public.families f JOIN public.households h ON h.id = f.household_id WHERE f.id = NEW.family_id;
            audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'archives' THEN
        IF TG_OP = 'DELETE' THEN
            audit_barangay_id := OLD.barangay_id;  audit_record_id := OLD.id::TEXT;
        ELSE
            audit_barangay_id := NEW.barangay_id;  audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'inventories' THEN
        IF TG_OP = 'DELETE' THEN
            audit_barangay_id := OLD.barangay_id;  audit_record_id := OLD.id::TEXT;
        ELSE
            audit_barangay_id := NEW.barangay_id;  audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'pets' THEN
        IF TG_OP = 'DELETE' THEN
            SELECT r.barangay_id INTO audit_barangay_id FROM public.residents r WHERE r.id = OLD.owner_id;
            audit_record_id := OLD.id::TEXT;
        ELSE
            SELECT r.barangay_id INTO audit_barangay_id FROM public.residents r WHERE r.id = NEW.owner_id;
            audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'requests' THEN
        IF TG_OP = 'DELETE' THEN
            audit_barangay_id := OLD.barangay_id;
            audit_record_id := OLD.id::TEXT;
        ELSE
            audit_barangay_id := NEW.barangay_id;
            audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'registration_requests' THEN
        IF TG_OP = 'DELETE' THEN
            audit_record_id := OLD.id;
        ELSE
            audit_record_id := NEW.id;
        END IF;

    ELSIF TG_TABLE_NAME = 'bims_users' THEN
        IF TG_OP = 'DELETE' THEN
            audit_record_id := OLD.id::TEXT;
        ELSE
            audit_record_id := NEW.id::TEXT;
        END IF;

    ELSIF TG_TABLE_NAME = 'eservice_users' THEN
        IF TG_OP = 'DELETE' THEN
            audit_record_id := OLD.id::TEXT;
        ELSE
            audit_record_id := NEW.id::TEXT;
        END IF;

    ELSE
        -- Fallback: use id if available, otherwise use a placeholder
        BEGIN
            IF TG_OP = 'DELETE' THEN
                audit_record_id := OLD.id::TEXT;
            ELSE
                audit_record_id := NEW.id::TEXT;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            audit_record_id := 'unknown';
        END;
    END IF;

    IF TG_OP = 'DELETE' THEN
        audit_old_values := to_jsonb(OLD);
    ELSIF TG_OP = 'INSERT' THEN
        audit_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        audit_old_values := to_jsonb(OLD);
        audit_new_values := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        barangay_id, table_name, operation, record_id,
        old_values, new_values, changed_by, changed_at
    ) VALUES (
        audit_barangay_id, TG_TABLE_NAME, TG_OP, audit_record_id,
        audit_old_values, audit_new_values, public.get_current_audit_user(), CURRENT_TIMESTAMP
    );

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;


-- ---------------------------------------------------------------------------
-- BIMS: audit log query helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_all_audit_logs(p_limit integer DEFAULT 100)
RETURNS TABLE(
    id integer, barangay_id integer, barangay_name character varying,
    table_name character varying, operation character varying,
    record_id text, old_values jsonb, new_values jsonb,
    changed_by integer, user_name character varying,
    changed_at timestamp without time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT al.id, al.barangay_id, b.barangay_name, al.table_name, al.operation,
           al.record_id, al.old_values, al.new_values, al.changed_by,
           u.full_name AS user_name, al.changed_at
    FROM public.audit_logs al
    LEFT JOIN public.bims_users u ON u.id = al.changed_by
    LEFT JOIN public.barangays b  ON b.id = al.barangay_id
    ORDER BY al.changed_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_barangay_audit_logs(p_barangay_id integer, p_limit integer DEFAULT 100)
RETURNS TABLE(
    id integer, table_name character varying, operation character varying,
    record_id text, old_values jsonb, new_values jsonb,
    changed_by integer, user_name character varying,
    changed_at timestamp without time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT al.id, al.table_name, al.operation, al.record_id,
           al.old_values, al.new_values, al.changed_by,
           u.full_name AS user_name, al.changed_at
    FROM public.audit_logs al
    LEFT JOIN public.bims_users u ON u.id = al.changed_by
    WHERE al.barangay_id = p_barangay_id
    ORDER BY al.changed_at DESC
    LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_record_audit_history(p_table_name character varying, p_record_id text)
RETURNS TABLE(
    id integer, operation character varying,
    old_values jsonb, new_values jsonb,
    changed_by integer, user_name character varying,
    changed_at timestamp without time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT al.id, al.operation, al.old_values, al.new_values,
           al.changed_by, u.full_name AS user_name, al.changed_at
    FROM public.audit_logs al
    LEFT JOIN public.bims_users u ON u.id = al.changed_by
    WHERE al.table_name = p_table_name AND al.record_id = p_record_id
    ORDER BY al.changed_at DESC;
END;
$$;


-- ---------------------------------------------------------------------------
-- api_keys: dedicated updated_at trigger function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_api_keys()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =============================================================================
-- BIMS TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Geographic / Administrative
-- ---------------------------------------------------------------------------

CREATE TABLE public.municipalities (
    id                       integer NOT NULL,
    municipality_name        character varying(100) NOT NULL,
    municipality_code        character varying(20)  NOT NULL,
    gis_code                 character varying(20),          -- links to gis_municipality.gis_municipality_code
    region                   character varying(50)  NOT NULL,
    province                 character varying(100) NOT NULL,
    description              text,                           -- nullable; optional admin description
    setup_status             character varying(20)  NOT NULL DEFAULT 'pending',
    -- pending | active
    -- ID card backgrounds (uploaded by municipality admin)
    municipality_logo_path   text,
    id_background_front_path text,
    id_background_back_path  text,
    created_at               timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at               timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT municipalities_setup_status_check CHECK (setup_status IN ('pending', 'active'))
);
CREATE SEQUENCE public.municipalities_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.municipalities_id_seq OWNED BY public.municipalities.id;
ALTER TABLE ONLY public.municipalities ALTER COLUMN id SET DEFAULT nextval('public.municipalities_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- Barangays — auto-created from GeoJSON during municipality setup.
-- Manual creation is no longer the primary flow.
-- UNIQUE constraint is now per-municipality (not global), since two municipalities
-- can legitimately share a barangay name (e.g. "Poblacion").
-- ---------------------------------------------------------------------------
CREATE TABLE public.barangays (
    id                          integer NOT NULL,
    municipality_id             integer NOT NULL,
    barangay_name               character varying(100) NOT NULL,
    barangay_code               character varying(20)  NOT NULL,  -- PSGC adm4_pcode
    gis_code                    character varying(20),             -- links to gis_barangay.gis_barangay_code
    -- Configurable by barangay admin after setup
    barangay_logo_path          text,
    certificate_background_path text,
    organizational_chart_path   text,
    contact_number              character varying(50),
    email                       character varying(100),
    created_at                  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at                  timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.barangays_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.barangays_id_seq OWNED BY public.barangays.id;
ALTER TABLE ONLY public.barangays ALTER COLUMN id SET DEFAULT nextval('public.barangays_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- GIS spatial tables (populated once via shapefile import; read-only at runtime)
-- ---------------------------------------------------------------------------
CREATE TABLE public.gis_municipality (
    id                    integer NOT NULL,
    name                  character varying(100),
    gis_municipality_code character varying(20),
    geom                  public.geometry(Geometry, 4326),
    shape_sqkm            numeric(23, 15)
);
CREATE SEQUENCE public.gis_municipality_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.gis_municipality_id_seq OWNED BY public.gis_municipality.id;
ALTER TABLE ONLY public.gis_municipality ALTER COLUMN id SET DEFAULT nextval('public.gis_municipality_id_seq'::regclass);


CREATE TABLE public.gis_barangay (
    id                    integer NOT NULL,
    name                  character varying(100),
    gis_barangay_code     character varying(20),
    gis_municipality_code character varying(20),
    geom                  public.geometry(Geometry, 4326),
    shape_sqkm            numeric(23, 15)
);
CREATE SEQUENCE public.gis_barangay_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.gis_barangay_id_seq OWNED BY public.gis_barangay.id;
ALTER TABLE ONLY public.gis_barangay ALTER COLUMN id SET DEFAULT nextval('public.gis_barangay_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- UNIFIED RESIDENTS TABLE
-- Single source of truth for all persons in the system.
--
-- Lifecycle:
--   1. Person self-registers via portal → status = 'pending', resident_id = NULL
--   2. BIMS admin reviews via registration_requests → approves
--   3. On approval: status = 'active', resident_id = generated (PREFIX-YEAR-NNNNNNN)
--
-- Portal auth: username + bcrypt password stored in resident_credentials (1:1).
--              Google OAuth also in resident_credentials.
--
-- Address = barangay_id (FK) + street_address (free text).
--           Full address resolved via:  street_address, barangay_name, municipality_name, province, region
-- ---------------------------------------------------------------------------
CREATE TABLE public.residents (
    -- Internal UUID primary key (stable across renames/status changes)
    id                       text NOT NULL DEFAULT gen_random_uuid()::text,

    -- Generated human-readable display ID (NULL until approved)
    -- Format: {PREFIX}-{YEAR}-{7-digit zero-padded counter}  e.g.  BIMS-2025-0000001
    resident_id              character varying(25),

    -- Unified address (barangay FK + free-text street)
    barangay_id              integer,                          -- FK → barangays(id); NULL while pending
    street_address           text,                             -- house no., lot, block, street

    -- Name
    last_name                character varying(100) NOT NULL,
    first_name               character varying(100) NOT NULL,
    middle_name              character varying(100),
    extension_name           character varying(20),            -- Jr., Sr., II, III

    -- Demographics
    sex                      character varying(10),
    civil_status             character varying(25),
    birthdate                date NOT NULL,
    -- Place of birth (replaces separate place_of_birth table)
    birth_region             text,
    birth_province           text,
    birth_municipality       text,
    citizenship              text,

    -- Contact
    contact_number           character varying(50),
    email                    character varying(100),

    -- Socio-economic
    occupation               text,
    profession               text,
    employment_status        character varying(20),
    education_attainment     character varying(30),
    monthly_income           numeric(10, 2),
    height                   text,
    weight                   text,

    -- Special flags
    is_voter                 boolean NOT NULL DEFAULT false,
    is_employed              boolean NOT NULL DEFAULT false,
    indigenous_person        boolean NOT NULL DEFAULT false,

    -- Government / Foreign ID
    id_type                  text,
    id_document_number       text,
    acr_no                   text,                             -- Alien Certificate of Registration

    -- Emergency contact
    emergency_contact_person character varying(100),
    emergency_contact_number character varying(50),

    -- Family info
    spouse_name              text,

    -- Files (relative paths in uploads/)
    picture_path             text,
    proof_of_identification  text,

    -- Status & approval
    status                   character varying(20) NOT NULL DEFAULT 'pending',
    application_remarks      text,                            -- admin notes for approval / rejection

    -- Portal login username (unique; set during registration; credentials stored in resident_credentials)
    username                 character varying(100),

    -- Timestamps
    created_at               timestamp without time zone DEFAULT now(),
    updated_at               timestamp without time zone DEFAULT now(),

    CONSTRAINT residents_sex_check             CHECK (lower(sex)              IN ('male', 'female')),
    CONSTRAINT residents_civil_status_check    CHECK (lower(civil_status)     IN ('single','married','widowed','separated','divorced','live_in','annulled')),
    CONSTRAINT residents_employment_status_check CHECK (lower(employment_status) IN ('employed','unemployed','self-employed','student','retired','not_applicable')),
    CONSTRAINT residents_status_check          CHECK (lower(status)           IN ('pending','active','inactive','rejected','deceased','moved_out'))
);


-- ---------------------------------------------------------------------------
-- RESIDENT CREDENTIALS — portal auth (1:1 with residents)
-- Keeping credentials separate from person data for clean separation of concerns.
-- ---------------------------------------------------------------------------
CREATE TABLE public.resident_credentials (
    id           text NOT NULL DEFAULT gen_random_uuid()::text,
    resident_fk  text NOT NULL,       -- FK → residents(id) ON DELETE CASCADE; UNIQUE (1:1)
    password     text,                -- bcrypt hashed; NULL if Google-only account
    google_id    text,                -- Google OAuth subject (sub)
    google_email text,                -- Google account email (informational)
    created_at   timestamp without time zone DEFAULT now(),
    updated_at   timestamp without time zone DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- REGISTRATION REQUESTS — approval workflow for portal self-registrations.
-- One row per resident (UNIQUE on resident_fk).
-- Reviewed by BIMS municipality or barangay admin.
-- ---------------------------------------------------------------------------
CREATE TABLE public.registration_requests (
    id           text NOT NULL DEFAULT gen_random_uuid()::text,
    resident_fk  text NOT NULL,       -- FK → residents(id) ON DELETE CASCADE; UNIQUE
    status       character varying(30) NOT NULL DEFAULT 'pending',
    -- pending | under_review | approved | rejected | requires_resubmission
    selfie_url   text,                -- photo with ID taken at registration time
    admin_notes  text,                -- reviewer's comments shown to applicant
    reviewed_by  integer,             -- FK → bims_users(id) ON DELETE SET NULL
    reviewed_at  timestamp without time zone,
    created_at   timestamp without time zone DEFAULT now(),
    updated_at   timestamp without time zone DEFAULT now(),
    CONSTRAINT registration_requests_status_check
        CHECK (status IN ('pending','under_review','approved','rejected','requires_resubmission'))
);


-- ---------------------------------------------------------------------------
-- RESIDENT COUNTERS — per-municipality, per-year ID generation counter
-- ---------------------------------------------------------------------------
CREATE TABLE public.resident_counters (
    id              integer NOT NULL,
    municipality_id integer NOT NULL,       -- FK → municipalities(id) ON DELETE CASCADE
    year            integer NOT NULL,
    counter         integer NOT NULL DEFAULT 0,
    prefix          character varying(10) NOT NULL DEFAULT 'RES',  -- configurable: BIMS, ESR, etc.
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.resident_counters_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.resident_counters_id_seq OWNED BY public.resident_counters.id;
ALTER TABLE ONLY public.resident_counters ALTER COLUMN id SET DEFAULT nextval('public.resident_counters_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- RESIDENT CLASSIFICATIONS — flexible tags per resident (PWD, senior, 4Ps, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE public.resident_classifications (
    id                     integer NOT NULL,
    resident_id            text,                   -- FK → residents(id) ON DELETE CASCADE
    classification_type    character varying(50) NOT NULL,
    classification_details jsonb DEFAULT '[]'::jsonb
);
CREATE SEQUENCE public.resident_classifications_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.resident_classifications_id_seq OWNED BY public.resident_classifications.id;
ALTER TABLE ONLY public.resident_classifications ALTER COLUMN id SET DEFAULT nextval('public.resident_classifications_id_seq'::regclass);


CREATE TABLE public.classification_types (
    id              integer NOT NULL,
    municipality_id integer NOT NULL,
    name            character varying(100) NOT NULL,
    description     text,
    color           character varying(7) DEFAULT '#4CAF50'::character varying,
    details         jsonb DEFAULT '[]'::jsonb,
    is_active       boolean DEFAULT true,
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.classification_types_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.classification_types_id_seq OWNED BY public.classification_types.id;
ALTER TABLE ONLY public.classification_types ALTER COLUMN id SET DEFAULT nextval('public.classification_types_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- HOUSEHOLDS — self-registered by residents via portal.
-- No purok_id (puroks removed). house_head references residents.id (UUID/text).
-- Members added by entering a resident's resident_id; stored via families/family_members.
-- ---------------------------------------------------------------------------
CREATE TABLE public.households (
    id                   integer NOT NULL,
    house_number         character varying(20),
    street               text,
    barangay_id          integer NOT NULL,           -- FK → barangays(id)
    house_head           text NOT NULL,              -- FK → residents(id) ON DELETE CASCADE
    housing_type         character varying(30),
    structure_type       character varying(30),
    electricity          boolean DEFAULT false,
    water_source         character varying(30),
    toilet_facility      character varying(30),
    geom                 public.geometry(Geometry, 4326),
    area                 numeric(10, 2),
    household_image_path text,
    created_at           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at           timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.households_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.households_id_seq OWNED BY public.households.id;
ALTER TABLE ONLY public.households ALTER COLUMN id SET DEFAULT nextval('public.households_id_seq'::regclass);


CREATE TABLE public.families (
    id           integer NOT NULL,
    household_id integer NOT NULL,               -- FK → households(id) ON DELETE CASCADE
    family_group character varying(50) NOT NULL,
    family_head  text NOT NULL,                  -- FK → residents(id) ON DELETE CASCADE
    created_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.families_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.families_id_seq OWNED BY public.families.id;
ALTER TABLE ONLY public.families ALTER COLUMN id SET DEFAULT nextval('public.families_id_seq'::regclass);


CREATE TABLE public.family_members (
    id                   integer NOT NULL,
    family_id            integer NOT NULL,           -- FK → families(id) ON DELETE CASCADE
    family_member        text NOT NULL,              -- FK → residents(id) ON DELETE CASCADE
    relationship_to_head character varying(50),
    created_at           timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at           timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.family_members_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.family_members_id_seq OWNED BY public.family_members.id;
ALTER TABLE ONLY public.family_members ALTER COLUMN id SET DEFAULT nextval('public.family_members_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- OFFICIALS / REQUESTS / INVENTORY / ARCHIVES
-- ---------------------------------------------------------------------------

CREATE TABLE public.officials (
    id               integer NOT NULL,
    barangay_id      integer NOT NULL,
    resident_id      text NOT NULL,             -- FK → residents(id) ON DELETE CASCADE
    position         character varying(100) NOT NULL,
    committee        character varying(50),
    term_start       date NOT NULL,
    term_end         date,
    responsibilities text,
    created_at       timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.officials_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.officials_id_seq OWNED BY public.officials.id;
ALTER TABLE ONLY public.officials ALTER COLUMN id SET DEFAULT nextval('public.officials_id_seq'::regclass);


CREATE TABLE public.requests (
    id               integer NOT NULL,
    resident_id      text,                       -- FK → residents(id) ON DELETE SET NULL; nullable for walk-ins
    full_name        character varying(200),     -- for walk-in requests without a resident account
    contact_number   character varying(50),
    email            character varying(50),
    address          text,                       -- free-text address for walk-in requests
    barangay_id      integer NOT NULL,
    type             character varying(50) NOT NULL,
    status           character varying(50) NOT NULL DEFAULT 'pending',
    certificate_type character varying(100),
    urgency          character varying(50) DEFAULT 'normal',
    purpose          text NOT NULL,
    requirements     jsonb,
    appointment_with character varying(255),
    appointment_date date,
    notes            text,
    uuid             uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT requests_type_check    CHECK (type    IN ('certificate', 'appointment')),
    CONSTRAINT requests_status_check  CHECK (status  IN ('pending', 'approved', 'rejected', 'completed')),
    CONSTRAINT requests_urgency_check CHECK (urgency IN ('normal', 'urgent', 'express'))
);
CREATE SEQUENCE public.requests_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.requests_id_seq OWNED BY public.requests.id;
ALTER TABLE ONLY public.requests ALTER COLUMN id SET DEFAULT nextval('public.requests_id_seq'::regclass);


CREATE TABLE public.inventories (
    id          integer NOT NULL,
    barangay_id integer NOT NULL,
    item_name   character varying(255) NOT NULL,
    item_type   character varying(50)  NOT NULL,
    description text NOT NULL,
    sponsors    character varying(50),
    quantity    integer DEFAULT 0 NOT NULL,
    unit        character varying(20),
    file_path   text,
    created_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.inventories_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.inventories_id_seq OWNED BY public.inventories.id;
ALTER TABLE ONLY public.inventories ALTER COLUMN id SET DEFAULT nextval('public.inventories_id_seq'::regclass);


CREATE TABLE public.archives (
    id              integer NOT NULL,
    barangay_id     integer NOT NULL,
    title           character varying(255) NOT NULL,
    document_type   character varying(50),
    description     text NOT NULL,
    author          character varying(50),
    signatory       character varying(50),
    relate_resident text,           -- soft link to residents.id (no FK enforced; resident may be deleted)
    file_path       text,
    created_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at      timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.archives_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.archives_id_seq OWNED BY public.archives.id;
ALTER TABLE ONLY public.archives ALTER COLUMN id SET DEFAULT nextval('public.archives_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- HEALTH / PETS
-- ---------------------------------------------------------------------------

CREATE TABLE public.pets (
    id           integer NOT NULL,
    uuid         uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id     text NOT NULL,                 -- FK → residents(id) ON DELETE CASCADE
    pet_name     character varying(50)  NOT NULL,
    species      character varying(50)  NOT NULL,
    breed        character varying(50)  NOT NULL,
    sex          character varying(10)  NOT NULL,
    birthdate    date NOT NULL,
    color        character varying(20)  NOT NULL,
    picture_path text,
    description  text,
    created_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at   timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pets_sex_check CHECK (lower(sex) IN ('male', 'female'))
);
CREATE SEQUENCE public.pets_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.pets_id_seq OWNED BY public.pets.id;
ALTER TABLE ONLY public.pets ALTER COLUMN id SET DEFAULT nextval('public.pets_id_seq'::regclass);


CREATE TABLE public.vaccines (
    id                  integer NOT NULL,
    target_type         character varying(10) NOT NULL,
    target_id           text NOT NULL,             -- residents.id or pets.id (text)
    vaccine_name        character varying(100) NOT NULL,
    vaccine_type        character varying(100),
    vaccine_description text,
    vaccination_date    date NOT NULL,
    created_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at          timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vaccines_target_type_check CHECK (target_type IN ('pet', 'resident'))
);
CREATE SEQUENCE public.vaccines_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.vaccines_id_seq OWNED BY public.vaccines.id;
ALTER TABLE ONLY public.vaccines ALTER COLUMN id SET DEFAULT nextval('public.vaccines_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- BIMS AUTH (staff accounts — municipality admins and barangay staff)
-- ---------------------------------------------------------------------------
CREATE TABLE public.bims_users (
    id                    integer NOT NULL,
    target_type           character varying(15) NOT NULL,  -- 'municipality' | 'barangay'
    target_id             character varying(20) NOT NULL,  -- integer ID of the municipality/barangay
    full_name             character varying(100) NOT NULL,
    email                 character varying(100) NOT NULL,
    password              text NOT NULL,
    role                  character varying(20) NOT NULL,  -- 'admin' | 'staff'
    picture_path          text,
    last_login            timestamp without time zone,
    failed_login_attempts integer DEFAULT 0,
    is_active             boolean DEFAULT true,
    reset_token           text,
    reset_token_expiry    timestamp without time zone,
    created_at            timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bims_users_role_check        CHECK (role        IN ('admin', 'staff')),
    CONSTRAINT bims_users_target_type_check CHECK (target_type IN ('municipality', 'barangay'))
);
CREATE SEQUENCE public.bims_users_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.bims_users_id_seq OWNED BY public.bims_users.id;
ALTER TABLE ONLY public.bims_users ALTER COLUMN id SET DEFAULT nextval('public.bims_users_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- BIMS API KEYS (for third-party / Open API access)
-- ---------------------------------------------------------------------------
CREATE TABLE public.api_keys (
    id                    integer NOT NULL,
    key                   text    NOT NULL,
    name                  character varying(100) NOT NULL,
    municipality_id       integer NOT NULL,
    scopes                text[]  NOT NULL DEFAULT ARRAY['read']::text[],
    rate_limit_per_minute integer DEFAULT 60,
    expires_at            timestamp without time zone,
    revoked               boolean DEFAULT false,
    created_by_user_id    integer NOT NULL,
    last_used_at          timestamp without time zone,
    created_at            timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at            timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.api_keys_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;
ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


-- ---------------------------------------------------------------------------
-- BIMS AUDIT LOGS
-- record_id is text to accommodate both UUID (new residents) and integer IDs.
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id          integer NOT NULL,
    barangay_id integer,
    table_name  character varying(50) NOT NULL,
    operation   character varying(10) NOT NULL,
    record_id   text NOT NULL,
    old_values  jsonb,
    new_values  jsonb,
    changed_by  integer,     -- references bims_users(id)
    changed_at  timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE public.audit_logs_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;
ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


-- =============================================================================
-- E-SERVICES TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- E-Services Auth (portal admin accounts — separate from BIMS staff)
-- ---------------------------------------------------------------------------
CREATE TABLE public.eservice_users (
    id         text NOT NULL DEFAULT gen_random_uuid()::text,
    email      text NOT NULL,
    password   text NOT NULL,
    name       text NOT NULL,
    role       text NOT NULL DEFAULT 'admin',
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


CREATE TABLE public.roles (
    id          text NOT NULL DEFAULT gen_random_uuid()::text,
    name        text NOT NULL,
    description text,
    created_at  timestamp without time zone DEFAULT now(),
    updated_at  timestamp without time zone DEFAULT now()
);


CREATE TABLE public.permissions (
    id         text NOT NULL DEFAULT gen_random_uuid()::text,
    resource   text NOT NULL,
    action     public.permission_action NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


CREATE TABLE public.role_permissions (
    id            text NOT NULL DEFAULT gen_random_uuid()::text,
    role_id       text NOT NULL,
    permission_id text NOT NULL,
    created_at    timestamp without time zone DEFAULT now()
);


CREATE TABLE public.user_roles (
    id         text NOT NULL DEFAULT gen_random_uuid()::text,
    user_id    text NOT NULL,
    role_id    text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- Session / Token tables
-- subscriber_id renamed to resident_id (residents are the portal users now)
-- ---------------------------------------------------------------------------
CREATE TABLE public.refresh_tokens (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    user_id        text,          -- FK → eservice_users(id); for admin portal tokens
    resident_id    text,          -- FK → residents(id);      for portal resident tokens
    token          text NOT NULL,
    device_info    text,
    ip_address     text,
    user_agent     text,
    expires_at     timestamp without time zone NOT NULL,
    revoked_at     timestamp without time zone,
    revoked_reason text,
    created_at     timestamp without time zone DEFAULT now(),
    updated_at     timestamp without time zone DEFAULT now()
);


CREATE TABLE public.sessions (
    id               text NOT NULL DEFAULT gen_random_uuid()::text,
    user_id          text,          -- FK → eservice_users(id)
    resident_id      text,          -- FK → residents(id)
    refresh_token_id text NOT NULL,
    ip_address       text,
    user_agent       text,
    device_info      text,
    last_activity_at timestamp without time zone DEFAULT now(),
    created_at       timestamp without time zone DEFAULT now(),
    expires_at       timestamp without time zone NOT NULL
);


-- ---------------------------------------------------------------------------
-- Services / E-Services catalog
-- ---------------------------------------------------------------------------
CREATE TABLE public.services (
    id                         text NOT NULL DEFAULT gen_random_uuid()::text,
    code                       text NOT NULL,
    name                       text NOT NULL,
    description                text,
    category                   text,
    icon                       text,
    "order"                    integer NOT NULL DEFAULT 0,
    is_active                  boolean NOT NULL DEFAULT true,
    requires_payment           boolean NOT NULL DEFAULT true,
    default_amount             numeric(65, 30),
    payment_statuses           jsonb,
    form_fields                jsonb,
    display_in_sidebar         boolean NOT NULL DEFAULT true,
    display_in_subscriber_tabs boolean NOT NULL DEFAULT true,
    appointment_duration       integer,
    requires_appointment       boolean NOT NULL DEFAULT false,
    created_at                 timestamp without time zone DEFAULT now(),
    updated_at                 timestamp without time zone DEFAULT now()
);


-- eservices table removed (AC1) — functionality consolidated into services table
-- ---------------------------------------------------------------------------
-- Transactions
-- subscriber_id → resident_id
-- is_resident_of_borongan → is_local_resident  (removes hardcoded city name)
-- ---------------------------------------------------------------------------
CREATE TABLE public.transactions (
    id                               text NOT NULL DEFAULT gen_random_uuid()::text,
    -- Resident (nullable — NULL for guest/non-resident applicants)
    resident_id                      text,             -- FK → residents(id) ON DELETE SET NULL
    -- Guest applicant fields (used when resident_id IS NULL)
    applicant_name                   text,             -- full name for non-resident applicants
    applicant_contact                text,             -- contact number
    applicant_email                  text,             -- email for status notifications
    applicant_address                text,             -- free-text address
    transaction_id                   text NOT NULL,
    reference_number                 text NOT NULL,
    payment_status                   text NOT NULL DEFAULT 'PENDING',
    payment_amount                   numeric(65, 30) NOT NULL DEFAULT 0,
    transmital_no                    text,
    reference_number_generated_at    timestamp without time zone,
    is_local_resident                boolean NOT NULL DEFAULT false,  -- resident of this municipality?
    permit_type                      text,
    status                           text,
    is_posted                        boolean NOT NULL DEFAULT false,
    valid_id_to_present              text,
    remarks                          text,
    service_id                       text NOT NULL,
    service_data                     jsonb,
    application_date                 timestamp without time zone,
    preferred_appointment_date       timestamp without time zone,
    scheduled_appointment_date       timestamp without time zone,
    appointment_status               public.appointment_status DEFAULT 'PENDING',
    update_request_status            public.update_request_status NOT NULL DEFAULT 'NONE',
    update_request_description       text,
    update_requested_by              public.update_requested_by,
    pending_service_data             jsonb,
    admin_update_request_description text,
    created_at                       timestamp without time zone DEFAULT now(),
    updated_at                       timestamp without time zone DEFAULT now(),
    -- Either a resident account or guest info must be present
    CONSTRAINT chk_transaction_applicant
        CHECK (resident_id IS NOT NULL OR applicant_name IS NOT NULL)
);


CREATE TABLE public.transaction_notes (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    transaction_id text NOT NULL,
    message        text NOT NULL,
    sender_type    public.transaction_note_sender_type NOT NULL,
    sender_id      text NOT NULL,
    is_internal    boolean NOT NULL DEFAULT false,
    is_read        boolean NOT NULL DEFAULT false,
    created_at     timestamp without time zone DEFAULT now(),
    updated_at     timestamp without time zone DEFAULT now()
);


CREATE TABLE public.appointment_notes (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    transaction_id text NOT NULL,
    type           public.appointment_note_type NOT NULL,
    note           text NOT NULL,
    created_by     text,
    created_at     timestamp without time zone DEFAULT now(),
    updated_at     timestamp without time zone DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- Tax & Payments
-- ---------------------------------------------------------------------------
CREATE TABLE public.tax_profiles (
    id         text NOT NULL DEFAULT gen_random_uuid()::text,
    service_id text NOT NULL,
    name       text NOT NULL,
    variant    text,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


CREATE TABLE public.tax_profile_versions (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    tax_profile_id text NOT NULL,
    version        text NOT NULL,
    effective_from timestamp without time zone NOT NULL,
    effective_to   timestamp without time zone,
    status         public.tax_version_status NOT NULL DEFAULT 'DRAFT',
    change_reason  text NOT NULL,
    configuration  jsonb NOT NULL,
    created_by     text NOT NULL,
    created_at     timestamp without time zone DEFAULT now()
);


CREATE TABLE public.tax_computations (
    id                     text NOT NULL DEFAULT gen_random_uuid()::text,
    transaction_id         text NOT NULL,
    tax_profile_version_id text NOT NULL,
    is_active              boolean NOT NULL DEFAULT true,
    inputs                 jsonb NOT NULL,
    derived_values         jsonb NOT NULL,
    breakdown              jsonb NOT NULL,
    total_tax              numeric(65, 30) NOT NULL,
    adjusted_tax           numeric(65, 30),
    is_reassessment        boolean NOT NULL DEFAULT false,
    reassessment_reason    text,
    previous_computation_id text,
    difference_amount      numeric(65, 30),
    exemptions_applied     jsonb,
    discounts_applied      jsonb,
    penalties_applied      jsonb,
    computed_at            timestamp without time zone DEFAULT now(),
    computed_by            text
);


CREATE TABLE public.exemptions (
    id                   text NOT NULL DEFAULT gen_random_uuid()::text,
    transaction_id       text NOT NULL,
    tax_computation_id   text,
    exemption_type       public.exemption_type NOT NULL,
    status               public.exemption_status NOT NULL DEFAULT 'PENDING',
    requested_by         text NOT NULL,     -- residents.id of the applicant
    approved_by          text,              -- eservice_users.id of the approver
    request_reason       text NOT NULL,
    rejection_reason     text,
    supporting_documents jsonb,
    exemption_amount     numeric(65, 30),
    approved_at          timestamp without time zone,
    rejected_at          timestamp without time zone,
    created_at           timestamp without time zone DEFAULT now(),
    updated_at           timestamp without time zone DEFAULT now()
);


CREATE TABLE public.payments (
    id                 text NOT NULL DEFAULT gen_random_uuid()::text,
    transaction_id     text NOT NULL,
    tax_computation_id text NOT NULL,
    amount             numeric(65, 30) NOT NULL,
    payment_method     public.payment_method NOT NULL,
    payment_date       timestamp without time zone DEFAULT now(),
    received_by        text NOT NULL,       -- eservice_users.id
    reference_number   text,
    notes              text,
    created_at         timestamp without time zone DEFAULT now(),
    updated_at         timestamp without time zone DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- Social Amelioration / Beneficiaries
-- citizen_id renamed to resident_id throughout
-- ---------------------------------------------------------------------------
CREATE TABLE public.social_amelioration_settings (
    id          text NOT NULL DEFAULT gen_random_uuid()::text,
    type        public.social_amelioration_setting_type NOT NULL,
    name        text NOT NULL,
    description text,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamp without time zone DEFAULT now(),
    updated_at  timestamp without time zone DEFAULT now()
);


CREATE TABLE public.senior_citizen_beneficiaries (
    id                text NOT NULL DEFAULT gen_random_uuid()::text,
    resident_id       text NOT NULL,         -- FK → residents(id) ON DELETE CASCADE
    senior_citizen_id text NOT NULL,         -- OSCA-issued ID
    status            public.beneficiary_status NOT NULL DEFAULT 'ACTIVE',
    remarks           text,
    created_at        timestamp without time zone DEFAULT now(),
    updated_at        timestamp without time zone DEFAULT now()
);


CREATE TABLE public.senior_citizen_pension_type_pivots (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    beneficiary_id text NOT NULL,
    setting_id     text NOT NULL
);


CREATE TABLE public.pwd_beneficiaries (
    id                 text NOT NULL DEFAULT gen_random_uuid()::text,
    resident_id        text NOT NULL,         -- FK → residents(id) ON DELETE CASCADE
    pwd_id             text NOT NULL,
    disability_level   text NOT NULL,
    disability_type_id text NOT NULL,
    monetary_allowance boolean NOT NULL DEFAULT false,
    assisted_device    boolean NOT NULL DEFAULT false,
    donor_device       text,
    status             public.beneficiary_status NOT NULL DEFAULT 'ACTIVE',
    remarks            text,
    created_at         timestamp without time zone DEFAULT now(),
    updated_at         timestamp without time zone DEFAULT now()
);


CREATE TABLE public.student_beneficiaries (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    resident_id    text NOT NULL,             -- FK → residents(id) ON DELETE CASCADE
    student_id     text NOT NULL,
    grade_level_id text NOT NULL,
    status         public.beneficiary_status NOT NULL DEFAULT 'ACTIVE',
    remarks        text,
    created_at     timestamp without time zone DEFAULT now(),
    updated_at     timestamp without time zone DEFAULT now()
);


CREATE TABLE public.solo_parent_beneficiaries (
    id             text NOT NULL DEFAULT gen_random_uuid()::text,
    resident_id    text NOT NULL,             -- FK → residents(id) ON DELETE CASCADE
    solo_parent_id text NOT NULL,
    category_id    text NOT NULL,
    status         public.beneficiary_status NOT NULL DEFAULT 'ACTIVE',
    remarks        text,
    created_at     timestamp without time zone DEFAULT now(),
    updated_at     timestamp without time zone DEFAULT now()
);


CREATE TABLE public.government_programs (
    id          text NOT NULL DEFAULT gen_random_uuid()::text,
    name        text NOT NULL,
    description text,
    type        public.government_program_type NOT NULL,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamp without time zone DEFAULT now(),
    updated_at  timestamp without time zone DEFAULT now()
);


CREATE TABLE public.beneficiary_program_pivots (
    id               text NOT NULL DEFAULT gen_random_uuid()::text,
    beneficiary_type public.beneficiary_type NOT NULL,
    beneficiary_id   text NOT NULL,
    program_id       text NOT NULL,
    created_at       timestamp without time zone DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- Utility / Content
-- ---------------------------------------------------------------------------
CREATE TABLE public.faqs (
    id         text NOT NULL DEFAULT gen_random_uuid()::text,
    question   text NOT NULL,
    answer     text NOT NULL,
    "order"    integer NOT NULL DEFAULT 0,
    is_active  boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


-- =============================================================================
-- PRIMARY KEY CONSTRAINTS
-- =============================================================================

-- BIMS
ALTER TABLE ONLY public.municipalities          ADD CONSTRAINT municipalities_pkey          PRIMARY KEY (id);
ALTER TABLE ONLY public.barangays               ADD CONSTRAINT barangays_pkey               PRIMARY KEY (id);
ALTER TABLE ONLY public.gis_municipality        ADD CONSTRAINT gis_municipality_pkey        PRIMARY KEY (id);
ALTER TABLE ONLY public.gis_barangay            ADD CONSTRAINT gis_barangay_pkey            PRIMARY KEY (id);
ALTER TABLE ONLY public.residents               ADD CONSTRAINT residents_pkey               PRIMARY KEY (id);
ALTER TABLE ONLY public.resident_credentials    ADD CONSTRAINT resident_credentials_pkey    PRIMARY KEY (id);
ALTER TABLE ONLY public.registration_requests   ADD CONSTRAINT registration_requests_pkey   PRIMARY KEY (id);
ALTER TABLE ONLY public.resident_counters       ADD CONSTRAINT resident_counters_pkey       PRIMARY KEY (id);
ALTER TABLE ONLY public.resident_classifications ADD CONSTRAINT resident_classifications_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.classification_types    ADD CONSTRAINT classification_types_pkey    PRIMARY KEY (id);
ALTER TABLE ONLY public.households              ADD CONSTRAINT households_pkey              PRIMARY KEY (id);
ALTER TABLE ONLY public.families                ADD CONSTRAINT families_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.family_members          ADD CONSTRAINT family_members_pkey          PRIMARY KEY (id);
ALTER TABLE ONLY public.officials               ADD CONSTRAINT officials_pkey               PRIMARY KEY (id);
ALTER TABLE ONLY public.requests                ADD CONSTRAINT requests_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.inventories             ADD CONSTRAINT inventories_pkey             PRIMARY KEY (id);
ALTER TABLE ONLY public.archives                ADD CONSTRAINT archives_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.pets                    ADD CONSTRAINT pets_pkey                    PRIMARY KEY (id);
ALTER TABLE ONLY public.vaccines                ADD CONSTRAINT vaccines_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.bims_users              ADD CONSTRAINT bims_users_pkey              PRIMARY KEY (id);
ALTER TABLE ONLY public.api_keys                ADD CONSTRAINT api_keys_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_logs              ADD CONSTRAINT audit_logs_pkey              PRIMARY KEY (id);

-- E-Services
ALTER TABLE ONLY public.eservice_users          ADD CONSTRAINT eservice_users_pkey          PRIMARY KEY (id);
ALTER TABLE ONLY public.roles                   ADD CONSTRAINT roles_pkey                   PRIMARY KEY (id);
ALTER TABLE ONLY public.permissions             ADD CONSTRAINT permissions_pkey             PRIMARY KEY (id);
ALTER TABLE ONLY public.role_permissions        ADD CONSTRAINT role_permissions_pkey        PRIMARY KEY (id);
ALTER TABLE ONLY public.user_roles              ADD CONSTRAINT user_roles_pkey              PRIMARY KEY (id);
ALTER TABLE ONLY public.refresh_tokens          ADD CONSTRAINT refresh_tokens_pkey          PRIMARY KEY (id);
ALTER TABLE ONLY public.sessions                ADD CONSTRAINT sessions_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.services                ADD CONSTRAINT services_pkey                PRIMARY KEY (id);
-- eservices_pkey removed (table dropped)
ALTER TABLE ONLY public.transactions            ADD CONSTRAINT transactions_pkey            PRIMARY KEY (id);
ALTER TABLE ONLY public.transaction_notes       ADD CONSTRAINT transaction_notes_pkey       PRIMARY KEY (id);
ALTER TABLE ONLY public.appointment_notes       ADD CONSTRAINT appointment_notes_pkey       PRIMARY KEY (id);
ALTER TABLE ONLY public.tax_profiles            ADD CONSTRAINT tax_profiles_pkey            PRIMARY KEY (id);
ALTER TABLE ONLY public.tax_profile_versions    ADD CONSTRAINT tax_profile_versions_pkey    PRIMARY KEY (id);
ALTER TABLE ONLY public.tax_computations        ADD CONSTRAINT tax_computations_pkey        PRIMARY KEY (id);
ALTER TABLE ONLY public.exemptions              ADD CONSTRAINT exemptions_pkey              PRIMARY KEY (id);
ALTER TABLE ONLY public.payments                ADD CONSTRAINT payments_pkey                PRIMARY KEY (id);
ALTER TABLE ONLY public.social_amelioration_settings ADD CONSTRAINT social_amelioration_settings_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.senior_citizen_beneficiaries ADD CONSTRAINT senior_citizen_beneficiaries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.senior_citizen_pension_type_pivots ADD CONSTRAINT senior_citizen_pension_type_pivots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.pwd_beneficiaries       ADD CONSTRAINT pwd_beneficiaries_pkey       PRIMARY KEY (id);
ALTER TABLE ONLY public.student_beneficiaries   ADD CONSTRAINT student_beneficiaries_pkey   PRIMARY KEY (id);
ALTER TABLE ONLY public.solo_parent_beneficiaries ADD CONSTRAINT solo_parent_beneficiaries_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.government_programs     ADD CONSTRAINT government_programs_pkey     PRIMARY KEY (id);
ALTER TABLE ONLY public.beneficiary_program_pivots ADD CONSTRAINT beneficiary_program_pivots_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.faqs                    ADD CONSTRAINT faqs_pkey                    PRIMARY KEY (id);


-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================

-- Municipalities / Barangays
ALTER TABLE ONLY public.municipalities          ADD CONSTRAINT municipalities_name_key      UNIQUE (municipality_name);
-- Barangay uniqueness is now per-municipality (two different municipalities may share a barangay name)
ALTER TABLE ONLY public.barangays               ADD CONSTRAINT barangays_name_per_muni_key  UNIQUE (municipality_id, barangay_name);

-- Residents
ALTER TABLE ONLY public.residents               ADD CONSTRAINT residents_resident_id_key    UNIQUE (resident_id);
ALTER TABLE ONLY public.residents               ADD CONSTRAINT residents_username_key       UNIQUE (username);

-- Resident credentials
ALTER TABLE ONLY public.resident_credentials    ADD CONSTRAINT resident_credentials_resident_fk_key UNIQUE (resident_fk);
ALTER TABLE ONLY public.resident_credentials    ADD CONSTRAINT resident_credentials_google_id_key   UNIQUE (google_id);

-- Registration requests (one per resident)
ALTER TABLE ONLY public.registration_requests   ADD CONSTRAINT registration_requests_resident_fk_key UNIQUE (resident_fk);

-- Resident counters (one per municipality per year)
ALTER TABLE ONLY public.resident_counters       ADD CONSTRAINT resident_counters_muni_year_key UNIQUE (municipality_id, year);

-- Classification types (unique name per municipality)
ALTER TABLE ONLY public.classification_types    ADD CONSTRAINT classification_types_muni_name_key UNIQUE (municipality_id, name);

-- Requests (public tracking UUID)
ALTER TABLE ONLY public.requests                ADD CONSTRAINT requests_uuid_key            UNIQUE (uuid);

-- Pets
ALTER TABLE ONLY public.pets                    ADD CONSTRAINT pets_uuid_key                UNIQUE (uuid);

-- BIMS users
ALTER TABLE ONLY public.bims_users              ADD CONSTRAINT bims_users_email_key         UNIQUE (email);
ALTER TABLE ONLY public.api_keys                ADD CONSTRAINT api_keys_key_unique          UNIQUE (key);

-- E-Services
ALTER TABLE ONLY public.eservice_users          ADD CONSTRAINT eservice_users_email_key     UNIQUE (email);
ALTER TABLE ONLY public.roles                   ADD CONSTRAINT roles_name_key               UNIQUE (name);
ALTER TABLE ONLY public.permissions             ADD CONSTRAINT permissions_resource_action_key UNIQUE (resource, action);
ALTER TABLE ONLY public.role_permissions        ADD CONSTRAINT role_permissions_role_permission_key UNIQUE (role_id, permission_id);
ALTER TABLE ONLY public.user_roles              ADD CONSTRAINT user_roles_user_role_key     UNIQUE (user_id, role_id);
ALTER TABLE ONLY public.services                ADD CONSTRAINT services_code_key            UNIQUE (code);
-- eservices_code_key removed (table dropped)
ALTER TABLE ONLY public.transactions            ADD CONSTRAINT transactions_transaction_id_key  UNIQUE (transaction_id);
ALTER TABLE ONLY public.transactions            ADD CONSTRAINT transactions_reference_number_key UNIQUE (reference_number);
ALTER TABLE ONLY public.tax_profile_versions    ADD CONSTRAINT tax_profile_versions_profile_version_key UNIQUE (tax_profile_id, version);
ALTER TABLE ONLY public.senior_citizen_beneficiaries ADD CONSTRAINT scb_resident_id_key        UNIQUE (resident_id);
ALTER TABLE ONLY public.senior_citizen_beneficiaries ADD CONSTRAINT scb_senior_citizen_id_key  UNIQUE (senior_citizen_id);
ALTER TABLE ONLY public.senior_citizen_pension_type_pivots ADD CONSTRAINT scptp_beneficiary_setting_key UNIQUE (beneficiary_id, setting_id);
ALTER TABLE ONLY public.pwd_beneficiaries       ADD CONSTRAINT pwd_resident_id_key          UNIQUE (resident_id);
ALTER TABLE ONLY public.pwd_beneficiaries       ADD CONSTRAINT pwd_pwd_id_key               UNIQUE (pwd_id);
ALTER TABLE ONLY public.student_beneficiaries   ADD CONSTRAINT student_resident_id_key      UNIQUE (resident_id);
ALTER TABLE ONLY public.student_beneficiaries   ADD CONSTRAINT student_student_id_key       UNIQUE (student_id);
ALTER TABLE ONLY public.solo_parent_beneficiaries ADD CONSTRAINT sp_resident_id_key         UNIQUE (resident_id);
ALTER TABLE ONLY public.solo_parent_beneficiaries ADD CONSTRAINT sp_solo_parent_id_key      UNIQUE (solo_parent_id);
ALTER TABLE ONLY public.beneficiary_program_pivots ADD CONSTRAINT bpp_type_id_program_key   UNIQUE (beneficiary_type, beneficiary_id, program_id);


-- =============================================================================
-- INDEXES
-- =============================================================================

-- municipalities
CREATE INDEX idx_municipalities_code         ON public.municipalities     USING btree (municipality_code);
CREATE INDEX idx_municipalities_gis_code     ON public.municipalities     USING btree (gis_code);
CREATE INDEX idx_municipalities_province     ON public.municipalities     USING btree (province);
CREATE INDEX idx_municipalities_region       ON public.municipalities     USING btree (region);
CREATE INDEX idx_municipalities_setup_status ON public.municipalities     USING btree (setup_status);

-- barangays
CREATE INDEX idx_barangays_code              ON public.barangays          USING btree (barangay_code);
CREATE INDEX idx_barangays_gis_code          ON public.barangays          USING btree (gis_code);
CREATE INDEX idx_barangays_municipality      ON public.barangays          USING btree (municipality_id);

-- gis
CREATE INDEX idx_gis_barangay_code           ON public.gis_barangay       USING btree (gis_barangay_code);
CREATE INDEX idx_gis_barangay_muni_code      ON public.gis_barangay       USING btree (gis_municipality_code);
CREATE INDEX idx_gis_barangay_geom           ON public.gis_barangay       USING gist (geom);
CREATE INDEX idx_gis_barangay_codes          ON public.gis_barangay       USING btree (gis_barangay_code, gis_municipality_code);
CREATE INDEX idx_gis_municipality_code       ON public.gis_municipality   USING btree (gis_municipality_code);
CREATE INDEX idx_gis_municipality_geom       ON public.gis_municipality   USING gist (geom);

-- residents
CREATE INDEX idx_residents_barangay          ON public.residents          USING btree (barangay_id);
CREATE INDEX idx_residents_resident_id       ON public.residents          USING btree (resident_id);
CREATE INDEX idx_residents_status            ON public.residents          USING btree (status);
CREATE INDEX idx_residents_birthdate         ON public.residents          USING btree (birthdate);
CREATE INDEX idx_residents_last_name         ON public.residents          USING btree (last_name);
CREATE INDEX idx_residents_first_name        ON public.residents          USING btree (first_name);
CREATE INDEX idx_residents_username          ON public.residents          USING btree (username);
CREATE INDEX idx_residents_email             ON public.residents          USING btree (email) WHERE (email IS NOT NULL);
CREATE INDEX idx_residents_contact           ON public.residents          USING btree (contact_number) WHERE (contact_number IS NOT NULL);
CREATE INDEX idx_residents_search            ON public.residents          USING btree (barangay_id, status, last_name, first_name);
CREATE INDEX idx_residents_full_text         ON public.residents          USING gin (
    to_tsvector('english'::regconfig,
        (last_name || ' ' || first_name || ' ' || COALESCE(middle_name, ''))
    )
);

-- resident_credentials
CREATE INDEX idx_resident_credentials_resident ON public.resident_credentials USING btree (resident_fk);
CREATE INDEX idx_resident_credentials_google   ON public.resident_credentials USING btree (google_id) WHERE (google_id IS NOT NULL);

-- registration_requests
CREATE INDEX idx_registration_requests_resident ON public.registration_requests USING btree (resident_fk);
CREATE INDEX idx_registration_requests_status   ON public.registration_requests USING btree (status);
CREATE INDEX idx_registration_requests_reviewer ON public.registration_requests USING btree (reviewed_by);

-- resident_counters
CREATE INDEX idx_resident_counters_muni         ON public.resident_counters    USING btree (municipality_id);

-- resident_classifications
CREATE INDEX idx_resident_classifications_resident ON public.resident_classifications USING btree (resident_id);
CREATE INDEX idx_resident_classifications_type     ON public.resident_classifications USING btree (classification_type);
CREATE INDEX idx_resident_classifications_compound ON public.resident_classifications USING btree (resident_id, classification_type);

-- classification_types
CREATE INDEX idx_classification_types_municipality ON public.classification_types USING btree (municipality_id);
CREATE INDEX idx_classification_types_active       ON public.classification_types USING btree (is_active);

-- households
CREATE INDEX idx_households_barangay             ON public.households USING btree (barangay_id);
CREATE INDEX idx_households_head                 ON public.households USING btree (house_head);
CREATE INDEX idx_households_geom                 ON public.households USING gist (geom) WHERE (geom IS NOT NULL);
CREATE INDEX idx_households_search               ON public.households USING btree (house_number, street) WHERE ((house_number IS NOT NULL) OR (street IS NOT NULL));

-- families
CREATE INDEX idx_families_household              ON public.families USING btree (household_id);
CREATE INDEX idx_families_head                   ON public.families USING btree (family_head);

-- family_members
CREATE INDEX idx_family_members_family           ON public.family_members USING btree (family_id);
CREATE INDEX idx_family_members_member           ON public.family_members USING btree (family_member);

-- officials
CREATE INDEX idx_officials_barangay              ON public.officials USING btree (barangay_id);
CREATE INDEX idx_officials_resident              ON public.officials USING btree (resident_id);
CREATE INDEX idx_officials_position              ON public.officials USING btree (position);
CREATE INDEX idx_officials_active                ON public.officials USING btree (barangay_id, position) WHERE (term_end IS NULL);

-- requests
CREATE INDEX idx_requests_barangay               ON public.requests USING btree (barangay_id);
CREATE INDEX idx_requests_resident               ON public.requests USING btree (resident_id);
CREATE INDEX idx_requests_status                 ON public.requests USING btree (status);
CREATE INDEX idx_requests_type                   ON public.requests USING btree (type);
CREATE INDEX idx_requests_status_type_date       ON public.requests USING btree (barangay_id, status, type, created_at);
CREATE UNIQUE INDEX idx_requests_uuid            ON public.requests USING btree (uuid);

-- inventories / archives
CREATE INDEX idx_inventories_barangay            ON public.inventories USING btree (barangay_id);
CREATE INDEX idx_archives_barangay               ON public.archives    USING btree (barangay_id);
CREATE INDEX idx_archives_type                   ON public.archives    USING btree (document_type);

-- pets / vaccines
CREATE INDEX idx_pets_owner                      ON public.pets     USING btree (owner_id);
CREATE INDEX idx_pets_species                    ON public.pets     USING btree (species);
CREATE UNIQUE INDEX idx_pets_uuid                ON public.pets     USING btree (uuid);
CREATE INDEX idx_pets_created_at                ON public.pets     USING btree (created_at);
CREATE INDEX idx_vaccines_target                 ON public.vaccines USING btree (target_type, target_id);
CREATE INDEX idx_vaccines_date                   ON public.vaccines USING btree (vaccination_date);

-- residents / households / families — created_at indexes for "this month" queries
CREATE INDEX idx_residents_created_at            ON public.residents    USING btree (created_at);
CREATE INDEX idx_households_created_at           ON public.households  USING btree (created_at);
CREATE INDEX idx_families_created_at             ON public.families    USING btree (created_at);

-- Trigram indexes for ILIKE search optimization
-- Note: Requires pg_trgm extension: CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- These indexes enable fast prefix/wildcard searches (ILIKE '%term%')
CREATE INDEX idx_residents_last_name_trgm        ON public.residents    USING gin (last_name gin_trgm_ops);
CREATE INDEX idx_residents_first_name_trgm       ON public.residents    USING btree (first_name text_pattern_ops);

-- bims_users / api_keys / audit_logs
CREATE INDEX idx_bims_users_email                ON public.bims_users  USING btree (email);
CREATE INDEX idx_bims_users_target               ON public.bims_users  USING btree (target_type, target_id);
CREATE INDEX idx_bims_users_active               ON public.bims_users  USING btree (is_active);
CREATE INDEX idx_api_keys_municipality           ON public.api_keys    USING btree (municipality_id);
CREATE INDEX idx_audit_logs_barangay             ON public.audit_logs  USING btree (barangay_id);
CREATE INDEX idx_audit_logs_table                ON public.audit_logs  USING btree (table_name);
CREATE INDEX idx_audit_logs_record               ON public.audit_logs  USING btree (record_id);
CREATE INDEX idx_audit_logs_changed_at           ON public.audit_logs  USING btree (changed_at);

-- E-Services
CREATE INDEX idx_refresh_tokens_user_id          ON public.refresh_tokens USING btree (user_id);
CREATE INDEX idx_refresh_tokens_resident_id      ON public.refresh_tokens USING btree (resident_id);
CREATE INDEX idx_refresh_tokens_token            ON public.refresh_tokens USING btree (token);
CREATE INDEX idx_refresh_tokens_expires_at       ON public.refresh_tokens USING btree (expires_at);
CREATE INDEX idx_sessions_user_id                ON public.sessions       USING btree (user_id);
CREATE INDEX idx_sessions_resident_id            ON public.sessions       USING btree (resident_id);
CREATE INDEX idx_sessions_refresh_token_id       ON public.sessions       USING btree (refresh_token_id);
CREATE INDEX idx_sessions_expires_at             ON public.sessions       USING btree (expires_at);
CREATE INDEX idx_services_active                 ON public.services       USING btree (is_active);
CREATE INDEX idx_services_category               ON public.services       USING btree (category);
-- idx_eservices_active removed (table dropped)
CREATE INDEX idx_transactions_resident_id        ON public.transactions   USING btree (resident_id);
CREATE INDEX idx_transactions_service_id         ON public.transactions   USING btree (service_id);
CREATE INDEX idx_transactions_payment_status     ON public.transactions   USING btree (payment_status);
CREATE INDEX idx_transactions_status             ON public.transactions   USING btree (status);
CREATE INDEX idx_transactions_created_at         ON public.transactions   USING btree (created_at);
CREATE INDEX idx_transaction_notes_txn_id        ON public.transaction_notes   USING btree (transaction_id);
CREATE INDEX idx_transaction_notes_is_read       ON public.transaction_notes   USING btree (is_read);
CREATE INDEX idx_appointment_notes_txn_id        ON public.appointment_notes   USING btree (transaction_id);
CREATE INDEX idx_tax_profiles_service_id         ON public.tax_profiles        USING btree (service_id);
CREATE INDEX idx_tax_profiles_active             ON public.tax_profiles        USING btree (is_active);
CREATE INDEX idx_tax_pv_profile_id               ON public.tax_profile_versions USING btree (tax_profile_id);
CREATE INDEX idx_tax_pv_status                   ON public.tax_profile_versions USING btree (status);
CREATE INDEX idx_tax_computations_txn            ON public.tax_computations     USING btree (transaction_id, is_active);
CREATE INDEX idx_tax_computations_version        ON public.tax_computations     USING btree (tax_profile_version_id);
CREATE INDEX idx_exemptions_transaction          ON public.exemptions           USING btree (transaction_id);
CREATE INDEX idx_exemptions_status               ON public.exemptions           USING btree (status);
CREATE INDEX idx_payments_transaction            ON public.payments             USING btree (transaction_id);
CREATE INDEX idx_payments_date                   ON public.payments             USING btree (payment_date);
CREATE INDEX idx_social_amelioration_type        ON public.social_amelioration_settings USING btree (type);
CREATE INDEX idx_social_amelioration_active      ON public.social_amelioration_settings USING btree (is_active);
CREATE INDEX idx_government_programs_type        ON public.government_programs  USING btree (type);
CREATE INDEX idx_beneficiary_pivots_type_id      ON public.beneficiary_program_pivots USING btree (beneficiary_type, beneficiary_id);
CREATE INDEX idx_beneficiary_pivots_program      ON public.beneficiary_program_pivots USING btree (program_id);
CREATE INDEX idx_faqs_active                     ON public.faqs USING btree (is_active);
CREATE INDEX idx_faqs_order                      ON public.faqs USING btree ("order");


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- BIMS: updated_at auto-stamp
CREATE TRIGGER trigger_update_municipalities_updated_at   BEFORE UPDATE ON public.municipalities     FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_barangays_updated_at        BEFORE UPDATE ON public.barangays           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_residents_updated_at        BEFORE UPDATE ON public.residents           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_resident_credentials_updated_at BEFORE UPDATE ON public.resident_credentials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_registration_requests_updated_at BEFORE UPDATE ON public.registration_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_resident_counters_updated_at BEFORE UPDATE ON public.resident_counters  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_classification_types_updated_at BEFORE UPDATE ON public.classification_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_households_updated_at       BEFORE UPDATE ON public.households          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_families_updated_at         BEFORE UPDATE ON public.families            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_family_members_updated_at   BEFORE UPDATE ON public.family_members      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_officials_updated_at        BEFORE UPDATE ON public.officials           FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_requests_updated_at         BEFORE UPDATE ON public.requests            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_inventories_updated_at      BEFORE UPDATE ON public.inventories         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_archives_updated_at         BEFORE UPDATE ON public.archives            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_pets_updated_at             BEFORE UPDATE ON public.pets                FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_vaccines_updated_at         BEFORE UPDATE ON public.vaccines            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_update_bims_users_updated_at       BEFORE UPDATE ON public.bims_users          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_api_keys_set_updated_at                BEFORE UPDATE ON public.api_keys            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_api_keys();

-- BIMS: audit triggers
CREATE TRIGGER audit_residents_trigger           AFTER INSERT OR UPDATE OR DELETE ON public.residents         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_registration_requests_trigger AFTER INSERT OR UPDATE OR DELETE ON public.registration_requests FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_households_trigger          AFTER INSERT OR UPDATE OR DELETE ON public.households        FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_families_trigger            AFTER INSERT OR UPDATE OR DELETE ON public.families          FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_family_members_trigger      AFTER INSERT OR UPDATE OR DELETE ON public.family_members    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_pets_trigger                AFTER INSERT OR UPDATE OR DELETE ON public.pets              FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_requests_trigger            AFTER INSERT OR UPDATE OR DELETE ON public.requests          FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_archives_trigger            AFTER INSERT OR UPDATE OR DELETE ON public.archives          FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
CREATE TRIGGER audit_inventories_trigger         AFTER INSERT OR UPDATE OR DELETE ON public.inventories       FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- BIMS geography
ALTER TABLE ONLY public.barangays
    ADD CONSTRAINT barangays_municipality_id_fkey
    FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.classification_types
    ADD CONSTRAINT classification_types_municipality_id_fkey
    FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;

-- Residents
ALTER TABLE ONLY public.residents
    ADD CONSTRAINT residents_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.resident_credentials
    ADD CONSTRAINT resident_credentials_resident_fk_fkey
    FOREIGN KEY (resident_fk) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.registration_requests
    ADD CONSTRAINT registration_requests_resident_fk_fkey
    FOREIGN KEY (resident_fk) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.registration_requests
    ADD CONSTRAINT registration_requests_reviewed_by_fkey
    FOREIGN KEY (reviewed_by) REFERENCES public.bims_users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.resident_counters
    ADD CONSTRAINT resident_counters_municipality_id_fkey
    FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.resident_classifications
    ADD CONSTRAINT resident_classifications_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

-- Households / Families
ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.households
    ADD CONSTRAINT households_house_head_fkey
    FOREIGN KEY (house_head) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.families
    ADD CONSTRAINT families_household_id_fkey
    FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.families
    ADD CONSTRAINT families_family_head_fkey
    FOREIGN KEY (family_head) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_family_id_fkey
    FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.family_members
    ADD CONSTRAINT family_members_family_member_fkey
    FOREIGN KEY (family_member) REFERENCES public.residents(id) ON DELETE CASCADE;

-- Officials
ALTER TABLE ONLY public.officials
    ADD CONSTRAINT officials_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.officials
    ADD CONSTRAINT officials_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

-- Requests
ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.requests
    ADD CONSTRAINT requests_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE SET NULL;

-- Inventories / Archives
ALTER TABLE ONLY public.inventories
    ADD CONSTRAINT inventories_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.archives
    ADD CONSTRAINT archives_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE CASCADE;

-- Pets
ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES public.residents(id) ON DELETE CASCADE;

-- Audit
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_barangay_id_fkey
    FOREIGN KEY (barangay_id) REFERENCES public.barangays(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_changed_by_fkey
    FOREIGN KEY (changed_by) REFERENCES public.bims_users(id) ON DELETE SET NULL;

-- API keys
ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_municipality_id_fkey
    FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_created_by_user_id_fkey
    FOREIGN KEY (created_by_user_id) REFERENCES public.bims_users(id) ON DELETE RESTRICT;

-- E-Services RBAC
ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.eservice_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;

-- Session / Token
ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.eservice_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.eservice_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_refresh_token_id_fkey
    FOREIGN KEY (refresh_token_id) REFERENCES public.refresh_tokens(id) ON DELETE CASCADE;

-- Transactions
-- RESTRICT (not CASCADE/SET NULL): residents are never hard-deleted in this system.
-- Deactivate via status = 'deceased' | 'moved_out' | 'inactive' instead.
ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id);

ALTER TABLE ONLY public.transaction_notes
    ADD CONSTRAINT transaction_notes_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.appointment_notes
    ADD CONSTRAINT appointment_notes_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

-- Tax
ALTER TABLE ONLY public.tax_profiles
    ADD CONSTRAINT tax_profiles_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tax_profile_versions
    ADD CONSTRAINT tax_profile_versions_tax_profile_id_fkey
    FOREIGN KEY (tax_profile_id) REFERENCES public.tax_profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tax_computations
    ADD CONSTRAINT tax_computations_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tax_computations
    ADD CONSTRAINT tax_computations_tax_profile_version_id_fkey
    FOREIGN KEY (tax_profile_version_id) REFERENCES public.tax_profile_versions(id);

ALTER TABLE ONLY public.tax_computations
    ADD CONSTRAINT tax_computations_previous_computation_id_fkey
    FOREIGN KEY (previous_computation_id) REFERENCES public.tax_computations(id);

ALTER TABLE ONLY public.exemptions
    ADD CONSTRAINT exemptions_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.exemptions
    ADD CONSTRAINT exemptions_tax_computation_id_fkey
    FOREIGN KEY (tax_computation_id) REFERENCES public.tax_computations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_fkey
    FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_tax_computation_id_fkey
    FOREIGN KEY (tax_computation_id) REFERENCES public.tax_computations(id) ON DELETE CASCADE;

-- Social Amelioration / Beneficiaries
ALTER TABLE ONLY public.senior_citizen_beneficiaries
    ADD CONSTRAINT scb_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.senior_citizen_pension_type_pivots
    ADD CONSTRAINT scptp_beneficiary_id_fkey
    FOREIGN KEY (beneficiary_id) REFERENCES public.senior_citizen_beneficiaries(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.senior_citizen_pension_type_pivots
    ADD CONSTRAINT scptp_setting_id_fkey
    FOREIGN KEY (setting_id) REFERENCES public.social_amelioration_settings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pwd_beneficiaries
    ADD CONSTRAINT pwd_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pwd_beneficiaries
    ADD CONSTRAINT pwd_disability_type_id_fkey
    FOREIGN KEY (disability_type_id) REFERENCES public.social_amelioration_settings(id);

ALTER TABLE ONLY public.student_beneficiaries
    ADD CONSTRAINT student_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.student_beneficiaries
    ADD CONSTRAINT student_grade_level_id_fkey
    FOREIGN KEY (grade_level_id) REFERENCES public.social_amelioration_settings(id);

ALTER TABLE ONLY public.solo_parent_beneficiaries
    ADD CONSTRAINT sp_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.solo_parent_beneficiaries
    ADD CONSTRAINT sp_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.social_amelioration_settings(id);

ALTER TABLE ONLY public.beneficiary_program_pivots
    ADD CONSTRAINT bpp_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES public.government_programs(id) ON DELETE CASCADE;


-- =============================================================================
-- BIMS: Certificate Templates (AC4)
-- HTML templates with {{ placeholder }} tokens for certificate generation.
-- Scoped per municipality + certificate type. One template per type per municipality.
-- =============================================================================

CREATE TABLE public.certificate_templates (
    id               uuid NOT NULL DEFAULT gen_random_uuid(),
    municipality_id  integer NOT NULL,    -- FK → municipalities(id) ON DELETE CASCADE
    certificate_type text NOT NULL,       -- 'barangay_clearance' | 'indigency' | 'residency' | 'good_moral' | etc.
    name             text NOT NULL,       -- display name shown in BIMS UI
    description      text,
    html_content     text NOT NULL,       -- HTML template with {{ placeholder }} tokens
    is_active        boolean NOT NULL DEFAULT true,
    created_by       integer,             -- FK → bims_users(id), nullable
    created_at       timestamp without time zone DEFAULT now(),
    updated_at       timestamp without time zone DEFAULT now(),
    CONSTRAINT certificate_templates_pkey PRIMARY KEY (id),
    CONSTRAINT certificate_templates_unique UNIQUE (municipality_id, certificate_type)
);

ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_municipality_fkey
    FOREIGN KEY (municipality_id) REFERENCES public.municipalities(id) ON DELETE CASCADE;

CREATE INDEX idx_certificate_templates_municipality ON public.certificate_templates USING btree (municipality_id);
CREATE INDEX idx_certificate_templates_type         ON public.certificate_templates USING btree (certificate_type);

-- =============================================================================
-- v2 PATCH — fixes applied post-QA review
-- =============================================================================

-- Fix: resident_classifications.resident_id must not be NULL
-- (a classification without a resident would survive any resident deletion)
ALTER TABLE ONLY public.resident_classifications
    ALTER COLUMN resident_id SET NOT NULL;

-- Fix: prevent duplicate classification entries per resident
ALTER TABLE ONLY public.resident_classifications
    ADD CONSTRAINT resident_classifications_unique_type
    UNIQUE (resident_id, classification_type);

-- Fix: missing FK from exemptions.requested_by → residents
ALTER TABLE ONLY public.exemptions
    ADD CONSTRAINT exemptions_requested_by_fkey
    FOREIGN KEY (requested_by) REFERENCES public.residents(id) ON DELETE CASCADE;

-- Fix: missing FK from exemptions.approved_by → eservice_users
ALTER TABLE ONLY public.exemptions
    ADD CONSTRAINT exemptions_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES public.eservice_users(id) ON DELETE SET NULL;

-- Fix: missing FK from payments.received_by → eservice_users
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_received_by_fkey
    FOREIGN KEY (received_by) REFERENCES public.eservice_users(id) ON DELETE SET NULL;

-- Fix: missing index on audit_logs.changed_by (FK column with no index — full scans on user queries)
CREATE INDEX idx_audit_logs_changed_by ON public.audit_logs USING btree (changed_by);

-- Fix: attach audit triggers to sensitive tables that were missing them
CREATE TRIGGER audit_officials_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.officials
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_bims_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.bims_users
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_vaccines_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.vaccines
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER audit_resident_classifications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.resident_classifications
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Fix: certificate_templates.created_by should be FK → bims_users(id)
ALTER TABLE ONLY public.certificate_templates
    ADD CONSTRAINT certificate_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.bims_users(id) ON DELETE SET NULL;

-- =============================================================================
-- END OF UNIFIED SCHEMA v2
-- =============================================================================
