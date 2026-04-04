/**
 * certificateRoutes.js
 *
 * BIMS routes for certificate template management and PDF generation.
 *
 * Template management (BIMS admin — municipality level):
 *   GET    /api/certificates/templates           — list all templates
 *   GET    /api/certificates/templates/:id       — get single template (with html_content)
 *   POST   /api/certificates/templates           — create / upload template
 *   PUT    /api/certificates/templates/:id       — update template content
 *   DELETE /api/certificates/templates/:id       — delete template
 *
 * Certificate generation:
 *   POST   /api/certificates/generate/request/:requestId     — generate PDF for walk-in request
 *   POST   /api/certificates/generate/transaction/:txId      — generate PDF for portal transaction
 *   GET    /api/certificates/preview/request/:requestId      — preview rendered HTML (no PDF)
 *   GET    /api/certificates/preview/transaction/:txId       — preview rendered HTML (no PDF)
 */

import { Router } from 'express';
import {
  createTemplate,
  deleteTemplate,
  generateCertificate,
  generatePdf,
  getTemplate,
  getTemplates,
  resolvePlaceholders,
  updateTemplate,
} from '../services/certificateService.js';
import { pool } from '../config/db.js';
import { allUsers, municipalityAdminOnly } from '../middlewares/auth.js';

const router = Router();

// =============================================================================
// TEMPLATE CRUD
// =============================================================================

