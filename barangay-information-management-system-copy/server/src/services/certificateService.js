/**
 * certificateService.js
 *
 * Certificate template CRUD and HTML → PDF generation.
 *
 * Templates are stored in the certificate_templates table as raw HTML.
 * Placeholders use {{ token }} syntax. At generation time, tokens are resolved
 * against live database data:
 *
 *   resident.*          → residents table
 *   barangay.*          → barangays table
 *   municipality.*      → municipalities table
 *   officials.*         → officials table (captain, kagawad1–7, secretary, treasurer)
 *   request.*           → requests table (walk-in) or transactions table (portal)
 *
 * Image tokens (resolve to full <img> tags, or empty <div> if no file is set):
 *   {{ barangay.logoImg }}       — barangays.barangay_logo_path
 *   {{ barangay.backgroundImg }} — barangays.certificate_background_path (full-page fixed bg)
 *   {{ municipality.logoImg }}   — municipalities.municipality_logo_path
 *
 * PDF generation uses Puppeteer (headless Chrome). If Puppeteer is not installed,
 * the service returns the rendered HTML and logs a warning.
 */

import { pool } from '../config/db.js';

/**
 * Convert a relative upload path to an HTTP URL served by Express.
 * The uploads folder is exposed at /uploads by app.js.
 * Using HTTP (not file://) works both in browser iframes and Puppeteer.
 */
function toUploadUrl(relPath) {
  if (!relPath) return null;
  if (relPath.startsWith('http://') || relPath.startsWith('https://')) return relPath;
  const normalized = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}/${normalized}`;
}

// =============================================================================
// TEMPLATE CRUD
// =============================================================================

/**
 * List all certificate templates for a municipality.
 */
export async function getTemplates(municipalityId) {
  const { rows } = await pool.query(
    `SELECT id, municipality_id, certificate_type, name, description, is_active, created_by, created_at, updated_at
     FROM certificate_templates
     WHERE municipality_id = $1
     ORDER BY name ASC`,
    [municipalityId]
  );
  return rows;
}

/**
 * Get a single template by id.
 */
export async function getTemplate(id) {
  const { rows } = await pool.query(
    `SELECT * FROM certificate_templates WHERE id = $1`,
    [id]
  );
  if (rows.length === 0) throw new Error('Certificate template not found');
  return rows[0];
}

/**
 * Get a template by municipality + certificate type.
 */
export async function getTemplateByType(municipalityId, certificateType) {
  const { rows } = await pool.query(
    `SELECT * FROM certificate_templates
     WHERE municipality_id = $1 AND certificate_type = $2 AND is_active = true`,
    [municipalityId, certificateType]
  );
  if (rows.length === 0) {
    throw new Error(`No active template found for certificate type: ${certificateType}`);
  }
  return rows[0];
}

/**
 * Create a new certificate template.
 */
export async function createTemplate({ municipalityId, certificateType, name, description, htmlContent, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO certificate_templates
       (municipality_id, certificate_type, name, description, html_content, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [municipalityId, certificateType, name, description || null, htmlContent, createdBy || null]
  );
  return rows[0];
}

/**
 * Update a template's content and/or metadata.
 */
export async function updateTemplate(id, { name, description, htmlContent, isActive }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (name !== undefined)        { fields.push(`name = $${idx++}`);         values.push(name); }
  if (description !== undefined) { fields.push(`description = $${idx++}`);  values.push(description); }
  if (htmlContent !== undefined) { fields.push(`html_content = $${idx++}`); values.push(htmlContent); }
  if (isActive !== undefined)    { fields.push(`is_active = $${idx++}`);    values.push(isActive); }

  if (fields.length === 0) throw new Error('Nothing to update');

  fields.push(`updated_at = now()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE certificate_templates SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  if (rows.length === 0) throw new Error('Certificate template not found');
  return rows[0];
}

/**
 * Delete a template.
 */
export async function deleteTemplate(id) {
  const { rowCount } = await pool.query(
    `DELETE FROM certificate_templates WHERE id = $1`,
    [id]
  );
  if (rowCount === 0) throw new Error('Certificate template not found');
}

// =============================================================================
// PLACEHOLDER RESOLUTION
// =============================================================================

/**
 * Resolve all {{ token }} placeholders in an HTML string.
 * Fetches required data from the database based on which tokens are present.
 *
 * @param {string} html - Raw HTML with {{ token }} placeholders
 * @param {object} context - { residentId?, barangayId?, requestId?, municipalityId, issuanceDate? }
 * @returns {string} - Rendered HTML with all placeholders replaced
 */
