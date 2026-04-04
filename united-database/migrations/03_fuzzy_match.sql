-- =============================================================================
-- MIGRATION 03 — Fuzzy Match: Link citizens ↔ residents
-- =============================================================================
-- Populates the citizen_resident_mapping bridge table by comparing
-- E-Services citizens against BIMS residents using:
--   1. Exact birthdate match  (prerequisite filter)
--   2. Trigram name similarity via pg_trgm (last_name + first_name)
--
-- Score thresholds:
--   >= 95  → CONFIRMED  (auto-confirmed, no staff review needed)
--   85–94  → PENDING    (staff must confirm or reject)
--   < 85   → skipped    (too ambiguous)
--   Multiple residents match one citizen → NEEDS_REVIEW
--
-- HOW TO RUN:
--   Run connected to the unified DB AFTER both 01 and 02 have been run.
--   psql "$UNIFIED_DB_URL" -f 03_fuzzy_match.sql
--
-- IDEMPOTENT: Clears existing PENDING/NEEDS_REVIEW rows before re-running.
--             CONFIRMED and REJECTED rows are preserved.
-- =============================================================================

SET search_path TO public;

-- Require pg_trgm (already in schema.sql, but safe to repeat)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Step 1: Remove non-final rows to allow clean re-run
-- ---------------------------------------------------------------------------
DELETE FROM public.citizen_resident_mapping
WHERE status IN ('PENDING', 'NEEDS_REVIEW');


-- ---------------------------------------------------------------------------
-- Step 2: Build candidate matches with scores
-- ---------------------------------------------------------------------------
-- Uses a CTE to avoid re-scanning large tables multiple times.
-- Only pairs where birthdate matches exactly are considered.
-- Score = weighted average of last_name similarity (60%) + first_name (40%).

WITH candidates AS (
    SELECT
        c.id                                                      AS citizen_id,
        r.id                                                      AS resident_id,
        ROUND(
            (
                similarity(lower(trim(c.last_name)),  lower(trim(r.last_name)))  * 60 +
                similarity(lower(trim(c.first_name)), lower(trim(r.first_name))) * 40
            )::numeric,
            2
        )                                                         AS match_score
    FROM public.citizens  c
    JOIN public.residents r
        ON c.birth_date::date = r.birthdate          -- exact birthdate filter
    WHERE
        -- Minimum viable similarity on both name parts to avoid garbage matches
        similarity(lower(trim(c.last_name)),  lower(trim(r.last_name)))  > 0.4
        AND
        similarity(lower(trim(c.first_name)), lower(trim(r.first_name))) > 0.4
        -- Skip citizens already confirmed or rejected
        AND NOT EXISTS (
            SELECT 1 FROM public.citizen_resident_mapping m
            WHERE m.citizen_id = c.id
              AND m.status IN ('CONFIRMED', 'REJECTED')
        )
),

-- Step 3: Identify citizens with multiple candidate residents (ambiguous)
ambiguous_citizens AS (
    SELECT citizen_id
    FROM candidates
    WHERE match_score >= 85
    GROUP BY citizen_id
    HAVING COUNT(DISTINCT resident_id) > 1
),

-- Step 4: Identify residents with multiple candidate citizens (ambiguous)
ambiguous_residents AS (
    SELECT resident_id
    FROM candidates
    WHERE match_score >= 85
    GROUP BY resident_id
    HAVING COUNT(DISTINCT citizen_id) > 1
)

-- Step 5: Insert results with appropriate status.
--
-- IMPORTANT: When one citizen matches multiple residents (NEEDS_REVIEW), or
-- two citizens compete for the same resident, a naive INSERT ... ON CONFLICT
-- would fail with "command cannot affect row a second time" because PostgreSQL
-- forbids updating the same target row twice in a single statement.
--
-- Fix: DISTINCT ON (citizen_id) ORDER BY match_score DESC guarantees each
-- citizen appears exactly once — the highest-scoring resident is kept.
-- A second DISTINCT ON (resident_id) ORDER BY match_score DESC then ensures
-- each resident is also claimed at most once (best citizen wins if two compete).
-- Both cases still set status = NEEDS_REVIEW via the ambiguous_* CTEs, so
-- staff can manually review and correct any collision.

INSERT INTO public.citizen_resident_mapping (
    citizen_id, resident_id, match_score, match_method, status
)
SELECT
    best.citizen_id,
    best.resident_id,
    best.match_score,
    'AUTO_FUZZY',
    CASE
        WHEN best.citizen_id  IN (SELECT citizen_id  FROM ambiguous_citizens)  THEN 'NEEDS_REVIEW'
        WHEN best.resident_id IN (SELECT resident_id FROM ambiguous_residents) THEN 'NEEDS_REVIEW'
        WHEN best.match_score >= 95 THEN 'CONFIRMED'
        ELSE 'PENDING'
    END
