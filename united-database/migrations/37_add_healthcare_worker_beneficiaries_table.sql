-- Migration: 37_add_healthcare_worker_beneficiaries_table
-- Adds healthcare_worker_beneficiaries table for HEALTHCARE_WORKER beneficiary type
-- Date: 2026-06-11
-- Updated: 2026-06-14 — use beneficiary_status enum type, add remarks column

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS public.healthcare_worker_beneficiaries (
    id                   uuid                    NOT NULL DEFAULT gen_random_uuid(),
    resident_id          text                    NOT NULL,
    healthcare_worker_id text                    NOT NULL,
    status               beneficiary_status       NOT NULL DEFAULT 'ACTIVE',
    remarks              text,
    created_at          timestamptz             NOT NULL DEFAULT NOW(),
    updated_at          timestamptz             NOT NULL DEFAULT NOW()
);

-- Step 2: Add primary key
ALTER TABLE ONLY public.healthcare_worker_beneficiaries
    ADD CONSTRAINT healthcare_worker_beneficiaries_pkey
    PRIMARY KEY (id);

-- Step 3: Add unique constraints (one record per resident, one ID per person)
ALTER TABLE ONLY public.healthcare_worker_beneficiaries
    ADD CONSTRAINT hw_resident_id_key
    UNIQUE (resident_id);

ALTER TABLE ONLY public.healthcare_worker_beneficiaries
    ADD CONSTRAINT hw_healthcare_worker_id_key
    UNIQUE (healthcare_worker_id);

-- Step 4: Add foreign key to residents
ALTER TABLE ONLY public.healthcare_worker_beneficiaries
    ADD CONSTRAINT hw_resident_id_fkey
    FOREIGN KEY (resident_id) REFERENCES public.residents(id) ON DELETE CASCADE;

-- Verify
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = 'healthcare_worker_beneficiaries'
          AND schemaname = 'public'
    ) THEN
        RAISE EXCEPTION 'Table healthcare_worker_beneficiaries not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'healthcare_worker_beneficiaries_pkey'
    ) THEN
        RAISE EXCEPTION 'Primary key not created';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'hw_resident_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key not created';
    END IF;

    RAISE NOTICE 'healthcare_worker_beneficiaries table created successfully';
END $$;

-- Rollback
-- DROP TABLE IF EXISTS public.healthcare_worker_beneficiaries;
