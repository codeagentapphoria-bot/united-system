-- =============================================================================
-- MIGRATION 04 — Data Integrity Verification
-- =============================================================================
-- Runs after 01, 02, and 03.
-- Checks:
--   A. Row counts (compare to source DB row counts — fill in expected values)
--   B. Orphaned foreign keys
--   C. Duplicate email violations
--   D. CHECK constraint violations (enum value mismatches from source)
--   E. citizen_resident_mapping completeness
--   F. Sequence alignment
--
-- HOW TO RUN:
--   psql "$UNIFIED_DB_URL" -f 04_verify_integrity.sql
--
-- All checks produce NOTICE output. RAISE EXCEPTION is used for hard failures
-- (issues that MUST be resolved before go-live).
-- =============================================================================

SET search_path TO public;

DO $$
DECLARE
    fail_count INTEGER := 0;
    cnt        INTEGER;
BEGIN

-- =============================================================================
-- A. FOREIGN KEY ORPHAN CHECKS
-- =============================================================================
    RAISE NOTICE '=== A. ORPHANED FK CHECKS ===';

    -- BIMS
    SELECT COUNT(*) INTO cnt FROM public.barangays        WHERE municipality_id NOT IN (SELECT id FROM public.municipalities);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] barangays with invalid municipality_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   barangays.municipality_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.puroks            WHERE barangay_id NOT IN (SELECT id FROM public.barangays);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] puroks with invalid barangay_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   puroks.barangay_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.residents         WHERE barangay_id NOT IN (SELECT id FROM public.barangays);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] residents with invalid barangay_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   residents.barangay_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.households        WHERE barangay_id NOT IN (SELECT id FROM public.barangays);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] households with invalid barangay_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   households.barangay_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.households        WHERE purok_id NOT IN (SELECT id FROM public.puroks);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] households with invalid purok_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   households.purok_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.households        WHERE house_head NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] households with invalid house_head: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   households.house_head'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.families          WHERE household_id NOT IN (SELECT id FROM public.households);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] families with invalid household_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   families.household_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.families          WHERE family_head NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] families with invalid family_head: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   families.family_head'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.family_members    WHERE family_id NOT IN (SELECT id FROM public.families);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] family_members with invalid family_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   family_members.family_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.family_members    WHERE family_member NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] family_members with invalid family_member: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   family_members.family_member'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.officials         WHERE barangay_id NOT IN (SELECT id FROM public.barangays);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] officials with invalid barangay_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   officials.barangay_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.officials         WHERE resident_id NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] officials with invalid resident_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   officials.resident_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.requests          WHERE resident_id IS NOT NULL AND resident_id NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] requests with invalid resident_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   requests.resident_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.pets              WHERE owner_id NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] pets with invalid owner_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   pets.owner_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.audit_logs        WHERE barangay_id IS NOT NULL AND barangay_id NOT IN (SELECT id FROM public.barangays);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] audit_logs with invalid barangay_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   audit_logs.barangay_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.audit_logs        WHERE changed_by IS NOT NULL AND changed_by NOT IN (SELECT id FROM public.bims_users);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] audit_logs with invalid changed_by: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   audit_logs.changed_by'; END IF;

    -- E-Services
    SELECT COUNT(*) INTO cnt FROM public.subscribers       WHERE citizen_id IS NOT NULL AND citizen_id NOT IN (SELECT id FROM public.citizens);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] subscribers with invalid citizen_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   subscribers.citizen_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.subscribers       WHERE non_citizen_id IS NOT NULL AND non_citizen_id NOT IN (SELECT id FROM public.non_citizens);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] subscribers with invalid non_citizen_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   subscribers.non_citizen_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.transactions      WHERE subscriber_id NOT IN (SELECT id FROM public.subscribers);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] transactions with invalid subscriber_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   transactions.subscriber_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.transactions      WHERE service_id NOT IN (SELECT id FROM public.services);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] transactions with invalid service_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   transactions.service_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.transaction_notes WHERE transaction_id NOT IN (SELECT id FROM public.transactions);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] transaction_notes with invalid transaction_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   transaction_notes.transaction_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.tax_computations  WHERE transaction_id NOT IN (SELECT id FROM public.transactions);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] tax_computations with invalid transaction_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   tax_computations.transaction_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.exemptions        WHERE transaction_id NOT IN (SELECT id FROM public.transactions);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] exemptions with invalid transaction_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   exemptions.transaction_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.payments          WHERE transaction_id NOT IN (SELECT id FROM public.transactions);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] payments with invalid transaction_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   payments.transaction_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.payments          WHERE tax_computation_id NOT IN (SELECT id FROM public.tax_computations);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] payments with invalid tax_computation_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   payments.tax_computation_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.refresh_tokens    WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.eservice_users);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] refresh_tokens with invalid user_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   refresh_tokens.user_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.refresh_tokens    WHERE subscriber_id IS NOT NULL AND subscriber_id NOT IN (SELECT id FROM public.subscribers);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] refresh_tokens with invalid subscriber_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   refresh_tokens.subscriber_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.sessions          WHERE refresh_token_id NOT IN (SELECT id FROM public.refresh_tokens);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] sessions with invalid refresh_token_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   sessions.refresh_token_id'; END IF;

    -- Bridge table
    SELECT COUNT(*) INTO cnt FROM public.citizen_resident_mapping WHERE citizen_id NOT IN (SELECT id FROM public.citizens);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] citizen_resident_mapping with invalid citizen_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   citizen_resident_mapping.citizen_id'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.citizen_resident_mapping WHERE resident_id NOT IN (SELECT id FROM public.residents);
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] citizen_resident_mapping with invalid resident_id: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   citizen_resident_mapping.resident_id'; END IF;


