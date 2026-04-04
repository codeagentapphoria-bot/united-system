-- =============================================================================
-- BIMS SEED DATA — Classification Types & Certificate Templates
-- =============================================================================
-- Seeds BIMS-specific reference data that must exist for each municipality.
-- Ported from:
--   barangay-information-management-system-copy/server/src/scripts/seed_classification_types.js
--   barangay-information-management-system-copy/server/src/scripts/seed_certificate_templates.js
--
-- HOW TO RUN:
--   Run after schema.sql and seed.sql have been applied and at least one
--   municipality exists (created via the Setup wizard or seed.sql).
--   psql "$UNIFIED_DB_URL" -f seed_bims.sql
--
-- IDEMPOTENT: Uses INSERT ... ON CONFLICT DO NOTHING throughout.
-- =============================================================================

SET search_path TO public;


-- =============================================================================
-- BIMS: Classification Types (per municipality)
-- =============================================================================

INSERT INTO classification_types (municipality_id, name, description, color, details)
SELECT m.id, v.name, v.description, v.color, v.details::jsonb
FROM municipalities m
CROSS JOIN (VALUES
  ('Senior Citizen',          'Residents aged 60 and above',                           '#FF9800', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Person with Disability',  'Individuals with physical or mental disabilities',       '#E91E63', '[{"key":"type","label":"Type of Disability","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Pregnant',                'Women who are currently pregnant',                       '#9C27B0', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Indigenous Person',       'Members of indigenous communities',                      '#795548', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Solo Parent',             'Single parents raising children alone',                  '#607D8B', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Overseas Filipino Worker','Filipinos working abroad',                               '#3F51B5', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Student',                 'Students enrolled in educational institutions',           '#2196F3', '[{"key":"educationLevel","label":"Education Level","type":"text"},{"key":"gradeLevel","label":"Grade Level","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Unemployed',              'Individuals currently without employment',                '#F44336', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Farmer',                  'Individuals engaged in farming activities',               '#4CAF50', '[{"key":"status","label":"Status","type":"select","options":["Land Owner","Rental"]},{"key":"type","label":"Type of Farmer","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Fisherman',               'Individuals engaged in fishing activities',               '#00BCD4', '[{"key":"status","label":"Status","type":"select","options":["Boat Owner","Passenger","Rental"]},{"key":"type","label":"Type of Fisherfolk","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Business Owner',          'Individuals who own and operate businesses',              '#FF5722', '[{"key":"type","label":"Type of Business","type":"text"},{"key":"permit","label":"Business Permit","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Government Employee',     'Individuals working in government agencies',              '#009688', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Private Employee',        'Individuals working in private companies',                '#FF9800', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Self Employed',           'Individuals working for themselves',                      '#4CAF50', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Retired',                 'Individuals who have retired from work',                  '#607D8B', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Housewife',               'Women who manage household duties',                       '#E91E63', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('4Ps Beneficiary',         'Beneficiaries of the Pantawid Pamilyang Pilipino Program','#8BC34A', '[{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Tricycle Driver',         'Individuals operating tricycles for public transport',    '#FF9800', '[{"key":"status","label":"Status","type":"select","options":["Owner","Rental"]},{"key":"plateNumber","label":"Plate Number","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('College Student',         'Students enrolled in college or university',              '#03A9F4', '[{"key":"collegeLevel","label":"College Level","type":"text"},{"key":"course","label":"Course","type":"text"},{"key":"remarks","label":"Remarks","type":"text"}]'),
  ('Voter',                   'Registered voters in the barangay',                       '#673AB7', '[{"key":"typeOfVoter","label":"Type of Voter","type":"select","options":["Regular","SK"]},{"key":"remarks","label":"Remarks","type":"text"}]')
) AS v(name, description, color, details)
ON CONFLICT (municipality_id, name) DO NOTHING;


-- =============================================================================
-- BIMS: Certificate Templates (per municipality)
-- =============================================================================
-- Tokens resolved at generation time by certificateService.resolvePlaceholders():
--   {{ resident.fullName }}   {{ resident.civilStatus }}  {{ resident.sex }}
--   {{ resident.birthdate }}  {{ resident.age }}          {{ resident.address }}
--   {{ barangay.name }}       {{ barangay.backgroundImg }}{{ barangay.logoImg }}
--   {{ municipality.name }}   {{ municipality.province }} {{ municipality.logoImg }}
--   {{ officials.captain }}
--   {{ request.purpose }}     {{ request.date }}          {{ request.referenceNumber }}
-- =============================================================================

INSERT INTO certificate_templates (municipality_id, certificate_type, name, description, html_content, is_active)
SELECT m.id, v.certificate_type, v.name, v.description, v.html_content, true
FROM municipalities m
CROSS JOIN (VALUES

-- ── 1. Barangay Clearance ──────────────────────────────────────────────────
(
  'barangay_clearance',
  'Barangay Clearance',
  'Certifies that the resident has no derogatory record in the barangay.',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>BARANGAY CLEARANCE</title>
  <style>
    @media print { @page { size: A4; margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 0; padding: 1in; font-size: 12pt; }
    .header { text-align: center; margin-bottom: 40px; }
    .header p { margin: 3px 0; font-style: italic; }
    .logo-row { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 100px; }
    .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 40px 0; text-decoration: underline; letter-spacing: 1px; }
    .body { text-align: justify; margin: 40px 0; line-height: 1.8; }
    .body p { text-indent: 40px; margin: 0 0 16px 0; }
    .bottom { margin-top: 60px; display: flex; flex-direction: column; min-height: 300px; }
    .date-line { text-align: left; margin-bottom: 20px; }
    .signature-line { text-align: right; margin-top: auto; }
    .signature-name { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
    .signature-title { margin-bottom: 3px; }
  </style>
</head>
<body>
  {{ barangay.backgroundImg }}
  <div class="header">
    <div class="logo-row">
      {{ municipality.logoImg }}
      <div style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ municipality.province }}</p>
        <p>Municipality of {{ municipality.name }}</p>
        <p>BARANGAY {{ barangay.name }}</p>
      </div>
      {{ barangay.logoImg }}
    </div>
  </div>
  <div class="title">BARANGAY CLEARANCE</div>
  <div class="body">
    <p>This is to certify that <strong>{{ resident.fullName }}</strong>, {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }}, and a resident of <strong>{{ resident.address }}</strong>, Barangay <strong>{{ barangay.name }}</strong>, Municipality of <strong>{{ municipality.name }}</strong>, Province of <strong>{{ municipality.province }}</strong>, is known to be a person of good standing and without any derogatory record filed in this barangay.</p>
    <p>This clearance is issued upon the request of the above-named individual for <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.</p>
  </div>
  <div class="bottom">
    <div class="date-line">Issued this {{ request.date }} at Barangay {{ barangay.name }}, {{ municipality.name }} for whatever legal purpose this may serve.</div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>
</body>
</html>$html$
),