/** GET /api/certificates/templates?municipalityId=1 */
router.get('/templates', ...allUsers, async (req, res) => {
  try {
    const municipalityId = parseInt(req.query.municipalityId);
    if (!municipalityId) {
      return res.status(400).json({ status: 'error', message: 'municipalityId is required' });
    }
    const templates = await getTemplates(municipalityId);
    res.json({ status: 'success', data: templates });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/certificates/templates/:id */
router.get('/templates/:id', ...allUsers, async (req, res) => {
  try {
    const template = await getTemplate(req.params.id);
    res.json({ status: 'success', data: template });
  } catch (err) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

/** POST /api/certificates/templates */
router.post('/templates', ...municipalityAdminOnly, async (req, res) => {
  try {
    const { municipalityId, certificateType, name, description, htmlContent, createdBy } = req.body;

    if (!municipalityId || !certificateType || !name || !htmlContent) {
      return res.status(400).json({
        status: 'error',
        message: 'municipalityId, certificateType, name, and htmlContent are required',
      });
    }

    const template = await createTemplate({ municipalityId, certificateType, name, description, htmlContent, createdBy });
    res.status(201).json({ status: 'success', data: template });
  } catch (err) {
    const status = err.message.includes('unique') ? 409 : 500;
    res.status(status).json({ status: 'error', message: err.message });
  }
});

/** PUT /api/certificates/templates/:id */
router.put('/templates/:id', ...municipalityAdminOnly, async (req, res) => {
  try {
    const { name, description, htmlContent, isActive } = req.body;
    const template = await updateTemplate(req.params.id, { name, description, htmlContent, isActive });
    res.json({ status: 'success', data: template });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

/** DELETE /api/certificates/templates/:id */
router.delete('/templates/:id', ...municipalityAdminOnly, async (req, res) => {
  try {
    await deleteTemplate(req.params.id);
    res.json({ status: 'success', message: 'Template deleted' });
  } catch (err) {
    res.status(404).json({ status: 'error', message: err.message });
  }
});

// =============================================================================
// CERTIFICATE GENERATION
// =============================================================================

/**
 * Resolve request/transaction context for generation.
 * Returns { residentId, barangayId, municipalityId, requestId?, transactionId? }
 */
async function resolveContext(source, sourceId) {
  if (source === 'request') {
    const { rows } = await pool.query(
      `SELECT r.*, b.municipality_id
       FROM requests r
       LEFT JOIN barangays b ON b.id = r.barangay_id
       WHERE r.id = $1`,
      [sourceId]
    );
    if (rows.length === 0) throw new Error('Request not found');
    const req = rows[0];
    return {
      residentId: req.resident_id || null,
      barangayId: req.barangay_id,
      municipalityId: req.municipality_id,
      requestId: sourceId,
    };
  } else {
    // portal transaction
    const { rows } = await pool.query(
      `SELECT t.resident_id, r.barangay_id, b.municipality_id
       FROM transactions t
       LEFT JOIN residents r ON r.id = t.resident_id
       LEFT JOIN barangays b ON b.id = r.barangay_id
       WHERE t.id = $1`,
      [sourceId]
    );
    if (rows.length === 0) throw new Error('Transaction not found');
    const tx = rows[0];
    return {
      residentId: tx.resident_id || null,
      barangayId: tx.barangay_id || null,
      municipalityId: tx.municipality_id || null,
      transactionId: sourceId,
    };
  }
}

/** POST /api/certificates/generate/request/:requestId */
router.post('/generate/request/:requestId', ...allUsers, async (req, res) => {
  try {
    const context = await resolveContext('request', req.params.requestId);
    const certificateType = req.body.certificateType;

    if (!certificateType) {
      return res.status(400).json({ status: 'error', message: 'certificateType is required' });
    }
    if (!context.municipalityId) {
      return res.status(400).json({ status: 'error', message: 'Could not determine municipality for this request' });
    }

    const { pdf, filename } = await generateCertificate({
      municipalityId: context.municipalityId,
      certificateType,
      context,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** POST /api/certificates/generate/transaction/:transactionId */
router.post('/generate/transaction/:transactionId', ...allUsers, async (req, res) => {
  try {
    const context = await resolveContext('transaction', req.params.transactionId);
    const certificateType = req.body.certificateType;

    if (!certificateType) {
      return res.status(400).json({ status: 'error', message: 'certificateType is required' });
    }
    if (!context.municipalityId) {
      return res.status(400).json({ status: 'error', message: 'Could not determine municipality for this transaction' });
    }

    const { pdf, filename } = await generateCertificate({
      municipalityId: context.municipalityId,
      certificateType,
      context,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// =============================================================================
// HTML PREVIEW (no PDF — useful for template editing)
// =============================================================================

/** GET /api/certificates/preview/request/:requestId?certificateType=barangay_clearance */
router.get('/preview/request/:requestId', async (req, res) => {
  try {
    const certificateType = req.query.certificateType;
    if (!certificateType) {
      return res.status(400).json({ status: 'error', message: 'certificateType is required' });
    }
    const context = await resolveContext('request', req.params.requestId);
    if (!context.municipalityId) {
      return res.status(400).json({ status: 'error', message: 'Could not determine municipality' });
    }

    const { rows } = await pool.query(
      `SELECT html_content FROM certificate_templates
       WHERE municipality_id = $1 AND certificate_type = $2 AND is_active = true`,
      [context.municipalityId, certificateType]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: `No active template for: ${certificateType}` });
    }

    const rendered = await resolvePlaceholders(rows[0].html_content, {
      ...context,
      municipalityId: context.municipalityId,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(rendered);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/** GET /api/certificates/preview/transaction/:transactionId?certificateType=barangay_clearance */
router.get('/preview/transaction/:transactionId', async (req, res) => {
  try {
    const certificateType = req.query.certificateType;
    if (!certificateType) {
      return res.status(400).json({ status: 'error', message: 'certificateType is required' });
    }
    const context = await resolveContext('transaction', req.params.transactionId);
    if (!context.municipalityId) {
      return res.status(400).json({ status: 'error', message: 'Could not determine municipality' });
    }

    const { rows } = await pool.query(
      `SELECT html_content FROM certificate_templates
       WHERE municipality_id = $1 AND certificate_type = $2 AND is_active = true`,
      [context.municipalityId, certificateType]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: `No active template for: ${certificateType}` });
    }

    const rendered = await resolvePlaceholders(rows[0].html_content, {
      ...context,
      municipalityId: context.municipalityId,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(rendered);
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// =============================================================================
// CERTIFICATE QUEUE  (AC3 — walk-in requests + portal transactions, unified)
// =============================================================================

/**
 * GET /api/certificates/queue
 *
 * Returns a unified, paginated list of barangay certificate requests for a
 * specific barangay — combining:
 *   • Walk-in requests   (requests table, type = 'certificate')
 *   • Portal transactions (transactions table, service.category = 'Barangay Certificate',
 *                          resident's barangay_id = targetBarangayId)
 *
 * Query params:
 *   barangayId  — falls back to req.user.target_id (set by auth middleware)
 *   status      — filter by status string; 'all' = no filter (default)
 *   source      — 'all' | 'walkin' | 'portal'  (default: 'all')
 *   page        — 1-indexed page number (default: 1)
 *   perPage     — rows per page (default: 20)
 *
 * Normalized response shape (per row):
 *   source          — 'walkin' | 'portal'
 *   source_id       — requests.id (as text) | transactions.id (UUID text)
 *   applicant_name  — resident full name or walk-in full_name
 *   certificate_type — requests.certificate_type | services.form_fields->>'certificate_type'
 *   service_name    — human-readable service label
 *   purpose         — reason stated by applicant
 *   status_col      — current processing status
 *   payment_status  — null for walk-ins | transactions.payment_status
 *   is_guest        — true if resident_id is NULL
 *   resident_id     — FK if known
 *   created_at      — submission timestamp
 */
router.get('/queue', ...allUsers, async (req, res) => {
  try {
    const {
      barangayId,
      status  = 'all',
      source  = 'all',
      page    = 1,
      perPage = 20,
    } = req.query;

    const brgyId = parseInt(barangayId ?? req.user?.target_id);
    const limit  = Math.min(parseInt(perPage) || 20, 100);
    const offset = (Math.max(parseInt(page), 1) - 1) * limit;

    if (!brgyId || isNaN(brgyId)) {
      return res.status(400).json({ status: 'error', message: 'barangayId is required' });
    }

    // Build per-source subqueries (excluded source → empty result set)
    const includeWalkin = source === 'all' || source === 'walkin';
    const includePortal = source === 'all' || source === 'portal';

    const walkinSub = includeWalkin
      ? `
        SELECT
          'walkin'::text                                             AS source,
          r.id::text                                                 AS source_id,
          COALESCE(
            NULLIF(TRIM(
              COALESCE(res.first_name, '') || ' ' || COALESCE(res.last_name, '')
            ), ''),
            r.full_name,
            'Unknown'
          )                                                          AS applicant_name,
          COALESCE(r.certificate_type, r.type)                       AS certificate_type,
          COALESCE(r.certificate_type, r.type)                       AS service_name,
          r.purpose                                                  AS purpose,
          r.status                                                   AS status_col,
          NULL::text                                                 AS payment_status,
          (r.resident_id IS NULL)                                    AS is_guest,
          r.resident_id                                              AS resident_id,
          r.created_at                                               AS created_at
        FROM requests r
        LEFT JOIN residents res ON res.id = r.resident_id
        WHERE r.barangay_id = $1
           AND r.type = 'certificate'`
      : `SELECT
          NULL::text    AS source,
          NULL::text    AS source_id,
          NULL::text    AS applicant_name,
          NULL::text    AS certificate_type,
          NULL::text    AS service_name,
          NULL::text    AS purpose,
          NULL::text    AS status_col,
          NULL::text    AS payment_status,
          NULL::boolean AS is_guest,
          NULL::text    AS resident_id,
          NULL::timestamptz AS created_at
         WHERE false`;

    const portalSub = includePortal
      ? `
        SELECT
          'portal'::text                                             AS source,
          t.id::text                                                 AS source_id,
          COALESCE(
            NULLIF(TRIM(
              COALESCE(res.first_name, '') || ' ' || COALESCE(res.last_name, '')
            ), ''),
            'Unknown'
          )                                                          AS applicant_name,
          COALESCE(
            s.form_fields->>'certificate_type',
            s.code
          )                                                          AS certificate_type,
          s.name                                                     AS service_name,
          COALESCE(t.service_data->>'purpose', '')                   AS purpose,
          COALESCE(t.status, 'PENDING')                              AS status_col,
          t.payment_status                                           AS payment_status,
          false                                                      AS is_guest,
          t.resident_id                                              AS resident_id,
          t.created_at                                               AS created_at
        FROM transactions t
        JOIN services s      ON s.id  = t.service_id
        JOIN residents res   ON res.id = t.resident_id
        WHERE res.barangay_id = $1
          AND s.category      = 'Barangay Certificate'
          AND t.resident_id   IS NOT NULL`
      : `SELECT
          NULL::text    AS source,
          NULL::text    AS source_id,
          NULL::text    AS applicant_name,
          NULL::text    AS certificate_type,
          NULL::text    AS service_name,
          NULL::text    AS purpose,
          NULL::text    AS status_col,
          NULL::text    AS payment_status,
          NULL::boolean AS is_guest,
          NULL::text    AS resident_id,
          NULL::timestamptz AS created_at
         WHERE false`;

    // Status filter applied to the unified CTE
    const filterParams = [brgyId];
    let   filterCond   = '';
    if (status && status !== 'all') {
      filterCond = `WHERE lower(u.status_col) = lower($2)`;
      filterParams.push(status);
    }

    const cte = `WITH u AS (${walkinSub} UNION ALL ${portalSub})`;

    const [countRow, rows] = await Promise.all([
      pool.query(
        `${cte} SELECT COUNT(*) FROM u ${filterCond}`,
        filterParams
      ),
      pool.query(
        `${cte}
         SELECT * FROM u ${filterCond}
         ORDER BY
           CASE lower(u.status_col)
             WHEN 'pending'     THEN 1
             WHEN 'approved'    THEN 2
             WHEN 'processing'  THEN 3
             WHEN 'for_release' THEN 4
             WHEN 'rejected'    THEN 5
             WHEN 'completed'   THEN 6
             WHEN 'released'    THEN 7
             WHEN 'cancelled'   THEN 8
             ELSE 9
           END,
           created_at DESC
         LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
        [...filterParams, limit, offset]
      ),
    ]);

    res.json({
      status: 'success',
      data: rows.rows,
      pagination: {
        page:       Math.max(parseInt(page), 1),
        perPage:    limit,
        total:      parseInt(countRow.rows[0].count, 10),
        totalPages: Math.ceil(parseInt(countRow.rows[0].count, 10) / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


/**
 * PUT /api/certificates/queue/walkin/:id/status
 * Update the status of a walk-in certificate request.
 * Valid values: pending | approved | rejected | completed
 */
router.put('/queue/walkin/:id/status', ...allUsers, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'approved', 'rejected', 'completed'];
    if (!status || !valid.includes(status.toLowerCase())) {
      return res.status(400).json({
        status: 'error',
        message: `status must be one of: ${valid.join(', ')}`,
      });
    }
    const { rows } = await pool.query(
      `UPDATE requests
          SET status = $1, updated_at = now()
        WHERE id = $2
        RETURNING id, status, updated_at`,
      [status.toLowerCase(), req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Request not found' });
    }
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


/**
 * PUT /api/certificates/queue/portal/:id/status
 * Update the status of a portal certificate transaction.
 * Valid values: PENDING | PROCESSING | FOR_RELEASE | RELEASED | CANCELLED | REJECTED
 */
router.put('/queue/portal/:id/status', ...allUsers, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['PENDING', 'PROCESSING', 'FOR_RELEASE', 'RELEASED', 'CANCELLED', 'REJECTED'];
    if (!status || !valid.includes(status.toUpperCase())) {
      return res.status(400).json({
        status: 'error',
        message: `status must be one of: ${valid.join(', ')}`,
      });
    }
    const { rows } = await pool.query(
      `UPDATE transactions
          SET status = $1, updated_at = now()
        WHERE id = $2
        RETURNING id, status, updated_at`,
      [status.toUpperCase(), req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Transaction not found' });
    }
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


export default router;
