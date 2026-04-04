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
-- =============================================================================

SET search_path TO public;


-- =============================================================================
-- E-Services: RBAC — Default Roles & Permissions
-- =============================================================================

INSERT INTO public.roles (id, name, description, created_at, updated_at) VALUES
    ('role-super-admin', 'super_admin', 'Full system access',                   now(), now()),
    ('role-admin',       'admin',       'Standard admin access',                now(), now()),
    ('role-encoder',     'encoder',     'Data entry and transaction processing', now(), now()),
    ('role-viewer',      'viewer',      'Read-only access',                     now(), now())
ON CONFLICT (id) DO NOTHING;


-- Core resource permissions
INSERT INTO public.permissions (id, resource, action, created_at, updated_at) VALUES
    ('perm-residents-all',      'residents',       'ALL',  now(), now()),
    ('perm-residents-read',     'residents',       'READ', now(), now()),
    ('perm-transactions-all',   'transactions',    'ALL',  now(), now()),
    ('perm-transactions-read',  'transactions',    'READ', now(), now()),
    ('perm-services-all',       'services',        'ALL',  now(), now()),
    ('perm-services-read',      'services',        'READ', now(), now()),
    ('perm-tax-all',            'tax_profiles',    'ALL',  now(), now()),
    ('perm-tax-read',           'tax_profiles',    'READ', now(), now()),
    ('perm-reports-read',       'reports',         'READ', now(), now()),
    ('perm-users-all',          'users',           'ALL',  now(), now()),
    ('perm-users-read',         'users',           'READ', now(), now()),
    ('perm-beneficiaries-all',  'beneficiaries',   'ALL',  now(), now()),
    ('perm-beneficiaries-read', 'beneficiaries',   'READ', now(), now()),
    ('perm-registrations-all',  'registrations',   'ALL',  now(), now()),
    ('perm-registrations-read', 'registrations',   'READ', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Role ↔ Permission mappings
INSERT INTO public.role_permissions (id, role_id, permission_id, created_at) VALUES
    -- super_admin: ALL on everything
    ('rp-sa-res-all',   'role-super-admin', 'perm-residents-all',      now()),
    ('rp-sa-txn-all',   'role-super-admin', 'perm-transactions-all',   now()),
    ('rp-sa-svc-all',   'role-super-admin', 'perm-services-all',       now()),
    ('rp-sa-tax-all',   'role-super-admin', 'perm-tax-all',            now()),
    ('rp-sa-rep-read',  'role-super-admin', 'perm-reports-read',       now()),
    ('rp-sa-usr-all',   'role-super-admin', 'perm-users-all',          now()),
    ('rp-sa-ben-all',   'role-super-admin', 'perm-beneficiaries-all',  now()),
    ('rp-sa-reg-all',   'role-super-admin', 'perm-registrations-all',  now()),
    -- admin: ALL on transactions, residents, services; READ on users
    ('rp-ad-res-all',   'role-admin', 'perm-residents-all',      now()),
    ('rp-ad-txn-all',   'role-admin', 'perm-transactions-all',   now()),
    ('rp-ad-svc-all',   'role-admin', 'perm-services-all',       now()),
    ('rp-ad-tax-all',   'role-admin', 'perm-tax-all',            now()),
    ('rp-ad-rep-read',  'role-admin', 'perm-reports-read',       now()),
    ('rp-ad-usr-read',  'role-admin', 'perm-users-read',         now()),
    ('rp-ad-ben-all',   'role-admin', 'perm-beneficiaries-all',  now()),
    ('rp-ad-reg-all',   'role-admin', 'perm-registrations-all',  now()),
    -- encoder: ALL on transactions and residents
    ('rp-en-res-all',   'role-encoder', 'perm-residents-all',     now()),
    ('rp-en-txn-all',   'role-encoder', 'perm-transactions-all',  now()),
    ('rp-en-ben-all',   'role-encoder', 'perm-beneficiaries-all', now()),
    ('rp-en-reg-all',   'role-encoder', 'perm-registrations-all', now()),
    -- viewer: READ on everything
    ('rp-vw-res-read',  'role-viewer', 'perm-residents-read',     now()),
    ('rp-vw-txn-read',  'role-viewer', 'perm-transactions-read',  now()),
    ('rp-vw-svc-read',  'role-viewer', 'perm-services-read',      now()),
    ('rp-vw-tax-read',  'role-viewer', 'perm-tax-read',           now()),
    ('rp-vw-rep-read',  'role-viewer', 'perm-reports-read',       now()),
    ('rp-vw-ben-read',  'role-viewer', 'perm-beneficiaries-read', now()),
    ('rp-vw-reg-read',  'role-viewer', 'perm-registrations-read', now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: Social Amelioration Settings (lookup values)
-- =============================================================================

INSERT INTO public.social_amelioration_settings (id, type, name, description, is_active, created_at, updated_at) VALUES
    -- Pension types (senior citizen)
    ('sas-pt-ssp',    'PENSION_TYPE', 'Social Security Pension (SSP)',    'Monthly pension under SSS',                true, now(), now()),
    ('sas-pt-gsis',   'PENSION_TYPE', 'GSIS Pension',                     'Monthly pension under GSIS',               true, now(), now()),
    ('sas-pt-dswd',   'PENSION_TYPE', 'DSWD Social Pension',              'DSWD social pension for indigent seniors',  true, now(), now()),
    ('sas-pt-other',  'PENSION_TYPE', 'Other Pension',                    'Other pension source',                      true, now(), now()),
    -- Disability types (PWD)
    ('sas-dt-ortho',  'DISABILITY_TYPE', 'Orthopedic / Physical',         'Mobility impairment',                       true, now(), now()),
    ('sas-dt-visual', 'DISABILITY_TYPE', 'Visual Impairment',             'Partial or total blindness',                true, now(), now()),
    ('sas-dt-hearing','DISABILITY_TYPE', 'Hearing Impairment',            'Partial or total deafness',                 true, now(), now()),
    ('sas-dt-speech', 'DISABILITY_TYPE', 'Speech Impairment',             'Communication disability',                  true, now(), now()),
    ('sas-dt-mental', 'DISABILITY_TYPE', 'Intellectual / Mental',         'Intellectual or developmental disability',  true, now(), now()),
    ('sas-dt-psycho', 'DISABILITY_TYPE', 'Psychosocial',                  'Mental health-related disability',          true, now(), now()),
    ('sas-dt-chronic','DISABILITY_TYPE', 'Chronic Illness',               'Disability due to chronic disease',         true, now(), now()),
    ('sas-dt-other',  'DISABILITY_TYPE', 'Other Disability',              'Other type of disability',                  true, now(), now()),
    -- Grade levels (student)
    ('sas-gl-elem',   'GRADE_LEVEL', 'Elementary (Grade 1–6)',            'Primary education level',                   true, now(), now()),
    ('sas-gl-jhs',    'GRADE_LEVEL', 'Junior High School (Grade 7–10)',   'Junior secondary education',                true, now(), now()),
    ('sas-gl-shs',    'GRADE_LEVEL', 'Senior High School (Grade 11–12)',  'Senior secondary education',                true, now(), now()),
    ('sas-gl-college','GRADE_LEVEL', 'College / Undergraduate',           'Tertiary education',                        true, now(), now()),
    ('sas-gl-voctech','GRADE_LEVEL', 'Vocational / Technical',            'TESDA or vocational course',                true, now(), now()),
    -- Solo parent categories
    ('sas-sp-widowed',    'SOLO_PARENT_CATEGORY', 'Widowed Parent',       'Parent due to death of spouse',             true, now(), now()),
    ('sas-sp-separated',  'SOLO_PARENT_CATEGORY', 'Separated / Abandoned','Parent due to separation or abandonment',  true, now(), now()),
    ('sas-sp-ofw',        'SOLO_PARENT_CATEGORY', 'OFW Spouse',           'Spouse working abroad',                     true, now(), now()),
    ('sas-sp-unmarried',  'SOLO_PARENT_CATEGORY', 'Unmarried Parent',     'Never-married solo parent',                 true, now(), now()),
    ('sas-sp-other',      'SOLO_PARENT_CATEGORY', 'Other',                'Other circumstance',                        true, now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: Government Programs
-- =============================================================================

INSERT INTO public.government_programs (id, name, description, type, is_active, created_at, updated_at) VALUES
    ('gp-sc-osca',       '4Ps / OSCA Benefits',         'Pantawid Pamilyang Pilipino Program for senior citizens', 'SENIOR_CITIZEN', true, now(), now()),
    ('gp-sc-philhealth', 'PhilHealth Senior',            'PhilHealth coverage for senior citizens',                 'SENIOR_CITIZEN', true, now(), now()),
    ('gp-pwd-main',      'PWD Benefits Program',         'National PWD financial assistance and benefits',          'PWD',            true, now(), now()),
    ('gp-pwd-assist',    'Assistive Device Program',     'Government-issued assistive devices for PWD',             'PWD',            true, now(), now()),
    ('gp-st-ched',       'CHED Scholarships',            'Commission on Higher Education scholarship grants',       'STUDENT',        true, now(), now()),
    ('gp-st-deped',      'DepEd Educational Assistance', 'Department of Education student assistance program',      'STUDENT',        true, now(), now()),
    ('gp-sp-ra8972',     'RA 8972 Solo Parent Benefits', 'Benefits under the Solo Parents'' Welfare Act',           'SOLO_PARENT',    true, now(), now()),
    ('gp-all-4ps',       '4Ps (All Beneficiary Types)',  'Pantawid Pamilyang Pilipino Program (general)',           'ALL',            true, now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: FAQs (placeholder — update content via admin UI)
-- =============================================================================

INSERT INTO public.faqs (id, question, answer, "order", is_active, created_at, updated_at) VALUES
    ('faq-01',
     'How do I register on the portal?',
     'Click "Register" on the home page, complete the 4-step form with your personal details, address, ID document, and create a username and password. Your application will be reviewed by the local government unit within a few business days.',
     1, true, now(), now()),

    ('faq-02',
     'What services are available online?',
     'You can request barangay certificates, business permits, and other documents online. Some services may require an in-person pickup.',
     2, true, now(), now()),

    ('faq-03',
     'How do I track the status of my request?',
     'Log in to your account and go to "My Transactions" to view the real-time status of all your submitted requests.',
     3, true, now(), now()),

    ('faq-04',
     'What payment methods are accepted?',
     'We accept GCash, PayMaya, bank transfer, and over-the-counter cash payments at the municipal hall.',
     4, true, now(), now()),

    ('faq-05',
     'How do I view my Resident ID?',
     'Log in and go to "My Profile" then click "My ID" to view or download your Resident ID card.',
     5, true, now(), now()),

    ('faq-06',
     'Can I log in with Google?',
     'Yes. On the login page, click "Continue with Google". Your Google account must match the email you registered with.',
     6, true, now(), now()),

    ('faq-07',
     'How do I register my household?',
     'After your registration is approved and your account is active, log in and go to "My Household" to register your household and add family members using their Resident IDs.',
     7, true, now(), now())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- E-Services: Services — Barangay Certificates (item 18)
-- =============================================================================
-- These entries appear in the portal E-Government page under the
-- "Barangay Certificate" category, enabling residents and guests to apply
-- online for the most common barangay-issued documents.
--
-- Key design notes:
--   • form_fields.certificate_type links each service to the matching
--     certificate_templates.certificate_type, so the BIMS frontend can
--     auto-select the right template when generating a PDF.
--   • payment_statuses lists the valid values for transactions.payment_status.
--   • requires_payment / default_amount: most certificates carry a small
--     documentary stamp fee; indigency/solo-parent/FTSJ are typically free
--     (payment_status = WAIVED by staff at release time).
--   • All 9 codes match the CERTIFICATE_TYPES list in TemplateEditorPage.jsx.
-- =============================================================================

INSERT INTO public.services (
    id, code, name, description, category, "order",
    is_active, requires_payment, default_amount, payment_statuses,
    form_fields, display_in_sidebar, display_in_subscriber_tabs,
    requires_appointment, created_at, updated_at
) VALUES

-- ── 1. Barangay Clearance ─────────────────────────────────────────────────────
(
    'svc-brgy-clearance',
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

-- ── 2. Certificate of Indigency ───────────────────────────────────────────────
(
    'svc-brgy-indigency',
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
                    {"value": "DSWD / MSWD application",       "label": "DSWD / MSWD Application"},
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

-- ── 3. Certificate of Residency ───────────────────────────────────────────────
(
    'svc-brgy-residency',
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

-- ── 4. Certificate of Good Moral Character ────────────────────────────────────
(
    'svc-brgy-good-moral',
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

-- ── 5. Solo Parent Certificate ────────────────────────────────────────────────
(
    'svc-brgy-solo-parent',
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

-- ── 6. Certificate of Low Income ──────────────────────────────────────────────
(
    'svc-brgy-low-income',
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
                    {"value": "DSWD / MSWD application",       "label": "DSWD / MSWD Application"},
                    {"value": "PhilHealth indigency",          "label": "PhilHealth Indigency"},
                    {"value": "Personal use / others",         "label": "Personal Use / Others"}
                ]
            },
            {
                "name": "monthlyIncome",
                "type": "number",
                "label": "Approximate Monthly Household Income (₱)",
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

-- ── 7. Burial Assistance Certificate ─────────────────────────────────────────
(
    'svc-brgy-burial',
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

-- ── 8. Cohabitation Certificate ───────────────────────────────────────────────
(
    'svc-brgy-cohabitation',
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

-- ── 9. First Time Job Seeker Certificate (RA 11261) ───────────────────────────
(
    'svc-brgy-ftsj',
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
-- Disable audit trigger to avoid null record_id error during seed
ALTER TABLE public.bims_users DISABLE TRIGGER audit_bims_users_trigger;

-- Password: Admin1234! (bcrypt hash)
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
-- E-Services: Default Admin User
-- =============================================================================
-- Password: Admin1234! (bcrypt hash)
INSERT INTO public.eservice_users (
    email,
    password,
    name,
    role
) VALUES (
    'admin@eservice.gov.ph',
    '$2b$10$y3QB5FpC8AWOLcfLbrij6eWCM0zJ8/t37k5Bj/UiKcNq6uf7yjoLe',
    'System Admin',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- BIMS: Default Municipality (for initial setup)
-- =============================================================================
-- This creates a placeholder municipality that can be configured via the Setup wizard.
-- The municipality is created in 'pending' status and must be activated through
-- the BIMS admin UI (Setup page) which creates barangays from GIS data.

-- Placeholder municipality — name and GIS code are overwritten during the Setup wizard.
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

-- Resident counter for generating resident IDs
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
    RAISE NOTICE '=== Seed data applied successfully (v2) ===';
    RAISE NOTICE '  Roles:                        %', (SELECT COUNT(*) FROM public.roles);
    RAISE NOTICE '  Permissions:                  %', (SELECT COUNT(*) FROM public.permissions);
    RAISE NOTICE '  Role-Permission mappings:     %', (SELECT COUNT(*) FROM public.role_permissions);
    RAISE NOTICE '  Social amelioration settings: %', (SELECT COUNT(*) FROM public.social_amelioration_settings);
    RAISE NOTICE '  Government programs:          %', (SELECT COUNT(*) FROM public.government_programs);
    RAISE NOTICE '  FAQs:                         %', (SELECT COUNT(*) FROM public.faqs);
    RAISE NOTICE '  Services (certificates):      %', (SELECT COUNT(*) FROM public.services WHERE category = 'Barangay Certificate');
END$$;