-- =============================================================================
-- B. DUPLICATE EMAIL / UNIQUE KEY CHECKS
-- =============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== B. DUPLICATE / UNIQUE KEY CHECKS ===';

    SELECT COUNT(*) INTO cnt FROM (
        SELECT email FROM public.bims_users GROUP BY email HAVING COUNT(*) > 1
    ) x;
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] Duplicate emails in bims_users: % groups', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   bims_users.email unique'; END IF;

    SELECT COUNT(*) INTO cnt FROM (
        SELECT email FROM public.eservice_users GROUP BY email HAVING COUNT(*) > 1
    ) x;
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] Duplicate emails in eservice_users: % groups', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   eservice_users.email unique'; END IF;

    SELECT COUNT(*) INTO cnt FROM (
        SELECT username FROM public.citizens WHERE username IS NOT NULL GROUP BY username HAVING COUNT(*) > 1
    ) x;
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] Duplicate usernames in citizens: % groups', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   citizens.username unique'; END IF;

    SELECT COUNT(*) INTO cnt FROM (
        SELECT phone_number FROM public.non_citizens GROUP BY phone_number HAVING COUNT(*) > 1
    ) x;
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] Duplicate phone_number in non_citizens: % groups', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   non_citizens.phone_number unique'; END IF;

    SELECT COUNT(*) INTO cnt FROM (
        SELECT transaction_id FROM public.transactions GROUP BY transaction_id HAVING COUNT(*) > 1
    ) x;
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] Duplicate transaction_id in transactions: % groups', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   transactions.transaction_id unique'; END IF;

    SELECT COUNT(*) INTO cnt FROM (
        SELECT key FROM public.api_keys GROUP BY key HAVING COUNT(*) > 1
    ) x;
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] Duplicate key in api_keys: % groups', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   api_keys.key unique'; END IF;


-- =============================================================================
-- C. CHECK CONSTRAINT VIOLATIONS (data from source may have bad enum values)
-- =============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== C. CHECK CONSTRAINT VIOLATIONS ===';

    SELECT COUNT(*) INTO cnt FROM public.residents
    WHERE sex NOT IN ('male','female');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] residents with invalid sex value: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   residents.sex'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.residents
    WHERE civil_status NOT IN ('single','married','widowed','separated','divorced','live_in');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] residents with invalid civil_status: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   residents.civil_status'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.residents
    WHERE employment_status IS NOT NULL
      AND employment_status NOT IN ('employed','unemployed','self-employed','student','retired','not_applicable');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] residents with invalid employment_status: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   residents.employment_status'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.residents
    WHERE resident_status NOT IN ('active','deceased','moved_out','temporarily_away');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] residents with invalid resident_status: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   residents.resident_status'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.requests
    WHERE type NOT IN ('certificate','appointment');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] requests with invalid type: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   requests.type'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.requests
    WHERE status NOT IN ('pending','approved','rejected','completed');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] requests with invalid status: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   requests.status'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.bims_users
    WHERE role NOT IN ('admin','staff');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] bims_users with invalid role: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   bims_users.role'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.bims_users
    WHERE target_type NOT IN ('municipality','barangay');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] bims_users with invalid target_type: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   bims_users.target_type'; END IF;

    SELECT COUNT(*) INTO cnt FROM public.vaccines
    WHERE target_type NOT IN ('pet','resident');
    IF cnt > 0 THEN RAISE WARNING '  [FAIL] vaccines with invalid target_type: %', cnt; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   vaccines.target_type'; END IF;


