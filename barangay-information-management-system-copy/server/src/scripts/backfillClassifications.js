/**
 * backfillClassifications.js
 *
 * One-time script: creates resident_classifications rows for existing
 * active residents whose flat fields (is_voter, employment_status, etc.)
 * are not yet reflected in the classifications table.
 *
 * Usage:
 *   node src/scripts/backfillClassifications.js          # dry-run (no DB writes)
 *   node src/scripts/backfillClassifications.js --apply  # apply changes
 */

import { loadEnvConfig } from '../utils/envLoader.js';
loadEnvConfig();

import { pool } from '../config/db.js';
import logger from '../utils/logger.js';
import Resident from '../services/residentServices.js';

const DRY_RUN = !process.argv.includes('--apply');

const EMPLOYMENT_STATUS_TO_CLASSIFICATION = {
  unemployed:      'Unemployed',
  'self-employed': 'Self Employed',
  retired:         'Retired',
  student:         'Student',
};

function isCollegeLevel(educationAttainment) {
  if (!educationAttainment) return false;
  const val = educationAttainment.toLowerCase();
  return (
    val.includes('college') ||
    val.includes('bachelor') ||
    val.includes('master') ||
    val.includes('doctorate') ||
    val.includes('doctoral') ||
    val.includes('university') ||
    val.includes('post-secondary') ||
    val.includes('tertiary')
  );
}

async function run() {
  console.log(`\n=== Backfill Classifications (${DRY_RUN ? 'DRY RUN' : 'APPLY'}) ===\n`);

  // Fetch all active residents with their municipality_id
  const { rows: residents } = await pool.query(`
    SELECT
      r.id, r.is_voter, r.employment_status, r.education_attainment,
      r.indigenous_person, r.birthdate, r.resident_id,
      b.municipality_id
    FROM residents r
    LEFT JOIN barangays b ON b.id = r.barangay_id
    WHERE r.status = 'active'
    ORDER BY r.id
  `);

  console.log(`Found ${residents.length} active residents to process.\n`);

  let totalInserted = 0;
  let totalSkipped  = 0;

  for (const r of residents) {
    const toInsert = [];

    if (r.is_voter) {
      toInsert.push({ type: 'Voter', details: [{ typeOfVoter: 'Regular' }] });
    }

    const employmentClass = EMPLOYMENT_STATUS_TO_CLASSIFICATION[r.employment_status];
    if (employmentClass) {
      if (r.employment_status === 'student') {
        const classType = isCollegeLevel(r.education_attainment) ? 'College Student' : 'Student';
        toInsert.push({ type: classType, details: [] });
      } else {
        toInsert.push({ type: employmentClass, details: [] });
      }
    }

    if (r.indigenous_person) {
      toInsert.push({ type: 'Indigenous Person', details: [] });
    }

    if (r.birthdate) {
      const ageDays = (Date.now() - new Date(r.birthdate).getTime()) / 86400000;
      if (ageDays >= 60 * 365.25) {
        toInsert.push({ type: 'Senior Citizen', details: [] });
      }
    }

    if (toInsert.length === 0) continue;

    for (const { type, details } of toInsert) {
      // Check if classification already exists
      const { rows: existing } = await pool.query(
        `SELECT id FROM resident_classifications
         WHERE resident_id = $1 AND classification_type = $2`,
        [r.id, type]
      );
      if (existing.length > 0) {
        totalSkipped++;
        continue;
      }

      // Verify classification type exists for municipality
      if (r.municipality_id) {
        const { rows: typeRows } = await pool.query(
          `SELECT id FROM classification_types WHERE name = $1 AND municipality_id = $2 LIMIT 1`,
          [type, r.municipality_id]
        );
        if (typeRows.length === 0) {
          console.log(`  [SKIP] ${r.resident_id || r.id}: type "${type}" not in municipality ${r.municipality_id}`);
          totalSkipped++;
          continue;
        }
      }

      if (DRY_RUN) {
        console.log(`  [DRY] Would insert "${type}" for resident ${r.resident_id || r.id}`);
        totalInserted++;
      } else {
        await pool.query(
          `INSERT INTO resident_classifications (resident_id, classification_type, classification_details)
           VALUES ($1, $2, $3)
           ON CONFLICT ON CONSTRAINT resident_classifications_unique_type DO NOTHING`,
          [r.id, type, JSON.stringify(details)]
        );
        console.log(`  [OK] Inserted "${type}" for resident ${r.resident_id || r.id}`);
        totalInserted++;

        // Trigger beneficiary sync for applicable types
        if (Resident.BENEFICIARY_SYNC_MAP[type]) {
          try {
            await Resident._syncBeneficiaryOnInsert(r.id, type, {});
            console.log(`       → Beneficiary sync done for "${type}"`);
          } catch (err) {
            console.error(`       → Beneficiary sync failed: ${err.message}`);
          }
        }
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Inserted: ${totalInserted}`);
  console.log(`  Skipped:  ${totalSkipped}`);
  if (DRY_RUN) {
    console.log(`\nThis was a DRY RUN. Re-run with --apply to write changes.\n`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
