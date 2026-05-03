-- =============================================================================
-- SEED DATA — United Systems Unified Database v2
-- =============================================================================
-- Reference / lookup data that should be present before either backend starts.
-- Does NOT include real resident or transactional data — only configuration
-- records that both systems expect to exist.
--
-- HOW TO RUN:
--   Run after schema.sql has been applied and BEFORE running backend servers.
--   psql "$UNIFIED_DB_URL" -f seed.sql
--
-- IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING throughout.
-- All IDs use UUID v4 format.
-- =============================================================================

SET search_path TO public;


-- =============================================================================
-- E-Services: RBAC — Default Roles
-- =============================================================================

INSERT INTO public.roles (id, name, description, system, created_at, updated_at) VALUES
    ('00000001-0001-4001-8001-000000000001', 'super_admin', 'Full system access',                    'core', now(), now()),
    ('00000002-0002-4002-8002-000000000002', 'admin',       'Standard admin access',                 'core', now(), now()),
    ('00000003-0003-4003-8003-000000000003', 'encoder',     'Data entry and transaction processing', 'core', now(), now()),
    ('00000004-0004-4004-8004-000000000004', 'viewer',      'Read-only access',                    'core', now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: RBAC — Default Permissions
-- =============================================================================

INSERT INTO public.permissions (id, resource, action, created_at, updated_at) VALUES
    ('00000010-0010-4001-8001-000000000001', 'residents',     'ALL',  now(), now()),
    ('00000010-0010-4001-8001-000000000002', 'residents',     'READ', now(), now()),
    ('00000011-0011-4001-8001-000000000001', 'transactions',  'ALL',  now(), now()),
    ('00000011-0011-4001-8001-000000000002', 'transactions',  'READ', now(), now()),
    ('00000012-0012-4001-8001-000000000001', 'services',     'ALL',  now(), now()),
    ('00000012-0012-4001-8001-000000000002', 'services',     'READ', now(), now()),
    ('00000013-0013-4001-8001-000000000001', 'tax_profiles', 'ALL',  now(), now()),
    ('00000013-0013-4001-8001-000000000002', 'tax_profiles', 'READ', now(), now()),
    ('00000014-0014-4001-8001-000000000001', 'reports',      'READ', now(), now()),
    ('00000015-0015-4001-8001-000000000001', 'users',        'ALL',  now(), now()),
    ('00000015-0015-4001-8001-000000000002', 'users',        'READ', now(), now()),
    ('00000016-0016-4001-8001-000000000001', 'beneficiaries','ALL',  now(), now()),
    ('00000016-0016-4001-8001-000000000002', 'beneficiaries','READ', now(), now()),
    ('00000017-0017-4001-8001-000000000001', 'registrations','ALL',  now(), now()),
    ('00000017-0017-4001-8001-000000000002', 'registrations','READ', now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: RBAC — Role ↔ Permission Mappings
-- =============================================================================

INSERT INTO public.role_permissions (id, role_id, permission_id, created_at) VALUES
    -- super_admin: ALL on everything
    ('00000020-0020-4001-8001-000000000001', '00000001-0001-4001-8001-000000000001', '00000010-0010-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000002', '00000001-0001-4001-8001-000000000001', '00000011-0011-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000003', '00000001-0001-4001-8001-000000000001', '00000012-0012-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000004', '00000001-0001-4001-8001-000000000001', '00000013-0013-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000005', '00000001-0001-4001-8001-000000000001', '00000014-0014-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000006', '00000001-0001-4001-8001-000000000001', '00000015-0015-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000007', '00000001-0001-4001-8001-000000000001', '00000016-0016-4001-8001-000000000001', now()),
    ('00000020-0020-4001-8001-000000000008', '00000001-0001-4001-8001-000000000001', '00000017-0017-4001-8001-000000000001', now()),
    -- admin: ALL on transactions, residents, services, beneficiaries, registrations; READ on users
    ('00000021-0021-4001-8001-000000000001', '00000002-0002-4002-8002-000000000002', '00000010-0010-4001-8001-000000000001', now()),
    ('00000021-0021-4001-8001-000000000002', '00000002-0002-4002-8002-000000000002', '00000011-0011-4001-8001-000000000001', now()),
    ('00000021-0021-4001-8001-000000000003', '00000002-0002-4002-8002-000000000002', '00000012-0012-4001-8001-000000000001', now()),
    ('00000021-0021-4001-8001-000000000004', '00000002-0002-4002-8002-000000000002', '00000013-0013-4001-8001-000000000001', now()),
    ('00000021-0021-4001-8001-000000000005', '00000002-0002-4002-8002-000000000002', '00000014-0014-4001-8001-000000000001', now()),
    ('00000021-0021-4001-8001-000000000006', '00000002-0002-4002-8002-000000000002', '00000015-0015-4001-8001-000000000002', now()),
    ('00000021-0021-4001-8001-000000000007', '00000002-0002-4002-8002-000000000002', '00000016-0016-4001-8001-000000000001', now()),
    ('00000021-0021-4001-8001-000000000008', '00000002-0002-4002-8002-000000000002', '00000017-0017-4001-8001-000000000001', now()),
    -- encoder: ALL on transactions, residents, beneficiaries, registrations
    ('00000022-0022-4001-8001-000000000001', '00000003-0003-4003-8003-000000000003', '00000010-0010-4001-8001-000000000001', now()),
    ('00000022-0022-4001-8001-000000000002', '00000003-0003-4003-8003-000000000003', '00000011-0011-4001-8001-000000000001', now()),
    ('00000022-0022-4001-8001-000000000003', '00000003-0003-4003-8003-000000000003', '00000016-0016-4001-8001-000000000001', now()),
    ('00000022-0022-4001-8001-000000000004', '00000003-0003-4003-8003-000000000003', '00000017-0017-4001-8001-000000000001', now()),
    -- viewer: READ on everything
    ('00000023-0023-4001-8001-000000000001', '00000004-0004-4004-8004-000000000004', '00000010-0010-4001-8001-000000000002', now()),
    ('00000023-0023-4001-8001-000000000002', '00000004-0004-4004-8004-000000000004', '00000011-0011-4001-8001-000000000002', now()),
    ('00000023-0023-4001-8001-000000000003', '00000004-0004-4004-8004-000000000004', '00000012-0012-4001-8001-000000000002', now()),
    ('00000023-0023-4001-8001-000000000004', '00000004-0004-4004-8004-000000000004', '00000013-0013-4001-8001-000000000002', now()),
    ('00000023-0023-4001-8001-000000000005', '00000004-0004-4004-8004-000000000004', '00000014-0014-4001-8001-000000000001', now()),
    ('00000023-0023-4001-8001-000000000006', '00000004-0004-4004-8004-000000000004', '00000016-0016-4001-8001-000000000002', now()),
    ('00000023-0023-4001-8001-000000000007', '00000004-0004-4004-8004-000000000004', '00000017-0017-4001-8001-000000000002', now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: RBAC — Seed Admin User with super_admin role
-- =============================================================================
-- Creates the admin user and assigns the super_admin role.
-- Password: Admin1234! (bcrypt hash)
-- =============================================================================

INSERT INTO public.eservice_users (id, email, password, name, role, created_at, updated_at) VALUES
    ('00000301-0301-4001-8001-000000000001', 'admin@eservice.gov.ph', '$2b$10$y3QB5FpC8AWOLcfLbrij6eWCM0zJ8/t37k5Bj/UiKcNq6uf7yjoLe', 'System Admin', 'super_admin', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles (id, user_id, role_id, created_at) VALUES
    ('00000302-0302-4001-8001-000000000001', '00000301-0301-4001-8001-000000000001', '00000001-0001-4001-8001-000000000001', now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: Social Amelioration Settings (lookup values)
-- =============================================================================

INSERT INTO public.social_amelioration_settings (id, type, name, description, is_active, created_at, updated_at) VALUES
    ('00000401-0401-4001-8001-000000000001', 'PENSION_TYPE',        'Social Security Pension (SSP)',    'Monthly pension under SSS',                true, now(), now()),
    ('00000401-0401-4001-8001-000000000002', 'PENSION_TYPE',        'GSIS Pension',                     'Monthly pension under GSIS',               true, now(), now()),
    ('00000401-0401-4001-8001-000000000003', 'PENSION_TYPE',        'DSWD Social Pension',              'DSWD social pension for indigent seniors',  true, now(), now()),
    ('00000401-0401-4001-8001-000000000004', 'PENSION_TYPE',        'Other Pension',                    'Other pension source',                      true, now(), now()),
    ('00000402-0402-4001-8001-000000000001', 'DISABILITY_TYPE',     'Orthopedic / Physical',         'Mobility impairment',                       true, now(), now()),
    ('00000402-0402-4001-8001-000000000002', 'DISABILITY_TYPE',     'Visual Impairment',             'Partial or total blindness',                true, now(), now()),
    ('00000402-0402-4001-8001-000000000003', 'DISABILITY_TYPE',     'Hearing Impairment',            'Partial or total deafness',                 true, now(), now()),
    ('00000402-0402-4001-8001-000000000004', 'DISABILITY_TYPE',     'Speech Impairment',             'Communication disability',                  true, now(), now()),
    ('00000402-0402-4001-8001-000000000005', 'DISABILITY_TYPE',     'Intellectual / Mental',         'Intellectual or developmental disability',  true, now(), now()),
    ('00000402-0402-4001-8001-000000000006', 'DISABILITY_TYPE',     'Psychosocial',                  'Mental health-related disability',          true, now(), now()),
    ('00000402-0402-4001-8001-000000000007', 'DISABILITY_TYPE',     'Chronic Illness',               'Disability due to chronic disease',         true, now(), now()),
    ('00000402-0402-4001-8001-000000000008', 'DISABILITY_TYPE',     'Other Disability',              'Other type of disability',                  true, now(), now()),
    ('00000403-0403-4001-8001-000000000001', 'GRADE_LEVEL',         'Elementary (Grade 1–6)',            'Primary education level',                   true, now(), now()),
    ('00000403-0403-4001-8001-000000000002', 'GRADE_LEVEL',         'Junior High School (Grade 7–10)',   'Junior secondary education',                true, now(), now()),
    ('00000403-0403-4001-8001-000000000003', 'GRADE_LEVEL',         'Senior High School (Grade 11–12)',  'Senior secondary education',                true, now(), now()),
    ('00000403-0403-4001-8001-000000000004', 'GRADE_LEVEL',         'College / Undergraduate',           'Tertiary education',                        true, now(), now()),
    ('00000403-0403-4001-8001-000000000005', 'GRADE_LEVEL',         'Vocational / Technical',            'TESDA or vocational course',                true, now(), now()),
    ('00000404-0404-4001-8001-000000000001', 'SOLO_PARENT_CATEGORY', 'Widowed Parent',       'Parent due to death of spouse',             true, now(), now()),
    ('00000404-0404-4001-8001-000000000002', 'SOLO_PARENT_CATEGORY', 'Separated / Abandoned','Parent due to separation or abandonment',  true, now(), now()),
    ('00000404-0404-4001-8001-000000000003', 'SOLO_PARENT_CATEGORY', 'OFW Spouse',           'Spouse working abroad',                     true, now(), now()),
    ('00000404-0404-4001-8001-000000000004', 'SOLO_PARENT_CATEGORY', 'Unmarried Parent',     'Never-married solo parent',                 true, now(), now()),
    ('00000404-0404-4001-8001-000000000005', 'SOLO_PARENT_CATEGORY', 'Other',                'Other circumstance',                        true, now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: Government Programs
-- =============================================================================

INSERT INTO public.government_programs (id, name, description, types, is_active, created_at, updated_at) VALUES
    ('00000501-0501-4001-8001-000000000001', 'Libre Sakay',                  'Free bus services for the city residents',                   '{ALL}',            true, now(), now()),
    ('00000501-0501-4001-8001-000000000002', 'Libre Medisina',               'City Pharmacy Free Medicine Program',                      '{ALL}',            true, now(), now()),
    ('00000501-0501-4001-8001-000000000003', 'Direkta Ayuda',                'Student Financial Assistance Program',                     '{STUDENT}',        true, now(), now()),
    ('00000501-0501-4001-8001-000000000004', 'Senior Citizen Allowance',      'Monthly financial assistance for qualified senior citizens', '{SENIOR_CITIZEN}', true, now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: FAQs
-- =============================================================================

INSERT INTO public.faqs (id, question, answer, "order", is_active, created_at, updated_at) VALUES
    ('00000601-0601-4001-8001-000000000001',
     'How do I register on the portal?',
     'Click "Register" on the home page, complete the 4-step form with your personal details, address, ID document, and create a username and password. Your application will be reviewed by the local government unit within a few business days.',
     1, true, now(), now()),

    ('00000601-0601-4001-8001-000000000002',
     'What services are available online?',
     'You can request barangay certificates, business permits, and other documents online. Some services may require an in-person pickup.',
     2, true, now(), now()),

    ('00000601-0601-4001-8001-000000000003',
     'How do I track the status of my request?',
     'Log in to your account and go to "My Transactions" to view the real-time status of all your submitted requests.',
     3, true, now(), now()),

    ('00000601-0601-4001-8001-000000000004',
     'What payment methods are accepted?',
     'We accept GCash, PayMaya, bank transfer, and over-the-counter cash payments at the municipal hall.',
     4, true, now(), now()),

    ('00000601-0601-4001-8001-000000000005',
     'How do I view my Resident ID?',
     'Log in and go to "My Profile" then click "My ID" to view or download your Resident ID card.',
     5, true, now(), now()),

    ('00000601-0601-4001-8001-000000000006',
     'Can I log in with Google?',
     'Yes. On the login page, click "Continue with Google". Your Google account must match the email you registered with.',
     6, true, now(), now()),

    ('00000601-0601-4001-8001-000000000007',
     'How do I register my household?',
     'After your registration is approved and your account is active, log in and go to "My Household" to register your household and add family members using their Resident IDs.',
     7, true, now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: Services — Barangay Certificates
-- =============================================================================

INSERT INTO public.services (
    id, code, name, description, category, "order",
    is_active, requires_payment, default_amount, payment_statuses,
    form_fields, display_in_sidebar, display_in_subscriber_tabs,
    requires_appointment, created_at, updated_at
) VALUES

-- 1. Barangay Clearance
(
    '00000701-0701-4001-8001-000000000001',
    'BRGY_CLEARANCE',
    'Barangay Clearance',
    'Official certification that a person is a bona fide resident of good moral character with no pending violations or criminal record in the barangay.',
    'Barangay Certificate', 20,
    true, true, 50,
    '["PENDING","PAID","WAIVED"]',
    '{
        "certificate_type": "barangay_clearance",
        "fields": [
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "Local employment",                       "label": "Local Employment"},
                    {"value": "Abroad / OFW",                          "label": "Abroad / OFW"},
                    {"value": "Business loan / credit application",    "label": "Business Loan / Credit Application"},
                    {"value": "Business permit application",           "label": "Business Permit Application"},
                    {"value": "School enrollment / scholarship",       "label": "School Enrollment / Scholarship"},
                    {"value": "Legal / court purposes",                "label": "Legal / Court Purposes"},
                    {"value": "Travel",                                "label": "Travel"},
                    {"value": "PhilHealth / SSS / GSIS application",   "label": "PhilHealth / SSS / GSIS Application"},
                    {"value": "Personal use / others",                 "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "numberOfCopies",
                "type": "number",
                "label": "Number of Copies",
                "required": true,
                "placeholder": "1"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 2. Certificate of Indigency
(
    '00000701-0701-4001-8001-000000000002',
    'BRGY_INDIGENCY',
    'Certificate of Indigency',
    'Certifies that a person or household belongs to the low-income bracket and may qualify for government assistance, medical aid, or fee exemptions.',
    'Barangay Certificate', 21,
    true, false, 0,
    '["PENDING","WAIVED"]',
    '{
        "certificate_type": "indigency",
        "fields": [
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "Medical assistance",            "label": "Medical Assistance"},
                    {"value": "Burial assistance",             "label": "Burial Assistance"},
                    {"value": "Educational assistance",        "label": "Educational Assistance"},
                    {"value": "DSWD / MSWD application",     "label": "DSWD / MSWD Application"},
                    {"value": "Hospital bills",                "label": "Hospital Bills"},
                    {"value": "Legal / court purposes",        "label": "Legal / Court Purposes"},
                    {"value": "Government assistance program", "label": "Government Assistance Program"},
                    {"value": "Personal use / others",         "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "numberOfCopies",
                "type": "number",
                "label": "Number of Copies",
                "required": true,
                "placeholder": "1"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 3. Certificate of Residency
(
    '00000701-0701-4001-8001-000000000003',
    'BRGY_RESIDENCY',
    'Certificate of Residency',
    'Certifies that the applicant is a bona fide resident of the barangay for a specified period. Also known as Certificate of Domicile.',
    'Barangay Certificate', 22,
    true, true, 30,
    '["PENDING","PAID","WAIVED"]',
    '{
        "certificate_type": "residency",
        "fields": [
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "Local employment",                     "label": "Local Employment"},
                    {"value": "Abroad / OFW",                        "label": "Abroad / OFW"},
                    {"value": "Voter registration",                   "label": "Voter Registration"},
                    {"value": "School enrollment",                    "label": "School Enrollment"},
                    {"value": "PhilHealth / SSS / GSIS application", "label": "PhilHealth / SSS / GSIS Application"},
                    {"value": "Bank / loan application",             "label": "Bank / Loan Application"},
                    {"value": "Legal / court purposes",              "label": "Legal / Court Purposes"},
                    {"value": "Personal use / others",               "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "yearsOfResidency",
                "type": "number",
                "label": "Approximate Years of Residency in Barangay",
                "required": false,
                "placeholder": "e.g. 5"
            },
            {
                "name": "numberOfCopies",
                "type": "number",
                "label": "Number of Copies",
                "required": true,
                "placeholder": "1"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 4. Certificate of Good Moral Character
(
    '00000701-0701-4001-8001-000000000004',
    'BRGY_GOOD_MORAL',
    'Certificate of Good Moral Character',
    'Attests that the applicant is a person of good standing in the community with no known derogatory record in the barangay.',
    'Barangay Certificate', 23,
    true, true, 30,
    '["PENDING","PAID","WAIVED"]',
    '{
        "certificate_type": "good_moral",
        "fields": [
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "School enrollment / scholarship",   "label": "School Enrollment / Scholarship"},
                    {"value": "Local employment",                  "label": "Local Employment"},
                    {"value": "Abroad / OFW",                     "label": "Abroad / OFW"},
                    {"value": "College application",              "label": "College Application"},
                    {"value": "Government service / civil exam",  "label": "Government Service / Civil Service Exam"},
                    {"value": "Legal / court purposes",           "label": "Legal / Court Purposes"},
                    {"value": "Personal use / others",            "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "numberOfCopies",
                "type": "number",
                "label": "Number of Copies",
                "required": true,
                "placeholder": "1"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 5. Solo Parent Certificate
(
    '00000701-0701-4001-8001-000000000005',
    'BRGY_SOLO_PARENT',
    'Solo Parent Certificate',
    'Certifies that the applicant is a solo parent as defined under RA 8972 (Solo Parents'' Welfare Act), entitling them to government benefits.',
    'Barangay Certificate', 24,
    true, false, 0,
    '["PENDING","WAIVED"]',
    '{
        "certificate_type": "solo_parent",
        "fields": [
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "Solo parent ID application",          "label": "Solo Parent ID Application"},
                    {"value": "DSWD / MSWD benefits",                "label": "DSWD / MSWD Benefits"},
                    {"value": "Educational assistance for children", "label": "Educational Assistance for Children"},
                    {"value": "Parental leave",                      "label": "Parental Leave"},
                    {"value": "Personal use / others",               "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "circumstance",
                "type": "select",
                "label": "Reason for Solo Parenting",
                "required": true,
                "placeholder": "Select circumstance",
                "options": [
                    {"value": "Widowed",               "label": "Widowed"},
                    {"value": "Separated / abandoned", "label": "Separated / Abandoned"},
                    {"value": "Spouse is OFW",         "label": "Spouse is OFW"},
                    {"value": "Never married",         "label": "Never Married"},
                    {"value": "Other",                 "label": "Other"}
                ]
            },
            {
                "name": "numberOfChildren",
                "type": "number",
                "label": "Number of Dependent Children (below 18)",
                "required": true,
                "placeholder": "e.g. 2"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 6. Certificate of Low Income
(
    '00000701-0701-4001-8001-000000000006',
    'BRGY_LOW_INCOME',
    'Certificate of Low Income',
    'Certifies that the applicant has a low monthly household income, for use in assistance programs, fee waivers, and scholarship applications.',
    'Barangay Certificate', 25,
    true, false, 0,
    '["PENDING","WAIVED"]',
    '{
        "certificate_type": "low_income",
        "fields": [
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "Tuition fee waiver",            "label": "Tuition Fee Waiver"},
                    {"value": "Hospital bill discount",        "label": "Hospital Bill Discount"},
                    {"value": "Government assistance program", "label": "Government Assistance Program"},
                    {"value": "DSWD / MSWD application",     "label": "DSWD / MSWD Application"},
                    {"value": "PhilHealth indigency",          "label": "PhilHealth Indigency"},
                    {"value": "Personal use / others",         "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "monthlyIncome",
                "type": "number",
                "label": "Approximate Monthly Household Income (PHP)",
                "required": false,
                "placeholder": "e.g. 8000"
            },
            {
                "name": "numberOfDependents",
                "type": "number",
                "label": "Number of Dependents",
                "required": false,
                "placeholder": "e.g. 3"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 7. Burial Assistance Certificate
(
    '00000701-0701-4001-8001-000000000007',
    'BRGY_BURIAL',
    'Burial Assistance Certificate',
    'Certifies the eligibility of a bereaved family for burial assistance from the local government or social welfare office.',
    'Barangay Certificate', 26,
    true, false, 0,
    '["PENDING","WAIVED"]',
    '{
        "certificate_type": "burial_assistance",
        "fields": [
            {
                "name": "deceasedName",
                "type": "text",
                "label": "Full Name of Deceased",
                "required": true,
                "placeholder": "Enter full name"
            },
            {
                "name": "dateOfDeath",
                "type": "date",
                "label": "Date of Death",
                "required": true
            },
            {
                "name": "relationshipToDeceased",
                "type": "select",
                "label": "Your Relationship to the Deceased",
                "required": true,
                "placeholder": "Select relationship",
                "options": [
                    {"value": "Spouse",  "label": "Spouse"},
                    {"value": "Child",   "label": "Child"},
                    {"value": "Parent",  "label": "Parent"},
                    {"value": "Sibling", "label": "Sibling"},
                    {"value": "Other",   "label": "Other"}
                ]
            },
            {
                "name": "purpose",
                "type": "text",
                "label": "Where to Submit / Purpose",
                "required": true,
                "placeholder": "e.g. DSWD, MSWD, City Social Welfare Office"
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 8. Cohabitation Certificate
(
    '00000701-0701-4001-8001-000000000008',
    'BRGY_COHABITATION',
    'Cohabitation Certificate',
    'Certifies that two individuals are living together as husband and wife without the benefit of formal marriage.',
    'Barangay Certificate', 27,
    true, true, 30,
    '["PENDING","PAID","WAIVED"]',
    '{
        "certificate_type": "cohabitation",
        "fields": [
            {
                "name": "partnerFullName",
                "type": "text",
                "label": "Full Name of Partner",
                "required": true,
                "placeholder": "Enter full name of partner"
            },
            {
                "name": "yearsOfCohabitation",
                "type": "number",
                "label": "Approximate Years Living Together",
                "required": false,
                "placeholder": "e.g. 3"
            },
            {
                "name": "purpose",
                "type": "select",
                "label": "Purpose",
                "required": true,
                "placeholder": "Select purpose",
                "options": [
                    {"value": "Dependent enrollment (SSS / GSIS / PhilHealth)", "label": "Dependent Enrollment (SSS / GSIS / PhilHealth)"},
                    {"value": "Legal / court purposes",                          "label": "Legal / Court Purposes"},
                    {"value": "Bank / loan application",                         "label": "Bank / Loan Application"},
                    {"value": "Personal use / others",                           "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID"
            }
        ]
    }',
    true, true, false, now(), now()
),

-- 9. First Time Job Seeker Certificate (RA 11261)
(
    '00000701-0701-4001-8001-000000000009',
    'BRGY_FTSJ',
    'First Time Job Seeker Certificate',
    'Certifies that the applicant is a first-time job seeker eligible for fee exemptions on government documents under Republic Act 11261.',
    'Barangay Certificate', 28,
    true, false, 0,
    '["PENDING","WAIVED"]',
    '{
        "certificate_type": "first_time_job_seeker",
        "fields": [
            {
                "name": "purpose",
                "type": "text",
                "label": "Documents Being Applied For",
                "required": true,
                "placeholder": "e.g. NBI clearance, police clearance, passport"
            },
            {
                "name": "highestEducation",
                "type": "select",
                "label": "Highest Educational Attainment",
                "required": false,
                "placeholder": "Select",
                "options": [
                    {"value": "High school graduate",         "label": "High School Graduate"},
                    {"value": "Senior high school graduate",  "label": "Senior High School Graduate"},
                    {"value": "College graduate",             "label": "College Graduate"},
                    {"value": "Vocational / TESDA",           "label": "Vocational / TESDA"},
                    {"value": "Other",                        "label": "Other"}
                ]
            },
            {
                "name": "validId",
                "type": "file",
                "label": "Valid ID (photo)",
                "required": false,
                "placeholder": "Upload a photo of any government-issued ID (school ID accepted)"
            }
        ]
    }',
    true, true, false, now(), now()
)

ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- BIMS: Default Admin User
-- =============================================================================

ALTER TABLE public.bims_users DISABLE TRIGGER audit_bims_users_trigger;

INSERT INTO public.bims_users (
    target_type,
    target_id,
    full_name,
    email,
    password,
    role
) VALUES (
    'municipality',
    '1',
    'System Administrator',
    'admin@bims.gov.ph',
    '$2b$10$j1QPwuezqna1qV98KfLdRuyUHxqLl8TgNmpoVsIayGGqPqMmSbPq2',
    'admin'
) ON CONFLICT (email) DO NOTHING;

ALTER TABLE public.bims_users ENABLE TRIGGER audit_bims_users_trigger;


-- =============================================================================
-- BIMS: Default Municipality (for initial setup)
-- =============================================================================

INSERT INTO public.municipalities (
    municipality_name,
    municipality_code,
    gis_code,
    region,
    province,
    description,
    setup_status
) VALUES (
    'Unconfigured Municipality',
    'PENDING',
    NULL,
    '',
    '',
    'Barangay Information Management System',
    'pending'
) ON CONFLICT (municipality_name) DO NOTHING;

INSERT INTO public.resident_counters (municipality_id, year, counter, prefix)
SELECT m.id, EXTRACT(YEAR FROM CURRENT_DATE)::integer, 0, 'RES'
FROM public.municipalities m
WHERE m.setup_status = 'pending'
ON CONFLICT (municipality_id, year) DO NOTHING;


-- =============================================================================
-- Completion notice
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Seed data applied successfully (UUID v4) ===';
    RAISE NOTICE '  Roles:                        %', (SELECT COUNT(*) FROM public.roles);
    RAISE NOTICE '  Permissions:                  %', (SELECT COUNT(*) FROM public.permissions);
    RAISE NOTICE '  Role-Permission mappings:       %', (SELECT COUNT(*) FROM public.role_permissions);
    RAISE NOTICE '  Pages:                         %', (SELECT COUNT(*) FROM public.pages);
    RAISE NOTICE '  Role-Page mappings:            %', (SELECT COUNT(*) FROM public.role_pages);
    RAISE NOTICE '  User-Role mappings:             %', (SELECT COUNT(*) FROM public.user_roles);
    RAISE NOTICE '  Social amelioration settings:   %', (SELECT COUNT(*) FROM public.social_amelioration_settings);
    RAISE NOTICE '  Government programs:            %', (SELECT COUNT(*) FROM public.government_programs);
    RAISE NOTICE '  FAQs:                          %', (SELECT COUNT(*) FROM public.faqs);
    RAISE NOTICE '  Services (certificates):        %', (SELECT COUNT(*) FROM public.services WHERE category = 'Barangay Certificate');
END$$;
