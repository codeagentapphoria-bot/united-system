/**
 * clean-senior-registry.ts
 *
 * Cleans "Senior Citizen Registry.csv" into two outputs:
 *   - Senior Citizen Registry_cleaned.csv   (~2,600 data rows)
 *   - Senior Citizen Registry_issues.csv    (flagged rows)
 *
 * What it does:
 *   - Skips header rows (rows 1-9) and summary/stat rows
 *   - Skips FOR DELISTING + DECEASED rows
 *   - Validates birthdates (parses MM-DD-YY, MM/DD/YYYY, YYYY-MM-DD)
 *   - Normalizes barangay names (strips "Brgy. " prefix)
 *   - Normalizes YES/NO → 1/0, treats 9 as 9
 *   - Outputs clean CSV + issues CSV
 *
 * Usage:
 *   npx ts-node scripts/clean-senior-registry.ts "<path-to-input-csv>"
 */

import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────────────────────
// Column Index Map  (0-indexed, based on actual data positions)
//
// The CSV header row has blank cells due to merged spreadsheet cells.
// We map by data position, not header label position.
// ──────────────────────────────────────────────────────────────────────────────

const COL = {
  NO: 0,
  LAST_NAME: 1,
  FIRST_NAME: 2,
  MIDDLE_NAME: 3,
  EXT_NAME: 4,        // EXT. NAME (often blank)
  BIRTH_DATE: 5,
  AGE: 6,
  SEX: 7,
  ADDRESS: 9,         // Barangay name, e.g. "Brgy. Alang-Alang"
  OSCA_ID: 10,        // OSCA I.D NO. (sparse)
  DATE_REGISTERED: 11,
  WITH_PENSION: 12,   // GSIS/SMM/SSS/PVAO value
  PENSION_AMOUNT: 15, // Numeric amount
  SOCPEN_STATUS: 16,  // "STATUS OF SOCIAL PENSION APPLICATION"
  SOURCE_OF_INCOME: 17,// "SOURCE OF INCOME" (SPISC BENEFICIARY etc.)
  SOCPEN_DATE: 18,    // DATE OF CURRENT STATUS OF SOCPEN APPLICATION
  ACTIVE_STATUS: 19,  // ACTIVE / FOR DELISTING / INACTIVE
  DELIST_REASON: 21,  // REASON FOR DELISTING
  DATE_OF_DEATH: 22,  // "If Deceased, Date of Death"
  MONTHLY_INCOME: 24, // AMOUNT OF MONTHLY INCOME
  REGULAR: 25,        // REGULAR (Y/N)
  WITH_ILLNESS: 27,   // WITH ILLNESS (YES/NO)
  ILLNESS_TYPE: 28,   // TYPE OF ILLNESS
  BEDRIDDEN: 29,      // BEDRIDDEN (Y/N)
  PWD: 30,            // PWD (YES/NO)
  DISABILITY_TYPE: 31,// TYPES OF DISABILITY
  WITH_GUARDIAN: 32,  // WITH GUARDIAN (YES/NO)
  GUARDIAN_NAME: 33,  // NAME OF GUARDIAN
  GUARDIAN_CONTACT: 34,// CONTACT NO.
  WITH_PHILSYS: 35,  // WITH PHILSYS ID (YES/NO)
  PHILSYS_ID: 36,    // PHILSYS ID NO.
  BBM_VERIFIED: 37,   // BBM SERBISYO VERIFIED
  DATE_AUTH: 39,      // date_authenticated
  LIVING_ALONE: 40,   // LIVING ALONE (YES/NO)
  NEGLECTED: 41,      // NEGLECTED (YES/NO)
  ABANDONED: 42,     // ABANDONED (YES/NO)
  HOUSING: 44,       // HOUSING CONDITION
  AGE_CLASS: 45,      // OCTOGENARIAN / NONAGENARIAN / CENTENARIAN
  NCSC_STATUS: 46,    // STATUS (NCSC)
  DATE_PROCESS: 47,   // DATE PROCESS
  DATE_CLAIMED: 48,   // DATE CLAIMED
  REMARKS: 49,       // REMARKS
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface RawRow {
  lineNumber: number;
  fields: string[];
}

interface CleanedRow {
  // Basic info (→ residents table)
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Extension Name': string;
  'Birthdate': string;
  'Sex': string;
  'Age': string;
  'Barangay': string;
  // Classification details (→ resident_classifications.classification_details JSONB)
  'oscaId': string;
  'dateRegistered': string;
  'withPension': string;
  'pensionAmount': string;
  'socPenStatus': string;
  'socPenDate': string;
  'sourceOfIncome': string;
  'monthlyIncome': string;
  'regular': string;
  'withIllness': string;
  'illnessType': string;
  'bedridden': string;
  'pwd': string;
  'disabilityType': string;
  'withGuardian': string;
  'guardianName': string;
  'guardianContact': string;
  'withPhilSys': string;
  'philSysId': string;
  'bbmVerified': string;
  'dateAuth': string;
  'livingAlone': string;
  'neglected': string;
  'abandoned': string;
  'housing': string;
  'ageClass': string;
  // SeniorCitizenBeneficiary fields
  'ncscStatus': string;
  'dateProcess': string;
  'dateClaimed': string;
  'remarks': string;
  // Derived
  'skipped': string;   // 'true' if row skipped, reason
  'skipReason': string;
}

type IssueReason =
  | 'summary_row'
  | 'no_record_number'
  | 'empty_row'
  | 'deceased_delisted'
  | 'parse_error'
  | 'unknown_barangay';

interface IssueRow {
  lineNumber: number;
  reason: IssueReason;
  rawFields: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// CSV Parser  (copied from clean-beneficiaries.ts)
// ──────────────────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

function readLines(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Remove UTF-8 BOM if present
  const content = raw.replace(/^\ufeff/, '');
  return content.split(/\r?\n/).filter((line) => line.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// Date parsing
// ──────────────────────────────────────────────────────────────────────────────

/** Parse a date string into YYYY-MM-DD. Returns null on failure. */
function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  const v = value.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return v;
    return null;
  }

  // MM-DD-YYYY (e.g. 01-17-40)
  const mdyDash = /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/.exec(v);
  if (mdyDash) {
    let [, month, day, year] = mdyDash;
    // Handle 2-digit year: 00-68 → 2000s, 69-99 → 1900s
    if (year.length === 2) {
      const y = parseInt(year, 10);
      year = y <= new Date().getFullYear() % 100 + 30 ? `20${year}` : `19${year}`;
    }
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // MM/DD/YYYY (e.g. 05/18/1935)
  const mdySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (mdySlash) {
    const [, month, day, year] = mdySlash;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Normalization helpers
// ──────────────────────────────────────────────────────────────────────────────

/** "Brgy. Alang-Alang" → "Alang-Alang" */
function normalizeBarangay(value: string): string {
  const v = (value || '').trim();
  return v.replace(/^Brgy\.?\s+/i, '').trim();
}

/** YES/NO/1/0/9 → numeric 1/0/2/9; empty/- → empty string */
function normalizeYesNo(value: string): string {
  const v = (value || '').trim().toLowerCase();
  if (v === 'yes' || v === 'y' || v === '1') return '1';
  if (v === 'no' || v === 'n' || v === '0') return '0';
  if (v === '9') return '9';
  return v;
}

/** "Male" / "male" → "Male", "Female" / "female" → "Female" */
function normalizeSex(value: string): string {
  const v = (value || '').trim().toLowerCase();
  if (v === 'male') return 'Male';
  if (v === 'female') return 'Female';
  return value.trim();
}

/** Strip non-digits from phone number */
function normalizePhone(value: string): string {
  const v = (value || '').trim();
  if (v === '' || v === '-') return '';
  const digits = v.replace(/\D/g, '');
  if (digits.length === 0) return '';
  return `+63${digits}`;
}

/** Clean text: trim, "-" → empty string */
function cleanText(value: string): string {
  const v = (value || '').trim();
  if (v === '-') return '';
  return v;
}

/** Check for genuinely garbled characters (replacement char, null bytes, control chars).
 *  NOTE: ASCII '?' is NOT flagged here — the CSV has '?' as a placeholder for lost
 *  diacritics (e.g. BALE?A = BALEÑA, CARDE?O = CARDEÑO). These are valid names. */
function hasGarbledChars(value: string): boolean {
  // Unicode replacement character (U+FFFD) — indicates byte-level corruption
  if (/\ufffd/.test(value)) return true;
  // Null bytes
  if (/\x00/.test(value)) return true;
  // Carriage return (shouldn't be in CSV fields)
  if (/\r/.test(value)) return true;
  // Non-printable control characters (excluding tab/newline which are normal)
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) return true;
  return false;
}

/** Check if a row is completely empty */
function isEmptyRow(fields: string[]): boolean {
  return fields.every((f) => (f || '').trim() === '' || (f || '').trim() === '-');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main cleaner
// ──────────────────────────────────────────────────────────────────────────────

function cleanRow(lineNumber: number, fields: string[]): CleanedRow | { skipped: true; reason: IssueReason } {
  // Access fields by column index
  const f = (col: number) => (fields[col] || '').trim();

  // Skip if record number is not a positive integer
  const no = f(COL.NO);
  if (!no || !/^\d+$/.test(no) || parseInt(no, 10) <= 0) {
    return { skipped: true, reason: 'no_record_number' };
  }

  // Skip summary / stat rows (no column 0 = summary row)
  // These have been caught above, but double-check age column
  const ageVal = f(COL.AGE);
  if (ageVal && !/^\d+$/.test(ageVal) && ageVal !== '') {
    // e.g. "TOTAL", "F", "M" etc.
    return { skipped: true, reason: 'summary_row' };
  }

    // Parse birthdate
  const birthdateParsed = parseDate(f(COL.BIRTH_DATE));
  if (!birthdateParsed) {
    return { skipped: true, reason: 'parse_error' };
  }

  // Check for DECEASED delisting → skip entirely
  const activeStatus = f(COL.ACTIVE_STATUS);
  const delistReason = f(COL.DELIST_REASON);
  const isDeceasedDelisted =
    activeStatus.toUpperCase().includes('DELISTING') &&
    delistReason.toUpperCase().includes('DECEASED');

  if (isDeceasedDelisted) {
    return { skipped: true, reason: 'deceased_delisted' };
  }

  return {
    'First Name': f(COL.FIRST_NAME),
    'Middle Name': f(COL.MIDDLE_NAME),
    'Last Name': f(COL.LAST_NAME),
    'Extension Name': f(COL.EXT_NAME),
    'Birthdate': birthdateParsed,
    'Sex': normalizeSex(f(COL.SEX)),
    'Age': ageVal,
    'Barangay': normalizeBarangay(f(COL.ADDRESS)),
    // Classification details
    'oscaId': cleanText(f(COL.OSCA_ID)),
    'dateRegistered': cleanText(f(COL.DATE_REGISTERED)),
    'withPension': cleanText(f(COL.WITH_PENSION)),
    'pensionAmount': cleanText(f(COL.PENSION_AMOUNT)),
    'socPenStatus': cleanText(f(COL.SOCPEN_STATUS)),
    'socPenDate': cleanText(f(COL.SOCPEN_DATE)),
    'sourceOfIncome': cleanText(f(COL.SOURCE_OF_INCOME)),
    'monthlyIncome': cleanText(f(COL.MONTHLY_INCOME)),
    'regular': normalizeYesNo(f(COL.REGULAR)),
    'withIllness': normalizeYesNo(f(COL.WITH_ILLNESS)),
    'illnessType': cleanText(f(COL.ILLNESS_TYPE)),
    'bedridden': normalizeYesNo(f(COL.BEDRIDDEN)),
    'pwd': normalizeYesNo(f(COL.PWD)),
    'disabilityType': cleanText(f(COL.DISABILITY_TYPE)),
    'withGuardian': normalizeYesNo(f(COL.WITH_GUARDIAN)),
    'guardianName': cleanText(f(COL.GUARDIAN_NAME)),
    'guardianContact': normalizePhone(f(COL.GUARDIAN_CONTACT)),
    'withPhilSys': normalizeYesNo(f(COL.WITH_PHILSYS)),
    'philSysId': cleanText(f(COL.PHILSYS_ID)),
    'bbmVerified': cleanText(f(COL.BBM_VERIFIED)),
    'dateAuth': cleanText(f(COL.DATE_AUTH)),
    'livingAlone': normalizeYesNo(f(COL.LIVING_ALONE)),
    'neglected': normalizeYesNo(f(COL.NEGLECTED)),
    'abandoned': normalizeYesNo(f(COL.ABANDONED)),
    'housing': cleanText(f(COL.HOUSING)),
    'ageClass': cleanText(f(COL.AGE_CLASS)),
    // SeniorCitizenBeneficiary
    'ncscStatus': f(COL.NCSC_STATUS),
    'dateProcess': cleanText(f(COL.DATE_PROCESS)),
    'dateClaimed': cleanText(f(COL.DATE_CLAIMED)),
    'remarks': cleanText(f(COL.REMARKS)),
    'skipped': 'false',
    'skipReason': '',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CSV Writer
// ──────────────────────────────────────────────────────────────────────────────

const BOM = '\ufeff';

function quoteField(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSVLine(fields: string[]): string {
  return fields.map(quoteField).join(',');
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: npx ts-node scripts/clean-senior-registry.ts "<path-to-input-csv>"');
    process.exit(1);
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`File not found: ${inputPath}`);
    process.exit(1);
  }

  const inputDir = path.dirname(inputPath);
  const inputBasename = path.basename(inputPath, '.csv');
  const cleanPath = path.join(inputDir, `${inputBasename}_cleaned.csv`);
  const issuesPath = path.join(inputDir, `${inputBasename}_issues.csv`);
  const dupesPath = path.join(inputDir, `${inputBasename}_duplicates.csv`);

  console.log(`Reading: ${inputPath}`);
  const lines = readLines(inputPath);
  console.log(`Total lines (incl. all rows): ${lines.length}`);

  // ── Parse all rows ─────────────────────────────────────────────────────────
  // Rows 0-8: header metadata + summary rows → skip
  // Row 9+ (index 9+): actual data rows
  const CLEAN_HEADERS = [
    'First Name',
    'Middle Name',
    'Last Name',
    'Extension Name',
    'Birthdate',
    'Sex',
    'Age',
    'Barangay',
    'oscaId',
    'dateRegistered',
    'withPension',
    'pensionAmount',
    'socPenStatus',
    'socPenDate',
    'sourceOfIncome',
    'monthlyIncome',
    'regular',
    'withIllness',
    'illnessType',
    'bedridden',
    'pwd',
    'disabilityType',
    'withGuardian',
    'guardianName',
    'guardianContact',
    'withPhilSys',
    'philSysId',
    'bbmVerified',
    'dateAuth',
    'livingAlone',
    'neglected',
    'abandoned',
    'housing',
    'ageClass',
    'ncscStatus',
    'dateProcess',
    'dateClaimed',
    'remarks',
    'skipped',
    'skipReason',
  ];

  const cleanedRows: CleanedRow[] = [];
  const issues: IssueRow[] = [];

  // Skip rows 0-8 (header + summary rows), process from index 9 onwards
  const dataLines = lines.slice(9);
  let lastLog = 0;

  console.log(`Processing ${dataLines.length} potential data rows (rows 10+ in file)...`);

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const lineNumber = i + 10; // +10 because data starts at row 10 (1-based)

    const fields = parseCSVLine(line);

    // Progress logging every 500 rows
    if (lineNumber - lastLog >= 500 || i === 0) {
      console.log(
        `Processed ${lineNumber - 9}/${dataLines.length} rows | ` +
          `Cleaned: ${cleanedRows.length} | ` +
          `Issues: ${issues.length} (row ${lineNumber})`
      );
      lastLog = lineNumber;
    }

    // Empty row check
    if (fields.length === 0 || isEmptyRow(fields)) {
      issues.push({ lineNumber, reason: 'empty_row', rawFields: fields });
      continue;
    }

    // Attempt to clean
    const result = cleanRow(lineNumber, fields);
    if ('skipped' in result && result.skipped === true) {
      issues.push({ lineNumber, reason: result.reason as IssueReason, rawFields: fields });
      continue;
    }

    cleanedRows.push(result as CleanedRow);
  }

  // ── Dedup ────────────────────────────────────────────────────────────────────
  // Key: first_name + last_name + barangay + birthdate (case-insensitive)
  const seen = new Map<string, { row: CleanedRow; lineNumber: number; count: number }>();
  const duplicates: Array<{ row: CleanedRow; lineNumber: number }> = [];
  const dedupedRows: CleanedRow[] = [];

  for (let i = 0; i < cleanedRows.length; i++) {
    const row = cleanedRows[i];
    // Derive lineNumber: dataLines index + 10 (1-based, matching original CSV line)
    const lineNumber = i + 10;
    const key = [
      (row['First Name'] || '').toLowerCase().trim(),
      (row['Last Name'] || '').toLowerCase().trim(),
      (row['Barangay'] || '').toLowerCase().trim(),
      (row['Birthdate'] || '').trim(),
    ].join('||');

    if (seen.has(key)) {
      duplicates.push({ row, lineNumber });
      seen.get(key)!.count++;
    } else {
      seen.set(key, { row, lineNumber, count: 1 });
      dedupedRows.push(row);
    }
  }

  console.log(`\nDedup: ${cleanedRows.length} raw cleaned → ${dedupedRows.length} unique (${duplicates.length} duplicates removed)`);

  // ── Write cleaned output (deduplicated) ──────────────────────────────────────
  const cleanLines: string[] = [
    BOM + toCSVLine(CLEAN_HEADERS),
    ...dedupedRows.map((row) =>
      toCSVLine(CLEAN_HEADERS.map((h) => row[h as keyof CleanedRow] as string))
    ),
  ];

  fs.writeFileSync(cleanPath, cleanLines.join('\r\n'), 'utf8');
  console.log(`Wrote: ${cleanPath} (${dedupedRows.length} unique rows)`);

  // ── Write duplicates output ─────────────────────────────────────────────────
  const dupHeaders = ['CSV Line', 'Count', ...CLEAN_HEADERS];
  const dupLines: string[] = [
    BOM + toCSVLine(dupHeaders),
    ...duplicates.map(({ row, lineNumber }) => {
      const entry = seen.get(
        [
          (row['First Name'] || '').toLowerCase().trim(),
          (row['Last Name'] || '').toLowerCase().trim(),
          (row['Barangay'] || '').toLowerCase().trim(),
          (row['Birthdate'] || '').trim(),
        ].join('||')
      )!;
      return toCSVLine([
        String(lineNumber),
        String(entry.count),
        ...CLEAN_HEADERS.map((h) => row[h as keyof CleanedRow] as string),
      ]);
    }),
  ];

  fs.writeFileSync(dupesPath, dupLines.join('\r\n'), 'utf8');
  console.log(`Wrote: ${dupesPath} (${duplicates.length} duplicate rows)`);

  // ── Write issues output ─────────────────────────────────────────────────────
  const issueHeaders = ['Line Number', 'Reason', 'NO', 'Last Name', 'First Name', 'Sex', 'Age', 'Barangay', 'ActiveStatus', 'DelistReason', 'Birthdate'];
  const issueLines: string[] = [
    BOM + toCSVLine(issueHeaders),
    ...issues.map((issue) => {
      const f = (col: number) => (issue.rawFields[col] || '').trim();
      return toCSVLine([
        String(issue.lineNumber),
        issue.reason,
        f(COL.NO),
        f(COL.LAST_NAME),
        f(COL.FIRST_NAME),
        f(COL.SEX),
        f(COL.AGE),
        normalizeBarangay(f(COL.ADDRESS)),
        f(COL.ACTIVE_STATUS),
        f(COL.DELIST_REASON),
        f(COL.BIRTH_DATE),
      ]);
    }),
  ];

  fs.writeFileSync(issuesPath, issueLines.join('\r\n'), 'utf8');
  console.log(`Wrote: ${issuesPath} (${issues.length} issue rows)`);

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n=== Summary ===');
  console.log(`Total lines in file : ${lines.length}`);
  console.log(`Data rows (rows 10+): ${dataLines.length}`);
  console.log(`Cleaned rows        : ${cleanedRows.length}`);
  console.log(`Duplicates removed  : ${duplicates.length}`);
  console.log(`Unique rows        : ${dedupedRows.length}`);
  console.log(`Issue rows         : ${issues.length}`);

  const reasonCounts: Record<IssueReason, number> = {
    summary_row: 0,
    no_record_number: 0,
    empty_row: 0,
    deceased_delisted: 0,
    parse_error: 0,
    unknown_barangay: 0,
  };
  for (const issue of issues) {
    reasonCounts[issue.reason]++;
  }
  console.log('\nBreakdown of issues:');
  for (const [reason, count] of Object.entries(reasonCounts)) {
    if (count > 0) console.log(`  ${reason}: ${count}`);
  }

  // ── Barangay distribution ───────────────────────────────────────────────────
  const barangayCount: Record<string, number> = {};
  for (const row of dedupedRows) {
    const brgy = row['Barangay'];
    barangayCount[brgy] = (barangayCount[brgy] || 0) + 1;
  }
  const brgys = Object.keys(barangayCount).sort();
  console.log(`\nBarangays found: ${brgys.length}`);
  for (const brgy of brgys.slice(0, 20)) {
    console.log(`  ${brgy}: ${barangayCount[brgy]}`);
  }
  if (brgys.length > 20) console.log(`  ... and ${brgys.length - 20} more`);
}

main();
