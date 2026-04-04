/**
 * setupRoutes.js
 *
 * Municipality setup + bulk resident ID download endpoints.
 *
 * Endpoints:
 *   POST /api/setup/municipality    — Select municipality from GeoJSON, auto-create barangays
 *   GET  /api/setup/status          — Check if municipality is configured
 *   GET  /api/residents/bulk-id     — Bulk download resident ID cards as PDF
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import QRCode from "qrcode";
import { pool } from "../config/db.js";
import { municipalityAdminOnly, allUsers } from "../middlewares/auth.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve to the server root (server/src/routes -> server/)
const SERVER_ROOT = path.resolve(__dirname, "../../");

const router = express.Router();

// =============================================================================
// GET /api/setup/status
// Returns whether a municipality has been configured for this BIMS instance.
// =============================================================================
router.get("/status", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, municipality_name, gis_code, setup_status FROM municipalities LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.json({
        configured: false,
        message: "No municipality configured yet",
      });
    }

    const muni = result.rows[0];
    return res.json({
      configured: muni.setup_status === "active",
      municipality: muni,
    });
  } catch (error) {
    logger.error("Setup status error:", error);
    res.status(500).json({ message: "Error checking setup status" });
  }
});

// =============================================================================
// POST /api/setup/municipality
//
// Body: { gis_municipality_code: "PH0802601" }
//
// Flow:
//   1. Look up the GIS municipality from gis_municipality table
//   2. Create a municipalities record (or update existing)
//   3. Query gis_barangay for all barangays in that municipality
//   4. Bulk-create barangays records from GIS data
//
// This replaces the manual municipality + barangay creation flow.
// =============================================================================
router.post("/municipality", ...municipalityAdminOnly, async (req, res) => {
  const { gis_municipality_code } = req.body;

  if (!gis_municipality_code) {
    return res.status(400).json({
      message: "gis_municipality_code is required",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Find the GIS municipality record
    const gisResult = await client.query(
      `SELECT id, name, gis_municipality_code FROM gis_municipality
       WHERE gis_municipality_code = $1`,
      [gis_municipality_code]
    );

    if (gisResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: `Municipality with GIS code ${gis_municipality_code} not found in GIS data`,
      });
    }

    const gisMuni = gisResult.rows[0];

    // Province and region are provided by the admin in the setup form.
    // They are not stored in the GIS tables — the admin must enter them.
    const province = (req.body.province || '').trim();
    const region   = (req.body.region   || '').trim();

    // 2. Update the existing municipality record (there is always exactly one per BIMS instance).
    // We do NOT insert a new row — the seed placeholder is updated in-place so that
    // bims_users.target_id = '1' remains valid and setup_status transitions to 'active'.
    const muniResult = await client.query(
      `UPDATE municipalities SET
        municipality_name  = $1,
        municipality_code  = $2,
        gis_code           = $3,
        region             = $4,
        province           = $5,
        setup_status       = 'active',
        updated_at         = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM municipalities ORDER BY id LIMIT 1)
      RETURNING *`,
      [gisMuni.name, gis_municipality_code, gis_municipality_code, region, province]
    );

    const municipality = muniResult.rows[0];

    // 3. Get all barangays for this municipality from GIS data
    const barangaysResult = await client.query(
      `SELECT id, name, gis_barangay_code, gis_municipality_code
       FROM gis_barangay
       WHERE gis_municipality_code = $1
       ORDER BY name ASC`,
      [gis_municipality_code]
    );

    if (barangaysResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: `No barangays found in GIS data for municipality ${gisMuni.name}`,
      });
    }

    // 4. Bulk-insert barangays
    let createdCount = 0;
    let skippedCount = 0;

    for (const gisBarangay of barangaysResult.rows) {
      const result = await client.query(
        `INSERT INTO barangays (municipality_id, barangay_name, barangay_code, gis_code)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (municipality_id, barangay_name) DO NOTHING
         RETURNING id`,
        [
          municipality.id,
          gisBarangay.name,
          gisBarangay.gis_barangay_code,
          gisBarangay.gis_barangay_code,
        ]
      );

      if (result.rows.length > 0) {
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    await client.query("COMMIT");

    logger.info(`Municipality setup: ${gisMuni.name} — created ${createdCount} barangays`);

    res.status(201).json({
      message: "Municipality configured successfully",
      municipality: {
        id: municipality.id,
        name: municipality.municipality_name,
        gisCode: municipality.gis_code,
      },
      barangays: {
        total: barangaysResult.rows.length,
        created: createdCount,
        skipped: skippedCount,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Municipality setup error:", error);
    res.status(500).json({ message: "Error setting up municipality", error: error.message });
  } finally {
    client.release();
  }
});

// =============================================================================
// GET /api/residents/bulk-id
//
// Query params:
//   barangayId   — filter by barangay (optional; municipality admin gets all)
//   status       — default 'active'
//   format       — 'pdf' (default) | 'json'
//
// Returns a PDF document with ID card layouts for each resident,
// suitable for printing in bulk.
// =============================================================================
router.get("/residents/bulk-id", ...allUsers, async (req, res) => {
  try {
    const { barangayId, status = "active", format = "pdf" } = req.query;
    const user = req.user;

    // Build WHERE clause based on user scope
    const whereClauses = ["r.status = $1"];
    const values = [status];
    let paramIndex = 2;

    if (user.target_type === "municipality") {
      whereClauses.push(`b.municipality_id = $${paramIndex++}`);
      values.push(user.target_id);
    } else {
      // Barangay user — scope to their barangay
      whereClauses.push(`r.barangay_id = $${paramIndex++}`);
      values.push(user.target_id);
    }

    if (barangayId) {
      whereClauses.push(`r.barangay_id = $${paramIndex++}`);
      values.push(barangayId);
    }

    const query = `
      SELECT
        r.id,
        r.resident_id,
        r.first_name,
        r.middle_name,
        r.last_name,
        r.extension_name,
        r.sex,
        r.birthdate,
        r.civil_status,
        r.status,
        r.picture_path,
        b.id AS barangay_id,
        b.barangay_name,
        b.barangay_logo_path,
        m.id AS municipality_id,
        m.municipality_name,
        m.municipality_logo_path,
        m.id_background_front_path,
        m.id_background_back_path,
        hh.house_number,
        hh.street
      FROM residents r
      LEFT JOIN barangays b ON r.barangay_id = b.id
      LEFT JOIN municipalities m ON b.municipality_id = m.id
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
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY b.barangay_name, r.last_name, r.first_name
    `;

    const result = await pool.query(query, values);

    // JSON response for data preview
    if (format === "json") {
      return res.json({
        count: result.rows.length,
        residents: result.rows,
      });
    }

    // Fetch Punong Barangay for each unique barangay
    const uniqueBarangayIds = [...new Set(result.rows.map((r) => r.barangay_id).filter(Boolean))];
    const punongMap = {};
    if (uniqueBarangayIds.length > 0) {
      const pbResult = await pool.query(
        `SELECT o.barangay_id, r.first_name, r.middle_name, r.last_name
         FROM officials o
         JOIN residents r ON o.resident_id = r.id
         WHERE o.barangay_id = ANY($1)
           AND (LOWER(o.position) LIKE '%captain%'
             OR LOWER(o.position) LIKE '%punong barangay%'
             OR LOWER(o.position) LIKE '%barangay captain%'
             OR LOWER(o.position) LIKE '%pb%')`,
        [uniqueBarangayIds]
      );
      pbResult.rows.forEach((pb) => {
        if (!punongMap[pb.barangay_id]) punongMap[pb.barangay_id] = pb;
      });
    }

    // Fetch emergency contacts: the house head of each resident's household,
    // provided the house head is not the resident themselves.
    // Covers residents who are house head, family head, or family member.
    const emergencyContactMap = {};
    if (result.rows.length > 0) {
      const residentDbIds = result.rows.map((r) => r.id);
      const ecResult = await pool.query(
        `WITH resident_households AS (
           SELECT house_head  AS resident_id, id AS household_id FROM households
           UNION ALL
           SELECT f.family_head,               f.household_id   FROM families f
           UNION ALL
           SELECT fm.family_member,            f.household_id
           FROM family_members fm
           JOIN families f ON f.id = fm.family_id
         )
         SELECT DISTINCT ON (rh.resident_id)
           rh.resident_id,
           CONCAT_WS(' ', hh.first_name, hh.middle_name, hh.last_name, hh.extension_name) AS emergency_name,
           COALESCE(hh.contact_number, 'N/A') AS emergency_contact
         FROM resident_households rh
         JOIN households h   ON h.id       = rh.household_id
         JOIN residents   hh ON hh.id      = h.house_head
         WHERE rh.resident_id = ANY($1)
           AND h.house_head  != rh.resident_id`,
        [residentDbIds]
      );
      ecResult.rows.forEach((ec) => {
        emergencyContactMap[ec.resident_id] = {
          name:    (ec.emergency_name || "N/A").toUpperCase(),
          contact: ec.emergency_contact || "N/A",
        };
      });
    }

    // Convert a DB-stored path to an HTTP URL Puppeteer can load.
    // Absolute HTTP URLs (e.g. from eService uploads) are used as-is.
    // Relative BIMS paths (e.g. "uploads/foo.jpg") are served by Express at /uploads,
    // so we use http://localhost:PORT/ — file:// URLs are blocked by Puppeteer's
    // about:blank origin when using setContent().
    const PORT = process.env.PORT || 5000;
    function toFileUrl(relPath) {
      if (!relPath) return null;
      if (relPath.startsWith("http://") || relPath.startsWith("https://")) return relPath;
      const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
      return `${process.env.BASE_URL || `http://localhost:${PORT}`}/${normalized}`;
    }

    function formatDateLong(dateStr) {
      if (!dateStr) return "N/A";
      return new Date(dateStr)
        .toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
        .toUpperCase();
    }

    function getAge(dateStr) {
      if (!dateStr) return "N/A";
      const today = new Date();
      const bdate = new Date(dateStr);
      return Math.floor((today - bdate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Pre-generate QR data URLs for each resident (same logic as the client: btoa(resident_id))
    const qrMap = {};
    await Promise.all(
      result.rows.map(async (r) => {
        if (r.resident_id) {
          try {
            qrMap[r.id] = await QRCode.toDataURL(Buffer.from(String(r.resident_id)).toString("base64"), {
              width: 120,
              margin: 1,
            });
          } catch {
            qrMap[r.id] = null;
          }
        }
      })
    );

    const cardsHtml = result.rows.map((r) => {
      const qrDataUrl = qrMap[r.id];
      const pb = punongMap[r.barangay_id];
      const ec = emergencyContactMap[r.id] || { name: "N/A", contact: "N/A" };
      const pbName = pb
        ? `${pb.first_name}${pb.middle_name ? " " + pb.middle_name : ""} ${pb.last_name}`.toUpperCase()
        : "HON. [PUNONG BARANGAY]";

      const fullName = [
        r.first_name,
        r.middle_name ? r.middle_name.charAt(0) + "." : "",
        r.last_name,
        r.extension_name || "",
      ]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();

      const bgFront = toFileUrl(r.id_background_front_path);
      const bgBack = toFileUrl(r.id_background_back_path);
      const photo = toFileUrl(r.picture_path);
      const muniLogo = toFileUrl(r.municipality_logo_path);
      const brgyLogo = toFileUrl(r.barangay_logo_path);

      // Escape HTML special chars to prevent broken markup
      const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Card pixel dimensions matching ResidentIDCard.jsx exactly (96 DPI)
      // CARD_WIDTH_MM=54, CARD_HEIGHT_MM=85.6, MM_TO_PX=96/25.4
      const W = Math.round(54 * 96 / 25.4);   // 204px
      const H = Math.round(85.6 * 96 / 25.4); // 323px

      return `
<div class="resident-page">
  <div id="resident-id-printable" style="display:flex;flex-direction:row;gap:32px;padding:16px;align-items:center;justify-content:center;">

    <!-- FRONT — mirrors id-card-front in ResidentIDCard.jsx exactly -->
    <div class="id-card-front" style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:space-between;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.2);border:1px solid hsl(220,90%,56%);padding:16px;overflow:hidden;background:transparent;width:${W}px;height:${H}px;min-width:${W}px;max-width:${W}px;min-height:${H}px;max-height:${H}px;flex-shrink:0;">
      ${bgFront ? `<img src="${bgFront}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;opacity:0.25;filter:blur(4px);transform:scale(1.05);" onerror="this.style.display='none'">` : ""}

      <!-- Header row: muni logo | barangay+muni names | brgy logo -->
      <div style="position:relative;z-index:10;display:flex;width:100%;justify-content:space-between;align-items:center;margin-bottom:8px;">
        ${muniLogo ? `<img src="${muniLogo}" alt="Municipality Logo" style="height:32px;width:32px;object-fit:contain;border-radius:50%;" onerror="this.style.display='none'">` : `<div style="width:32px;"></div>`}
        <div style="text-align:center;flex:1;">
          <div style="font-weight:700;font-size:10px;letter-spacing:2px;color:hsl(220,90%,56%);">${esc((r.barangay_name || "").toUpperCase())}</div>
          <p style="font-size:10px;font-weight:600;color:#6b7280;">${esc((r.municipality_name || "").toUpperCase())}</p>
        </div>
        ${brgyLogo ? `<img src="${brgyLogo}" alt="Barangay Logo" style="height:32px;width:32px;object-fit:contain;border-radius:50%;" onerror="this.style.display='none'">` : `<div style="width:32px;"></div>`}
      </div>

      <!-- Main content -->
      <div style="position:relative;z-index:10;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;">
        <div style="font-weight:700;font-size:10px;letter-spacing:2px;color:#000;margin-bottom:8px;">BARANGAY ID</div>

        <!-- Photo: w-16 h-16 = 64px, rounded-md, border-2 border-primary -->
        <div style="width:64px;height:64px;border-radius:6px;overflow:hidden;border:2px solid hsl(220,90%,56%);background:#fff;display:flex;align-items:center;justify-content:center;">
          ${photo
            ? `<img src="${photo}" alt="Resident" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#9ca3af;">No Image</div>`}
        </div>

        <!-- Name: text-[12px] font-bold underline mt-2 -->
        <div style="font-size:12px;font-weight:700;text-decoration:underline;margin-top:8px;text-align:center;">${esc(fullName)}</div>
        <!-- Resident ID: text-[10px] font-semibold -->
        <div style="font-size:10px;font-weight:600;text-align:center;margin-bottom:8px;">${esc(r.resident_id || "PENDING")}</div>

        <!-- Personal Information -->
        <div style="font-weight:700;font-size:10px;text-decoration:underline;margin-bottom:4px;width:100%;">PERSONAL INFORMATION</div>
        <div style="font-size:10px;display:flex;flex-direction:column;width:100%;gap:1px;">
          <div style="display:flex;gap:4px;"><span>CIVIL STATUS:</span><span style="font-weight:600;">${esc((r.civil_status || "N/A").toUpperCase())}</span></div>
          <div style="display:flex;gap:4px;"><span>SEX:</span><span style="font-weight:600;">${esc((r.sex || "N/A").toUpperCase())}</span></div>
          <div style="display:flex;gap:4px;"><span>BIRTH DATE:</span><span style="font-weight:600;">${esc(formatDateLong(r.birthdate))}</span></div>
          <div style="display:flex;gap:4px;"><span>AGE:</span><span style="font-weight:600;">${getAge(r.birthdate)}</span></div>
          <div style="display:flex;gap:4px;"><span>ADDRESS:</span><span style="font-weight:600;">${esc([r.house_number, r.street, r.barangay_name, r.municipality_name].filter(Boolean).map(s => s.toUpperCase()).join(", "))}</span></div>
        </div>
      </div>
    </div>

    <!-- BACK — mirrors id-card-back in ResidentIDCard.jsx exactly -->
    <div class="id-card-back" style="position:relative;display:flex;flex-direction:column;justify-content:space-between;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.2);border:1px solid hsl(220,90%,56%);padding:16px;overflow:hidden;background:transparent;width:${W}px;height:${H}px;min-width:${W}px;max-width:${W}px;min-height:${H}px;max-height:${H}px;flex-shrink:0;">
      ${bgBack ? `<img src="${bgBack}" alt="" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none;opacity:0.25;filter:blur(4px);transform:scale(1.05);" onerror="this.style.display='none'">` : ""}

      <!-- font-bold italic text-[8px] -->
      <div style="font-weight:700;font-style:italic;font-size:8px;margin-bottom:4px;text-align:center;">NOTIFY INCASE OF EMERGENCY:</div>

      <!-- border-1 border-primary rounded-lg p-1 mb-2 (border-1 is not a valid Tailwind class so no visible border in modal) -->
      <div style="position:relative;z-index:10;border-radius:8px;padding:4px;margin-bottom:8px;">
        <div style="font-size:8px;">Name: <span style="font-weight:600;">${esc(ec.name)}</span></div>
        <div style="font-size:8px;">Contact No.: <span style="font-weight:600;">${esc(ec.contact)}</span></div>
      </div>

      <!-- LGU name: text-[8px] font-semibold text-center mb-2 -->
      <div style="position:relative;z-index:10;font-size:8px;font-weight:600;text-align:center;margin-bottom:8px;">LGU-${esc((r.municipality_name || "").toUpperCase())}</div>

      <!-- Certification text: text-[8px] text-center mb-2 -->
      <div style="position:relative;z-index:10;font-size:8px;text-align:center;margin-bottom:8px;">THIS IS TO CERTIFY THE BEARER OF THIS CARD WHOSE PICTURE AND SIGNATURE APPEAR HEREIN IS A RESIDENT OF BARANGAY ${esc((r.barangay_name || "").toUpperCase())}${r.municipality_name ? ", " + esc(r.municipality_name.toUpperCase()) : ""}</div>

      <!-- QR code: w-16 h-16 centered -->
      <div style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;margin-bottom:8px;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" style="width:64px;height:64px;image-rendering:crisp-edges;">` : ""}
      </div>

      <!-- Disclaimers: text-[8px] font-semibold text-center -->
      <div style="position:relative;z-index:10;font-size:8px;font-weight:600;text-align:center;margin-bottom:4px;">THIS ID IS NON-TRANSFERRABLE</div>
      <div style="position:relative;z-index:10;font-size:8px;font-weight:600;text-align:center;margin-bottom:8px;">IN CASE OF LOSS PLEASE RETURN TO BARANGAY</div>

      <!-- Punong Barangay: mt-auto flex flex-col items-center -->
      <div style="position:relative;z-index:10;margin-top:auto;display:flex;flex-direction:column;align-items:center;">
        <div style="font-weight:700;text-decoration:underline;font-size:8px;">${esc(pbName)}</div>
        <div style="font-size:8px;font-weight:700;">PUNONG BARANGAY</div>
      </div>
    </div>

  </div>
</div>`;
    }).join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Helvetica, Arial, sans-serif; background: #fff; }
  .resident-page { page-break-after: always; display: flex; align-items: flex-start; justify-content: center; padding: 8px 0; }
  .resident-page:last-child { page-break-after: avoid; }
</style>
</head>
<body>
${cardsHtml}
</body>
</html>`;

    const { default: puppeteer } = await import("puppeteer");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="resident-ids-${Date.now()}.pdf"`
      );
      res.send(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (error) {
    logger.error("Bulk ID download error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Error generating bulk IDs" });
    }
  }
});

export default router;