-- =============================================================================
-- D. citizen_resident_mapping COMPLETENESS
-- =============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== D. CITIZEN_RESIDENT_MAPPING STATUS ===';

    SELECT COUNT(*) INTO cnt FROM public.citizen_resident_mapping WHERE status = 'CONFIRMED';
    RAISE NOTICE '  CONFIRMED:    %', cnt;

    SELECT COUNT(*) INTO cnt FROM public.citizen_resident_mapping WHERE status = 'PENDING';
    IF cnt > 0 THEN RAISE WARNING '  [WARN] PENDING (needs staff review): %', cnt;
    ELSE RAISE NOTICE '  PENDING:      %', cnt; END IF;

    SELECT COUNT(*) INTO cnt FROM public.citizen_resident_mapping WHERE status = 'NEEDS_REVIEW';
    IF cnt > 0 THEN RAISE WARNING '  [WARN] NEEDS_REVIEW (ambiguous match): %', cnt;
    ELSE RAISE NOTICE '  NEEDS_REVIEW: %', cnt; END IF;

    SELECT COUNT(*) INTO cnt FROM public.citizen_resident_mapping WHERE status = 'REJECTED';
    RAISE NOTICE '  REJECTED:     %', cnt;

    SELECT COUNT(*) INTO cnt FROM public.citizens c
    WHERE NOT EXISTS (SELECT 1 FROM public.citizen_resident_mapping m WHERE m.citizen_id = c.id);
    RAISE NOTICE '  Unmatched citizens: %', cnt;

    SELECT COUNT(*) INTO cnt FROM public.residents r
    WHERE r.resident_status = 'active'
      AND NOT EXISTS (SELECT 1 FROM public.citizen_resident_mapping m WHERE m.resident_id = r.id);
    RAISE NOTICE '  Unmatched active residents: %', cnt;


-- =============================================================================
-- E. SEQUENCE ALIGNMENT CHECK
-- =============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== E. SEQUENCE ALIGNMENT ===';

    -- Warn if any sequence is behind the max id in its table (would cause PK collisions on next insert)
    PERFORM 1 WHERE (SELECT last_value FROM public.municipalities_id_seq) < COALESCE((SELECT MAX(id) FROM public.municipalities), 0);
    IF FOUND THEN RAISE WARNING '  [FAIL] municipalities_id_seq behind table max'; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   municipalities_id_seq'; END IF;

    PERFORM 1 WHERE (SELECT last_value FROM public.barangays_id_seq) < COALESCE((SELECT MAX(id) FROM public.barangays), 0);
    IF FOUND THEN RAISE WARNING '  [FAIL] barangays_id_seq behind table max'; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   barangays_id_seq'; END IF;

    PERFORM 1 WHERE (SELECT last_value FROM public.residents_id_seq) < 0;  -- varchar PK, no sequence
    RAISE NOTICE '  [N/A]  residents uses varchar PK (no sequence check needed)';

    PERFORM 1 WHERE (SELECT last_value FROM public.bims_users_id_seq) < COALESCE((SELECT MAX(id) FROM public.bims_users), 0);
    IF FOUND THEN RAISE WARNING '  [FAIL] bims_users_id_seq behind table max'; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   bims_users_id_seq'; END IF;

    PERFORM 1 WHERE (SELECT last_value FROM public.requests_id_seq) < COALESCE((SELECT MAX(id) FROM public.requests), 0);
    IF FOUND THEN RAISE WARNING '  [FAIL] requests_id_seq behind table max'; fail_count := fail_count + 1;
    ELSE RAISE NOTICE '  [OK]   requests_id_seq'; END IF;


-- =============================================================================
-- F. ROW COUNT SUMMARY
-- =============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '=== F. ROW COUNT SUMMARY ===';
    RAISE NOTICE '  (compare these manually against source DB counts)';

    DECLARE
        all_tables TEXT[] := ARRAY[
            'municipalities','barangays','puroks','residents',
            'resident_classifications','classification_types',
            'households','families','family_members',
            'officials','requests','inventories','archives',
            'pets','vaccines','bims_users','audit_logs',
            'eservice_users','citizens','non_citizens','subscribers',
            'citizen_registration_requests','place_of_birth','mother_info',
            'services','eservices','transactions','transaction_notes',
            'appointment_notes','tax_profiles','tax_profile_versions',
            'tax_computations','exemptions','payments',
            'social_amelioration_settings',
            'senior_citizen_beneficiaries','pwd_beneficiaries',
            'student_beneficiaries','solo_parent_beneficiaries',
            'government_programs','beneficiary_program_pivots',
            'refresh_tokens','sessions','otp_verifications','addresses','faqs',
            'citizen_resident_mapping'
        ];
        t   TEXT;
        c   INTEGER;
    BEGIN
        FOREACH t IN ARRAY all_tables LOOP
            EXECUTE format('SELECT COUNT(*) FROM public.%I', t) INTO c;
            RAISE NOTICE '  %-45s %s', t, c;
        END LOOP;
    END;


-- =============================================================================
-- FINAL VERDICT
-- =============================================================================
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    IF fail_count = 0 THEN
        RAISE NOTICE '  RESULT: ALL CHECKS PASSED (% failures)', fail_count;
        RAISE NOTICE '  Database is ready for go-live.';
    ELSE
        RAISE NOTICE '  RESULT: % CHECK(S) FAILED', fail_count;
        RAISE NOTICE '  Resolve all [FAIL] items before go-live.';
        RAISE EXCEPTION 'Integrity check failed with % error(s). See WARN messages above.', fail_count;
    END IF;
    RAISE NOTICE '==========================================';

END$$;