FROM (
    -- Outer DISTINCT ON (resident_id): if two citizens tie for the same
    -- resident, keep only the higher-scoring citizen.
    SELECT DISTINCT ON (inner_best.resident_id)
        inner_best.citizen_id,
        inner_best.resident_id,
        inner_best.match_score
    FROM (
        -- Inner DISTINCT ON (citizen_id): for each citizen keep only the
        -- highest-scoring resident, eliminating duplicate citizen_id rows.
        SELECT DISTINCT ON (cand.citizen_id)
            cand.citizen_id,
            cand.resident_id,
            cand.match_score
        FROM candidates cand
        WHERE cand.match_score >= 85
        ORDER BY cand.citizen_id, cand.match_score DESC
    ) inner_best
    ORDER BY inner_best.resident_id, inner_best.match_score DESC
) best
ON CONFLICT (citizen_id) DO UPDATE
    SET match_score  = EXCLUDED.match_score,
        status       = EXCLUDED.status,
        match_method = EXCLUDED.match_method
    WHERE citizen_resident_mapping.status NOT IN ('CONFIRMED', 'REJECTED');


-- ---------------------------------------------------------------------------
-- Step 6: Match Report
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    total_citizens      INTEGER;
    total_residents     INTEGER;
    confirmed_count     INTEGER;
    pending_count       INTEGER;
    needs_review_count  INTEGER;
    rejected_count      INTEGER;
    unmatched_citizens  INTEGER;
    unmatched_residents INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_citizens  FROM public.citizens;
    SELECT COUNT(*) INTO total_residents FROM public.residents WHERE resident_status = 'active';

    SELECT COUNT(*) INTO confirmed_count    FROM public.citizen_resident_mapping WHERE status = 'CONFIRMED';
    SELECT COUNT(*) INTO pending_count      FROM public.citizen_resident_mapping WHERE status = 'PENDING';
    SELECT COUNT(*) INTO needs_review_count FROM public.citizen_resident_mapping WHERE status = 'NEEDS_REVIEW';
    SELECT COUNT(*) INTO rejected_count     FROM public.citizen_resident_mapping WHERE status = 'REJECTED';

    SELECT COUNT(*) INTO unmatched_citizens
    FROM public.citizens c
    WHERE NOT EXISTS (
        SELECT 1 FROM public.citizen_resident_mapping m WHERE m.citizen_id = c.id
    );

    SELECT COUNT(*) INTO unmatched_residents
    FROM public.residents r
    WHERE r.resident_status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.citizen_resident_mapping m WHERE m.resident_id = r.id
    );

    RAISE NOTICE '==========================================';
    RAISE NOTICE ' FUZZY MATCH REPORT';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '  Total citizens (E-Services):   %', total_citizens;
    RAISE NOTICE '  Total active residents (BIMS): %', total_residents;
    RAISE NOTICE '------------------------------------------';
    RAISE NOTICE '  CONFIRMED  (score >= 95):      %', confirmed_count;
    RAISE NOTICE '  PENDING    (score 85-94):      %', pending_count;
    RAISE NOTICE '  NEEDS_REVIEW (ambiguous):      %', needs_review_count;
    RAISE NOTICE '  REJECTED   (staff-rejected):   %', rejected_count;
    RAISE NOTICE '------------------------------------------';
    RAISE NOTICE '  Unmatched citizens:            %', unmatched_citizens;
    RAISE NOTICE '  Unmatched residents:           %', unmatched_residents;
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Next step: review PENDING and NEEDS_REVIEW rows.';
    RAISE NOTICE 'Run the query below to export for staff review:';
    RAISE NOTICE '';
    RAISE NOTICE '  SELECT m.id, m.status, m.match_score,';
    RAISE NOTICE '         c.last_name || '', '' || c.first_name AS citizen_name, c.birth_date,';
    RAISE NOTICE '         r.last_name || '', '' || r.first_name AS resident_name, r.birthdate';
    RAISE NOTICE '  FROM citizen_resident_mapping m';
    RAISE NOTICE '  JOIN citizens  c ON c.id = m.citizen_id';
    RAISE NOTICE '  JOIN residents r ON r.id = m.resident_id';
    RAISE NOTICE '  WHERE m.status IN (''PENDING'', ''NEEDS_REVIEW'')';
    RAISE NOTICE '  ORDER BY m.status, m.match_score DESC;';
END$$;
