/**
 * seed_certificate_templates.js
 *
 * Seeds the default certificate HTML templates into every municipality.
 * Templates are ported from the original BIMS (archive/barangay-information-management-system-original)
 * and converted from JS template-literal format to the {{ token }} placeholder syntax
 * understood by certificateService.resolvePlaceholders().
 *
 * Available tokens (resolved at generation time):
 *   {{ resident.fullName }}     {{ resident.civilStatus }}   {{ resident.sex }}
 *   {{ resident.birthdate }}    {{ resident.age }}           {{ resident.address }}
 *   {{ barangay.name }}
 *   {{ municipality.name }}     {{ municipality.province }}
 *   {{ officials.captain }}
 *   {{ request.purpose }}       {{ request.date }}           {{ request.referenceNumber }}
 *
 * Run:
 *   node src/scripts/seed_certificate_templates.js
 */

import { Pool } from 'pg';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

loadEnvConfig();

const pool = new Pool({
  user:     process.env.PG_USER,
  host:     process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port:     process.env.PG_PORT || 5432,
  ssl:      process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// =============================================================================
// Shared CSS + HTML shell
// Logos (municipality / barangay) are left as empty placeholder divs here.
// After seeding, admins can edit the template to embed their logo URLs or
// use a background image via the template editor.
// =============================================================================

const buildTemplate = (title, bodyParagraphs) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    body {
      font-family: 'Times New Roman', serif;
      line-height: 1.6;
      margin: 0;
      padding: 1in;
      font-size: 12pt;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header p {
      margin: 3px 0;
      font-style: italic;
    }

    .logo-row {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 20px;
      gap: 100px;
    }

    .title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin: 40px 0;
      text-decoration: underline;
      letter-spacing: 1px;
    }

    .body {
      text-align: justify;
      margin: 40px 0;
      line-height: 1.8;
    }

    .body p {
      text-indent: 40px;
      margin: 0 0 16px 0;
    }

    .bottom {
      margin-top: 60px;
      display: flex;
      flex-direction: column;
      min-height: 300px;
    }

    .date-line {
      text-align: left;
      margin-bottom: 20px;
    }

    .signature-line {
      text-align: right;
      margin-top: auto;
    }

    .signature-name {
      font-weight: bold;
      text-decoration: underline;
      margin-bottom: 5px;
    }

    .signature-title {
      margin-bottom: 3px;
    }
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

  <div class="title">${title}</div>

  <div class="body">
    ${bodyParagraphs}
  </div>

  <div class="bottom">
    <div class="date-line">
      Issued this {{ request.date }} at Barangay {{ barangay.name }},
      {{ municipality.name }} for whatever legal purpose this may serve.
    </div>
    <div class="signature-line">
      <div class="signature-name">{{ officials.captain }}</div>
      <div class="signature-title">Punong Barangay</div>
    </div>
  </div>

</body>
</html>`;

// =============================================================================
// The 5 default certificate templates (ported from original BIMS)
// =============================================================================

const CERTIFICATE_TEMPLATES = [
  // ── 1. Barangay Clearance ──────────────────────────────────────────────────
  {
    certificate_type: 'barangay_clearance',
    name:             'Barangay Clearance',
    description:      'Certifies that the resident has no derogatory record in the barangay.',
    html_content: buildTemplate(
      'BARANGAY CLEARANCE',
      `<p>
        This is to certify that <strong>{{ resident.fullName }}</strong>,
        {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }},
        and a resident of <strong>{{ resident.address }}</strong>,
        Barangay <strong>{{ barangay.name }}</strong>,
        Municipality of <strong>{{ municipality.name }}</strong>,
        Province of <strong>{{ municipality.province }}</strong>,
        is known to be a person of good standing and without any derogatory record
        filed in this barangay.
      </p>
      <p>
        This clearance is issued upon the request of the above-named individual for
        <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.
      </p>`,
    ),
  },

  // ── 2. Certificate of Residency ────────────────────────────────────────────
  {
    certificate_type: 'residency',
    name:             'Certificate of Residency',
    description:      'Certifies that the person is a bonafide resident of the barangay.',
    html_content: buildTemplate(
      'CERTIFICATE OF RESIDENCY',
      `<p>
        This is to certify that <strong>{{ resident.fullName }}</strong>,
        {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }},
        and a bonafide resident of Barangay <strong>{{ barangay.name }}</strong>,
        Municipality of <strong>{{ municipality.name }}</strong>,
        Province of <strong>{{ municipality.province }}</strong>,
        and has been residing at <strong>{{ resident.address }}</strong>
        for a period of several years up to the present.
      </p>
      <p>
        This certificate is issued upon the request of the aforementioned resident for
        <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.
      </p>`,
    ),
  },

  // ── 3. Certificate of Indigency ────────────────────────────────────────────
  {
    certificate_type: 'indigency',
    name:             'Certificate of Indigency',
    description:      'Certifies that the resident belongs to the indigent sector.',
    html_content: buildTemplate(
      'CERTIFICATE OF INDIGENCY',
      `<p>
        This is to certify that <strong>{{ resident.fullName }}</strong>,
        {{ resident.age }} years of age, {{ resident.civilStatus }},
        and a resident of <strong>{{ resident.address }}</strong>,
        Barangay <strong>{{ barangay.name }}</strong>,
        Municipality of <strong>{{ municipality.name }}</strong>,
        Province of <strong>{{ municipality.province }}</strong>,
        is a bona fide resident of this barangay and is considered an indigent.
      </p>
      <p>
        This certificate is issued for the purpose of
        <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.
      </p>`,
    ),
  },

  // ── 4. Certificate of Good Moral Character ─────────────────────────────────
  {
    certificate_type: 'good_moral',
    name:             'Certificate of Good Moral Character',
    description:      'Certifies that the resident is of good moral character.',
    html_content: buildTemplate(
      'CERTIFICATE OF GOOD MORAL CHARACTER',
      `<p>
        This is to certify that <strong>{{ resident.fullName }}</strong>,
        {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }},
        and a resident of <strong>{{ resident.address }}</strong>,
        Barangay <strong>{{ barangay.name }}</strong>,
        Municipality of <strong>{{ municipality.name }}</strong>,
        Province of <strong>{{ municipality.province }}</strong>,
        is known to be a person of good moral character, law-abiding, and has not been
        involved in any unlawful or immoral activity within the community.
      </p>
      <p>
        This certificate is issued upon request of the above-named individual for
        <strong><span style="text-transform: uppercase;">{{ request.purpose }}</span></strong>.
      </p>`,
    ),
  },

  // ── 5. Barangay Business Clearance ─────────────────────────────────────────
  {
    certificate_type: 'business_clearance',
    name:             'Barangay Business Clearance',
    description:      'Grants clearance for a business to operate within the barangay.',
    html_content: buildTemplate(
      'BARANGAY BUSINESS CLEARANCE',
      `<p>
        This is to certify that <strong>{{ resident.fullName }}</strong>,
        {{ resident.civilStatus }}, {{ resident.sex }}, born on {{ resident.birthdate }},
        and a resident of <strong>{{ resident.address }}</strong>,
        Barangay <strong>{{ barangay.name }}</strong>,
        Municipality of <strong>{{ municipality.name }}</strong>,
        Province of <strong>{{ municipality.province }}</strong>,
        has complied with the requirements of the barangay and is hereby granted this
        Barangay Business Clearance.
      </p>
      <p>
        This clearance is issued for the purpose of securing a Mayor's Permit / Business
        Permit and is valid for the current year unless otherwise revoked.
      </p>`,
    ),
  },
];

// =============================================================================
// Seeder
// =============================================================================

const seedCertificateTemplates = async () => {
  const client = await pool.connect();
  try {
    console.log('Starting certificate template seeding…');

    const { rows: municipalities } = await client.query('SELECT id FROM municipalities');

    if (municipalities.length === 0) {
      console.log('No municipalities found. Please create municipalities first.');
      return;
    }

    console.log(`Found ${municipalities.length} municipality(ies). Seeding templates…`);

    for (const municipality of municipalities) {
      console.log(`\nMunicipality ID: ${municipality.id}`);

      for (const tmpl of CERTIFICATE_TEMPLATES) {
        try {
          // Check if template already exists (unique constraint: municipality_id + certificate_type)
          const { rows: existing } = await client.query(
            `SELECT id FROM certificate_templates
             WHERE municipality_id = $1 AND certificate_type = $2`,
            [municipality.id, tmpl.certificate_type],
          );

          if (existing.length === 0) {
            await client.query(
              `INSERT INTO certificate_templates
                 (municipality_id, certificate_type, name, description, html_content, is_active)
               VALUES ($1, $2, $3, $4, $5, true)`,
              [municipality.id, tmpl.certificate_type, tmpl.name, tmpl.description, tmpl.html_content],
            );
            console.log(`  ✓ Created: ${tmpl.name}`);
          } else {
            console.log(`  - Skipped: ${tmpl.name} (already exists)`);
          }
        } catch (err) {
          console.error(`  ✗ Error creating ${tmpl.name}:`, err.message);
        }
      }
    }

    console.log('\nCertificate template seeding completed!');

    const { rows: total } = await client.query(
      'SELECT COUNT(*) AS count FROM certificate_templates',
    );
    console.log(`Total certificate templates in database: ${total[0].count}`);
  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

// Run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCertificateTemplates()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

export default seedCertificateTemplates;
