-- Migration: 35_consolidate_place_of_birth
-- Replaces birth_region, birth_province, birth_municipality with single place_of_birth column
-- Date: 2026-05-23

-- Step 1: Add the new column
ALTER TABLE public.residents ADD COLUMN place_of_birth TEXT;

-- Step 2: Migrate data (flatten 3 columns into one; prefer municipality > province > region)
UPDATE public.residents
SET place_of_birth = COALESCE(
    NULLIF(birth_municipality, ''),
    NULLIF(birth_province, ''),
    NULLIF(birth_region, '')
);

-- Step 3: Drop old columns
ALTER TABLE public.residents DROP COLUMN birth_region;
ALTER TABLE public.residents DROP COLUMN birth_province;
ALTER TABLE public.residents DROP COLUMN birth_municipality;

-- Rollback
/*
ALTER TABLE public.residents ADD COLUMN birth_region TEXT;
ALTER TABLE public.residents ADD COLUMN birth_province TEXT;
ALTER TABLE public.residents ADD COLUMN birth_municipality TEXT;
UPDATE public.residents SET birth_region = NULL, birth_province = NULL, birth_municipality = NULL;
ALTER TABLE public.residents DROP COLUMN place_of_birth;
*/