export async function resolvePlaceholders(html, context) {
  const { residentId, barangayId, municipalityId, requestId, transactionId, issuanceDate } = context;

  const data = {};

  // ---------------------------------------------------------------------------
  // Resident data
  // ---------------------------------------------------------------------------
  if (residentId && html.includes('{{ resident.')) {
    const { rows } = await pool.query(
      `SELECT r.*, b.barangay_name, m.municipality_name, m.province,
              hh.house_number, hh.street AS household_street
       FROM residents r
       LEFT JOIN barangays b ON b.id = r.barangay_id
       LEFT JOIN municipalities m ON m.id = b.municipality_id
       LEFT JOIN (
         SELECT r2.id AS resident_id, h.house_number, h.street
         FROM residents r2
         JOIN households h ON h.house_head = r2.id
         UNION
         SELECT fm.family_member AS resident_id, h.house_number, h.street
         FROM family_members fm
         JOIN families f ON f.id = fm.family_id
         JOIN households h ON h.id = f.household_id
       ) hh ON hh.resident_id = r.id
       WHERE r.id = $1 AND r.status = 'active'`,
      [residentId]
    );
    if (rows.length > 0) {
      const r = rows[0];
      const dob = r.birthdate ? new Date(r.birthdate) : null;
      const age = dob
        ? Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000))
        : '';

      data['resident.firstName']   = r.first_name || '';
      data['resident.middleName']  = r.middle_name || '';
      data['resident.lastName']    = r.last_name || '';
      data['resident.extensionName'] = r.extension_name || '';
      data['resident.fullName']    = [r.first_name, r.middle_name, r.last_name, r.extension_name]
                                       .filter(Boolean).join(' ');
      data['resident.birthdate']   = dob ? dob.toLocaleDateString('en-PH', { dateStyle: 'long' }) : '';
      data['resident.age']         = String(age);
      data['resident.sex']         = r.sex || '';
      data['resident.civilStatus'] = r.civil_status || '';
      data['resident.address']     = [r.house_number, r.household_street].filter(Boolean).join(', ');
      data['resident.residentId']  = r.resident_id || '';
      // Note: nationality and religion columns removed in v2 schema - using defaults
      data['resident.nationality'] = r.nationality || 'Filipino';
      data['resident.religion']    = r.religion || '';
      data['resident.occupation']  = r.occupation || '';
    }
  }

  // ---------------------------------------------------------------------------
  // Barangay data
  // ---------------------------------------------------------------------------
  const effectiveBrgyId = barangayId || null;
  if (effectiveBrgyId && html.includes('{{ barangay.')) {
    const { rows } = await pool.query(
      `SELECT * FROM barangays WHERE id = $1`,
      [effectiveBrgyId]
    );
    if (rows.length > 0) {
      const b = rows[0];
      data['barangay.name'] = b.barangay_name || '';
      data['barangay.code'] = b.barangay_code || '';

      // Logo — resolves to <img> tag or empty placeholder <div>
      const brgyLogoUrl = toUploadUrl(b.barangay_logo_path);
      data['barangay.logoImg'] = brgyLogoUrl
        ? `<img src="${brgyLogoUrl}" style="height:80px;width:80px;object-fit:contain;" alt="Barangay Logo">`
        : '<div style="height:80px;width:80px;"></div>';

      // Certificate background — blurred, semi-transparent, full-page fixed layer
      const bgUrl = toUploadUrl(b.certificate_background_path);
      data['barangay.backgroundImg'] = bgUrl
        ? `<div style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;overflow:hidden;">
             <img src="${bgUrl}" style="width:100%;height:100%;object-fit:cover;opacity:0.25;filter:blur(4px);transform:scale(1.05);" alt="">
           </div>`
        : '';
    }
  }

  // ---------------------------------------------------------------------------
  // Municipality data
  // ---------------------------------------------------------------------------
  if (municipalityId && html.includes('{{ municipality.')) {
    const { rows } = await pool.query(
      `SELECT * FROM municipalities WHERE id = $1`,
      [municipalityId]
    );
    if (rows.length > 0) {
      const m = rows[0];
      data['municipality.name']     = m.municipality_name || '';
      data['municipality.code']     = m.municipality_code || '';
      data['municipality.province'] = m.province || '';
      data['municipality.region']   = m.region || '';

      // Municipality logo
      const muniLogoUrl = toUploadUrl(m.municipality_logo_path);
      data['municipality.logoImg'] = muniLogoUrl
        ? `<img src="${muniLogoUrl}" style="height:80px;width:80px;object-fit:contain;" alt="Municipality Logo">`
        : '<div style="height:80px;width:80px;"></div>';
    }
  }

  // ---------------------------------------------------------------------------
  // Officials data
  // ---------------------------------------------------------------------------
  if (effectiveBrgyId && html.includes('{{ officials.')) {
    const { rows } = await pool.query(
      `SELECT o.position,
              CONCAT(r.first_name, ' ', COALESCE(r.middle_name || ' ', ''), r.last_name,
                     CASE WHEN r.extension_name IS NOT NULL AND r.extension_name <> ''
                          THEN ' ' || r.extension_name ELSE '' END) AS full_name
       FROM officials o
       JOIN residents r ON r.id = o.resident_id
       WHERE o.barangay_id = $1
         AND (o.term_end IS NULL OR o.term_end >= CURRENT_DATE)
       ORDER BY o.position ASC`,
      [effectiveBrgyId]
    );

    const officialsByPosition = {};
    const kagawads = [];
    for (const o of rows) {
      const pos = (o.position || '').toLowerCase();
      if (pos.includes('captain') || pos.includes('punong barangay')) {
        officialsByPosition['officials.captain'] = o.full_name;
      } else if (pos.includes('kagawad') || pos.includes('councilor')) {
        kagawads.push(o.full_name);
      } else if (pos.includes('secretary')) {
        officialsByPosition['officials.secretary'] = o.full_name;
      } else if (pos.includes('treasurer')) {
        officialsByPosition['officials.treasurer'] = o.full_name;
      }
    }
    kagawads.forEach((name, i) => {
      officialsByPosition[`officials.kagawad${i + 1}`] = name;
    });

    Object.assign(data, officialsByPosition);
  }

  // ---------------------------------------------------------------------------
  // Request / transaction data
  // ---------------------------------------------------------------------------
  if (requestId && html.includes('{{ request.')) {
    const { rows } = await pool.query(
      `SELECT * FROM requests WHERE id = $1`,
      [requestId]
    );
    if (rows.length > 0) {
      const req = rows[0];
      data['request.purpose']         = req.purpose || '';
      data['request.referenceNumber'] = req.uuid || '';
      data['request.orNumber']        = req.or_number || '';
    }
  }

  if (transactionId && html.includes('{{ request.')) {
    const { rows } = await pool.query(
      `SELECT t.*, t.service_data
       FROM transactions t
       WHERE t.id = $1`,
      [transactionId]
    );
    if (rows.length > 0) {
      const tx = rows[0];
      const sd = tx.service_data || {};
      data['request.purpose']         = sd.purpose || tx.remarks || '';
      data['request.referenceNumber'] = tx.reference_number || '';
      data['request.orNumber']        = sd.orNumber || '';
    }
  }

  // ---------------------------------------------------------------------------
  // Date of issuance
  // ---------------------------------------------------------------------------
  const date = issuanceDate ? new Date(issuanceDate) : new Date();
  data['request.date'] = date.toLocaleDateString('en-PH', { dateStyle: 'long' });

  // ---------------------------------------------------------------------------
  // Replace all {{ token }} occurrences
  // ---------------------------------------------------------------------------
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, token) => {
    return data[token] !== undefined ? data[token] : `[${token}]`;
  });
}