-- ── 2. Certificate of Residency ───────────────────────────────────────────
(
  'residency',
  'Certificate of Residency',
  'Certifies that the person is a bonafide resident of the barangay.',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CERTIFICATE OF RESIDENCY</title>
  <style>
    @media print { @page { size: A4; margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 0; padding: 1in; font-size: 12pt; }
    .header { text-align: center; margin-bottom: 40px; }
    .header p { margin: 3px 0; font-style: italic; }
    .logo-row { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 100px; }
    .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 40px 0; text-decoration: underline; letter-spacing: 1px; }
    .body { text-align: justify; margin: 40px 0; line-height: 1.8; }
    .body p { text-indent: 40px; margin: 0 0 16px 0; }
    .bottom { margin-top: 60px; display: flex; flex-direction: column; min-height: 300px; }
    .date-line { text-align: left; margin-bottom: 20px; }
    .signature-line { text-align: right; margin-top: auto; }
    .signature-name { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
    .signature-title { margin-bottom: 3px; }
  </style>
</head>
<body>
  {{ barangay.backgroundImg }}
  <div class="header">
    <div class="logo-row">
      {{ municipality.logoImg }}
      <div style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ municipality.province }}</p>
        <p>Municipality of {{ municipality.name }}</p>
        <p>BARANGAY {{ barangay.name }}</p>
      </div>
      {{ barangay.logoImg }}
    </div>
  </div>
  <div class="title">CERTIFICATE OF RESIDENCY</div>
  <div class="body">
    <p>This is to certify that <strong>{{ resident.fullName }}</strong>, {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }}, and a bonafide resident of Barangay <strong>{{ barangay.name }}</strong>, Municipality of <strong>{{ municipality.name }}</strong>, Province of <strong>{{ municipality.province }}</strong>, and has been residing at <strong>{{ resident.address }}</strong> for a period of several years up to the present.</p>
    <p>This certificate is issued upon the request of the aforementioned resident for <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.</p>
  </div>
  <div class="bottom">
    <div class="date-line">Issued this {{ request.date }} at Barangay {{ barangay.name }}, {{ municipality.name }} for whatever legal purpose this may serve.</div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>
