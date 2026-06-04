/**
 * clean-beneficiaries.ts
 *
 * Cleans "Direkta Ayuda Beneficiaries.csv" into two outputs:
 *   - Direkta Ayuda Beneficiaries_cleaned.csv  (~4,300 rows)
 *   - Direkta Ayuda Beneficiaries_issues.csv   (~244 rows)
 *
 * Usage:
 *   npx ts-node scripts/clean-beneficiaries.ts "<path-to-input-csv>"
 */

import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface RawRow {
  lineNumber: number;
  fields: string[];
}

interface CleanedRow {
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Extension Name': string;
  'Birthdate': string;
  'Sex': string;
  'Civil Status': string;
  'Profession': string;
  'Phone Number': string;
  'Region': string;
  'Municipality': string;
  'Barangay': string;
  'Street': string;
  'Place of Birth': string;
  'Spouse Name': string;
  'Emergency Contact Person': string;
  'Emergency Contact Number': string;
  'ID Type': string;
  'Resident ID': string;
}

type IssueReason =
  | 'shifted_columns'
  | 'garbled_encoding'
  | 'empty_row'
  | 'parse_error';

interface IssueRow {
  lineNumber: number;
  reason: IssueReason;
  rawFields: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// CSV Parser
// ──────────────────────────────────────────────────────────────────────────────

/** Parse a single CSV line handling quoted fields and embedded commas. */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote "", inside quoted field
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

/** Read all lines from a UTF-8 file (strips trailing newline). */
function readLines(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Remove UTF-8 BOM if present
  const content = raw.replace(/^\ufeff/, '');
  return content.split(/\r?\n/).filter((line) => line.length > 0);
}

// ──────────────────────────────────────────────────────────────────────────────
// Date parsing
// ──────────────────────────────────────────────────────────────────────────────

/** Attempt to parse a date string into YYYY-MM-DD. Returns null on failure. */
function parseDate(value: string): string | null {
  if (!value || value.trim() === '') return null;
  const v = value.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return v;
    return null;
  }