// =============================================================================
// PDF GENERATION
// =============================================================================

/**
 * Generate a PDF from rendered HTML.
 * Uses Puppeteer if available; otherwise throws an error with a helpful message.
 *
 * @param {string} renderedHtml - Fully resolved HTML
 * @param {object} options - { format, landscape, margin }
 * @returns {Buffer} PDF buffer
 */
export async function generatePdf(renderedHtml, options = {}) {
  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    throw new Error(
      'Puppeteer is not installed. Run: npm install puppeteer\n' +
      'Alternatively, use the /preview endpoint to view the rendered HTML.'
    );
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(renderedHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: options.format || 'Letter',
      landscape: options.landscape || false,
      printBackground: true,
      margin: options.margin || { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    return pdfBuffer;
  } finally {
    await browser.close();
  }
}

/**
 * Full pipeline: fetch template → resolve placeholders → generate PDF.
 *
 * @param {object} params
 * @param {string} params.municipalityId
 * @param {string} params.certificateType
 * @param {object} params.context  - { residentId, barangayId, requestId?, transactionId? }
 * @returns {{ pdf: Buffer, filename: string }}
 */
export async function generateCertificate({ municipalityId, certificateType, context }) {
  const template = await getTemplateByType(municipalityId, certificateType);
  const renderedHtml = await resolvePlaceholders(template.html_content, {
    ...context,
    municipalityId,
  });
  const pdf = await generatePdf(renderedHtml);
  const filename = `${certificateType}_${Date.now()}.pdf`;
  return { pdf, filename };
}