</body>
</html>$html$
),

-- ── 3. Certificate of Indigency ───────────────────────────────────────────
(
  'indigency',
  'Certificate of Indigency',
  'Certifies that the resident belongs to the indigent sector.',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CERTIFICATE OF INDIGENCY</title>
  <style>
    @media print { @page { size: A4; margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 0; padding: 1in; font-size: 12pt; }
    .header { text-align: center; margin-bottom: 40px; }
    .header p { margin: 3px 0; font-style: italic; }
    .logo-row { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 100px; }
    .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 40px 0; text-decoration: underline; letter-spacing: 1px; }
    .body { text-align: justify; margin: 40px 0; line-height: 1.8; }
    .body p { text-indent: 40px; margin: 0 0 16px 0; }
    .bottom { margin-top: 60px; display: flex; flex-direction: column; min-height: 300px; }
    .date-line { text-align: left; margin-bottom: 20px; }
    .signature-line { text-align: right; margin-top: auto; }
    .signature-name { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
    .signature-title { margin-bottom: 3px; }
  </style>
</head>
<body>
  {{ barangay.backgroundImg }}
  <div class="header">
    <div class="logo-row">
      {{ municipality.logoImg }}
      <div style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ municipality.province }}</p>
        <p>Municipality of {{ municipality.name }}</p>
        <p>BARANGAY {{ barangay.name }}</p>
      </div>
      {{ barangay.logoImg }}
    </div>
  </div>
  <div class="title">CERTIFICATE OF INDIGENCY</div>
  <div class="body">
    <p>This is to certify that <strong>{{ resident.fullName }}</strong>, {{ resident.age }} years of age, {{ resident.civilStatus }}, and a resident of <strong>{{ resident.address }}</strong>, Barangay <strong>{{ barangay.name }}</strong>, Municipality of <strong>{{ municipality.name }}</strong>, Province of <strong>{{ municipality.province }}</strong>, is a bona fide resident of this barangay and is considered an indigent.</p>
    <p>This certificate is issued for the purpose of <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.</p>
  </div>
  <div class="bottom">
    <div class="date-line">Issued this {{ request.date }} at Barangay {{ barangay.name }}, {{ municipality.name }} for whatever legal purpose this may serve.</div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>
</body>
</html>$html$
),

-- ── 4. Certificate of Good Moral Character ────────────────────────────────
(
  'good_moral',
  'Certificate of Good Moral Character',
  'Certifies that the resident is of good moral character.',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CERTIFICATE OF GOOD MORAL CHARACTER</title>
  <style>
    @media print { @page { size: A4; margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 0; padding: 1in; font-size: 12pt; }
    .header { text-align: center; margin-bottom: 40px; }
    .header p { margin: 3px 0; font-style: italic; }
    .logo-row { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 100px; }
    .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 40px 0; text-decoration: underline; letter-spacing: 1px; }
    .body { text-align: justify; margin: 40px 0; line-height: 1.8; }
    .body p { text-indent: 40px; margin: 0 0 16px 0; }
    .bottom { margin-top: 60px; display: flex; flex-direction: column; min-height: 300px; }
    .date-line { text-align: left; margin-bottom: 20px; }
    .signature-line { text-align: right; margin-top: auto; }
    .signature-name { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
    .signature-title { margin-bottom: 3px; }
  </style>
</head>
<body>
  {{ barangay.backgroundImg }}
  <div class="header">
    <div class="logo-row">
      {{ municipality.logoImg }}
      <div style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ municipality.province }}</p>
        <p>Municipality of {{ municipality.name }}</p>
        <p>BARANGAY {{ barangay.name }}</p>
      </div>
      {{ barangay.logoImg }}
    </div>
  </div>
  <div class="title">CERTIFICATE OF GOOD MORAL CHARACTER</div>
  <div class="body">
    <p>This is to certify that <strong>{{ resident.fullName }}</strong>, {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }}, and a resident of <strong>{{ resident.address }}</strong>, Barangay <strong>{{ barangay.name }}</strong>, Municipality of <strong>{{ municipality.name }}</strong>, Province of <strong>{{ municipality.province }}</strong>, is known to be a person of good moral character, law-abiding, and has not been involved in any unlawful or immoral activity within the community.</p>
    <p>This certificate is issued upon request of the above-named individual for <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.</p>
  </div>
  <div class="bottom">
    <div class="date-line">Issued this {{ request.date }} at Barangay {{ barangay.name }}, {{ municipality.name }} for whatever legal purpose this may serve.</div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>