  // MM-DD-YYYY
  const mdyDash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(v);
  if (mdyDash) {
    const [, month, day, year] = mdyDash;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // M/D/YYYY
  const mdySlash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (mdySlash) {
    const [, month, day, year] = mdySlash;
    const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Detection helpers
// ──────────────────────────────────────────────────────────────────────────────

const SHIFTED_MUNICIPALITY_VALUES = ['VIII', 'Region VIII', '8'];

/** Check if a row appears to have shifted columns (Municipality col = Region value). */
function isShiftedRow(fields: string[]): boolean {
  // Municipality is index 11 (0-based)
  if (fields.length >= 12) {
    const municipality = (fields[11] || '').trim();
    if (SHIFTED_MUNICIPALITY_VALUES.includes(municipality)) return true;
  }
  return false;
}

/** Detect garbled characters (replacement character, BOM fragments, etc.). */
function hasGarbledChars(value: string): boolean {
  // Check for common garbled sequences
  if (/\ufffd|\x00|\r/.test(value)) return true;
  // Check for mojibake patterns (multiple replacement chars)
  if ((value.match(/\ufffd/g) || []).length > 2) return true;
  // Check for non-printable ASCII in name fields (first 4 fields)
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) return true;
  return false;
}

/** Check if a row is completely empty (all fields empty or "-"). */
function isEmptyRow(fields: string[]): boolean {
  return fields.every((f) => f.trim() === '' || f.trim() === '-');
}

/** Normalize Region: any variant → "Region VIII" */
function normalizeRegion(value: string): string {
  const v = (value || '').trim();
  if (v === 'VIII' || v === '8' || v === 'Region VIII') return 'Region VIII';
  return v;
}

/** Normalize Municipality: "Borongan City" → "Borongan" */
function normalizeMunicipality(value: string): string {
  const v = (value || '').trim();
  if (v === 'Borongan City') return 'Borongan';
  return v;
}

/** Normalize Sex: any casing → "Male" or "Female" */
function normalizeSex(value: string): string {
  const v = (value || '').trim().toLowerCase();
  if (v === 'male') return 'Male';
  if (v === 'female') return 'Female';
  return value.trim();
}

/** Strip non-digits and prefix +63. Empty/- → empty string. */
function normalizePhone(value: string): string {
  const v = (value || '').trim();
  if (v === '' || v === '-') return '';
  const digits = v.replace(/\D/g, '');
  if (digits.length === 0) return '';
  return `+63${digits}`;
}

/** Clean a text field: trim, "-" → empty string. */
function cleanText(value: string): string {
  const v = (value || '').trim();
  if (v === '-') return '';
  return v;
}

/** Normalize Profession: "None" → empty string. */
function normalizeProfession(value: string): string {
  const v = (value || '').trim();
  if (v === 'None') return '';
  return v;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main cleaner
// ──────────────────────────────────────────────────────────────────────────────

const RAW_HEADERS = [
  'First Name',
  'Middle Name (Optional)',
  'Last Name',
  'Extension Name (Optional, e.g., Jr., III)',
  'Birthdate',
  'Sex (Male / Female)',
  'Civil Status',
  'Profession (Optional)',
  'Phone Number',
  'Region',
  'Province',
  'Municipality',
  'Barangay',
  'Street',
  'Postal Code',
  'Place of Birth',
  'Spouse Name',
  'Emergency Contact Person',
  'Emergency Contact Number',
  'ID Type',
  'Resident ID',
];

const CLEAN_HEADERS = [
  'First Name',
  'Middle Name',
  'Last Name',
  'Extension Name',
  'Birthdate',
  'Sex',
  'Civil Status',
  'Profession',
  'Phone Number',
  'Region',
  'Municipality',
  'Barangay',
  'Street',
  'Place of Birth',
  'Spouse Name',
  'Emergency Contact Person',
  'Emergency Contact Number',
  'ID Type',
  'Resident ID',
];

function cleanRow(lineNumber: number, fields: string[]): CleanedRow | null {
  const [
    firstName,
    middleName,
    lastName,
    extensionName,
    birthdate,
    sex,
    civilStatus,
    profession,
    phoneNumber,
    region,
    _province,
    municipality,
    barangay,
    street,
    _postalCode,
    placeOfBirth,
    spouseName,
    emergencyContactPerson,
    emergencyContactNumber,
    idType,
    residentId,
  ] = fields;

  // Check for garbled chars in name fields
  const nameFields = [firstName, middleName, lastName, extensionName];
  for (const f of nameFields) {
    if (hasGarbledChars(f)) return null;
  }

  const birthdateParsed = parseDate(birthdate);
  if (!birthdateParsed) return null;

  return {
    'First Name': (firstName || '').trim(),
    'Middle Name': (middleName || '').trim(),
    'Last Name': (lastName || '').trim(),
    'Extension Name': (extensionName || '').trim(),
    'Birthdate': birthdateParsed,
    'Sex': normalizeSex(sex),
    'Civil Status': (civilStatus || '').trim(),
    'Profession': normalizeProfession(profession),
    'Phone Number': normalizePhone(phoneNumber),
    'Region': normalizeRegion(region),
    'Municipality': normalizeMunicipality(municipality),
    'Barangay': (barangay || '').trim(),
    'Street': cleanText(street),
    'Place of Birth': cleanText(placeOfBirth),
    'Spouse Name': cleanText(spouseName),
    'Emergency Contact Person': cleanText(emergencyContactPerson),
    'Emergency Contact Number': normalizePhone(emergencyContactNumber),
    'ID Type': (idType || '').trim(),
    'Resident ID': cleanText(residentId),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// CSV Writer
// ──────────────────────────────────────────────────────────────────────────────

const BOM = '\ufeff';

/** Wrap a field in double quotes if it contains a comma, newline, or quotes. */
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
    console.error('Usage: npx ts-node scripts/clean-beneficiaries.ts "<path-to-input-csv>"');
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

  console.log(`Reading: ${inputPath}`);
  const lines = readLines(inputPath);
  console.log(`Total lines (incl. header): ${lines.length}`);

  if (lines.length < 2) {
    console.error('File has no data rows (need at least header + 1 data row)');
    process.exit(1);
  }

  const headerLine = lines[0];
  const headerFields = parseCSVLine(headerLine);

  if (headerFields.length !== RAW_HEADERS.length) {
    console.warn(
      `Warning: header has ${headerFields.length} columns, expected ${RAW_HEADERS.length}. Proceeding anyway.`
    );
  }

  const cleanedRows: CleanedRow[] = [];
  const issues: IssueRow[] = [];

  const dataLines = lines.slice(1);
  let lastLog = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const lineNumber = i + 2; // +2 because: 1-indexed + 1 for header

    const fields = parseCSVLine(line);

    // Progress logging every 500 rows
    if (lineNumber - lastLog >= 500 || i === 0) {
      console.log(`Cleaned ${cleanedRows.length} rows, ${issues.length} issues... (row ${lineNumber})`);
      lastLog = lineNumber;
    }

    // Empty row check
    if (fields.length === 0 || isEmptyRow(fields)) {
      issues.push({ lineNumber, reason: 'empty_row', rawFields: fields });
      continue;
    }

    // Pad/truncate to expected column count
    while (fields.length < RAW_HEADERS.length) fields.push('');
    if (fields.length > RAW_HEADERS.length) fields.length = RAW_HEADERS.length;

    // Shifted columns check
    if (isShiftedRow(fields)) {
      issues.push({ lineNumber, reason: 'shifted_columns', rawFields: fields });
      continue;
    }

    // Garbled char check on name fields
    const hasGarbled = [fields[0], fields[1], fields[2], fields[3]].some((f) =>
      hasGarbledChars(f || '')
    );
    if (hasGarbled) {
      issues.push({ lineNumber, reason: 'garbled_encoding', rawFields: fields });
      continue;
    }

    // Attempt to clean
    const cleaned = cleanRow(lineNumber, fields);
    if (!cleaned) {
      issues.push({ lineNumber, reason: 'parse_error', rawFields: fields });
      continue;
    }

    cleanedRows.push(cleaned);
  }

  // ── Write cleaned output ──────────────────────────────────────────────────
  const cleanLines: string[] = [
    BOM + toCSVLine(CLEAN_HEADERS),
    ...cleanedRows.map((row) =>
      toCSVLine(CLEAN_HEADERS.map((h) => row[h as keyof CleanedRow] as string))
    ),
  ];

  fs.writeFileSync(cleanPath, cleanLines.join('\r\n'), 'utf8');
  console.log(`\nWrote: ${cleanPath} (${cleanedRows.length} rows)`);

  // ── Write issues output ──────────────────────────────────────────────────
  const issueHeaders = ['Line Number', 'Reason', ...RAW_HEADERS];
  const issueLines: string[] = [
    BOM + toCSVLine(issueHeaders),
    ...issues.map((issue) =>
      toCSVLine([String(issue.lineNumber), issue.reason, ...issue.rawFields])
    ),
  ];

  fs.writeFileSync(issuesPath, issueLines.join('\r\n'), 'utf8');
  console.log(`Wrote: ${issuesPath} (${issues.length} rows)`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n=== Summary ===');
  console.log(`Cleaned rows : ${cleanedRows.length}`);
  console.log(`Issue rows   : ${issues.length}`);

  const reasonCounts: Record<IssueReason, number> = {
    shifted_columns: 0,
    garbled_encoding: 0,
    empty_row: 0,
    parse_error: 0,
  };
  for (const issue of issues) {
    reasonCounts[issue.reason]++;
  }
  console.log('\nBreakdown of issues:');
  for (const [reason, count] of Object.entries(reasonCounts)) {
    console.log(`  ${reason}: ${count}`);
  }
}

main();