</body>
</html>$html$
),

-- ── 5. Barangay Business Clearance ────────────────────────────────────────
(
  'business_clearance',
  'Barangay Business Clearance',
  'Grants clearance for a business to operate within the barangay.',
  $html$<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>BARANGAY BUSINESS CLEARANCE</title>
  <style>
    @media print { @page { size: A4; margin: 0; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    body { font-family: 'Times New Roman', serif; line-height: 1.6; margin: 0; padding: 1in; font-size: 12pt; }
    .header { text-align: center; margin-bottom: 40px; }
    .header p { margin: 3px 0; font-style: italic; }
    .logo-row { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; gap: 100px; }
    .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 40px 0; text-decoration: underline; letter-spacing: 1px; }
    .body { text-align: justify; margin: 40px 0; line-height: 1.8; }
    .body p { text-indent: 40px; margin: 0 0 16px 0; }
    .bottom { margin-top: 60px; display: flex; flex-direction: column; min-height: 300px; }
    .date-line { text-align: left; margin-bottom: 20px; }
    .signature-line { text-align: right; margin-top: auto; }
    .signature-name { font-weight: bold; text-decoration: underline; margin-bottom: 5px; }
    .signature-title { margin-bottom: 3px; }
  </style>
</head>
<body>
  {{ barangay.backgroundImg }}
  <div class="header">
    <div class="logo-row">
      {{ municipality.logoImg }}
      <div style="text-align: center;">
        <p>Republic of the Philippines</p>
        <p>Province of {{ municipality.province }}</p>
        <p>Municipality of {{ municipality.name }}</p>
        <p>BARANGAY {{ barangay.name }}</p>
      </div>
      {{ barangay.logoImg }}
    </div>
  </div>
  <div class="title">BARANGAY BUSINESS CLEARANCE</div>
  <div class="body">
    <p>This is to certify that <strong>{{ resident.fullName }}</strong>, {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }}, and a resident of <strong>{{ resident.address }}</strong>, Barangay <strong>{{ barangay.name }}</strong>, Municipality of <strong>{{ municipality.name }}</strong>, Province of <strong>{{ municipality.province }}</strong>, has complied with the requirements of the barangay and is hereby granted this Barangay Business Clearance.</p>
    <p>This clearance is issued for the purpose of securing a Mayor''s Permit / Business Permit and is valid for the current year unless otherwise revoked.</p>
  </div>
  <div class="bottom">
    <div class="date-line">Issued this {{ request.date }} at Barangay {{ barangay.name }}, {{ municipality.name }} for whatever legal purpose this may serve.</div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>
</body>
</html>$html$
)

) AS v(certificate_type, name, description, html_content)
ON CONFLICT (municipality_id, certificate_type) DO NOTHING;


-- =============================================================================
-- Completion notice
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '=== BIMS seed data applied successfully ===';
    RAISE NOTICE '  Classification types: %', (SELECT COUNT(*) FROM public.classification_types);
    RAISE NOTICE '  Certificate templates: %', (SELECT COUNT(*) FROM public.certificate_templates);
END$$;
