# Merge Direkta Ayuda Beneficiaries CSV files
# Output: Direkta Ayuda Beneficiaries_import.csv  (UTF-8 with BOM)

$ErrorActionPreference = "Stop"
$srcDir = $PSScriptRoot

# Target columns (in order for output)
$targetCols = @(
    "First Name","Middle Name","Last Name","Extension Name","Birthdate",
    "Sex","Civil Status","Profession","Phone Number","Region",
    "Municipality","Barangay","Street","Place of Birth",
    "Spouse Name","Emergency Contact Person","Emergency Contact Number",
    "ID Type","Resident ID"
)

# Map: fixed-file header -> target header (empty = strip)
$colMap = @{
    "Middle Name (Optional)"                           = "Middle Name"
    "Extension Name (Optional, e.g., Jr., III)"        = "Extension Name"
    "Sex (Male / Female)"                               = "Sex"
    "Profession (Optional)"                             = "Profession"
    "Emergency Contact Number"                          = "Emergency Contact Number"
    "Emergency Contact Person"                          = "Emergency Contact Person"
    "ID Type"                                          = "ID Type"
    "Resident ID"                                      = "Resident ID"
    "Phone Number"                                     = "Phone Number"
    "Region"                                           = "Region"
    "Municipality"                                     = "Municipality"
    "Barangay"                                         = "Barangay"
    "Street"                                           = "Street"
    "Place of Birth"                                   = "Place of Birth"
    "Spouse Name"                                      = "Spouse Name"
    "Civil Status"                                     = "Civil Status"
    "Birthdate"                                        = "Birthdate"
    "First Name"                                       = "First Name"
    "Last Name"                                        = "Last Name"
    "Province"                                         = ""
    "Postal Code"                                      = ""
    "Line Number"                                      = ""
    "Reason"                                           = ""
}

function Read-FileText {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $start = 0
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $start = 3
    }
    [System.Text.Encoding]::UTF8.GetString($bytes, $start, $bytes.Length - $start)
}

function Parse-CsvHeader {
    # Parse a CSV header line into column names, respecting quoted fields
    # Trim leading/trailing quotes from each field (these are CSV quoting, not part of the name)
    param([string]$Line)
    $cols = @()
    $inQuotes = $false
    $current = ""
    for ($i = 0; $i -lt $line.Length; $i++) {
        $ch = $line[$i]
        if ($ch -eq '"') {
            if ($inQuotes -and $i + 1 -lt $line.Length -and $line[$i+1] -eq '"') {
                $current += '"'; $i++
            } else {
                $inQuotes = -not $inQuotes
            }
        } elseif ($ch -eq ',' -and -not $inQuotes) {
            $cols += $current.Trim().Trim('"')
            $current = ""
        } else {
            $current += $ch
        }
    }
    $cols += $current.Trim().Trim('"')
    ,$cols
}

function Get-ColIndexMap {
    param([string[]]$Headers)
    $map = @{}
    for ($i = 0; $i -lt $Headers.Count; $i++) { $map[$Headers[$i]] = $i }
    $map
}

function Parse-CsvRow {
    # Parse a CSV row into field values
    param([string]$Line)
    $fields = @()
    $inQuotes = $false
    $current = ""
    for ($i = 0; $i -lt $line.Length; $i++) {
        $ch = $line[$i]
        if ($ch -eq '"') {
            if ($inQuotes -and $i + 1 -lt $line.Length -and $line[$i+1] -eq '"') {
                $current += '"'; $i++
            } else {
                $inQuotes = -not $inQuotes
            }
        } elseif ($ch -eq ',' -and -not $inQuotes) {
            $fields += $current.Trim().Trim('"')
            $current = ""
        } else {
            $current += $ch
        }
    }
    $fields += $current.Trim().Trim('"')
    ,$fields
}

function Normalize-Columns {
    param([string[]]$Row, [hashtable]$Idx)
    $out = @()
    foreach ($col in $targetCols) {
        $srcCol = $col
        if ($colMap.ContainsKey($col)) { $srcCol = $colMap[$col] }
        if ($srcCol -eq "") {
            $out += ""
            continue
        }
        if ($Idx.ContainsKey($srcCol)) {
            $v = $Row[$Idx[$srcCol]]
            if ($null -ne $v) { $out += $v.Trim() } else { $out += "" }
        } else {
            $out += ""
        }
    }
    $out
}

function Get-Birthdate {
    param([string[]]$Row, [hashtable]$Idx)
    if ($Idx.ContainsKey("Birthdate")) {
        $v = $Row[$Idx["Birthdate"]]
        if ($null -ne $v) { return $v.Trim() }
    }
    return ""
}

# ==================== MAIN ====================

Write-Host ""
Write-Host "=== MERGE REPORT ===" -ForegroundColor Cyan
Write-Host ""

# --- Load cleaned CSV ---
Write-Host "[1/3] Loading cleaned CSV..." -ForegroundColor Yellow
$text1 = Read-FileText -Path (Join-Path $srcDir "Direkta Ayuda Beneficiaries_cleaned.csv")
$text1 = $text1 -replace "`r`n", "`n" -replace "`r", "`n"
$lines1 = $text1 -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$h1 = Parse-CsvHeader -Line $lines1[0]
$idx1 = Get-ColIndexMap -Headers $h1
$cleanedRows = $lines1.Count - 1
Write-Host ("    Header cols: {0} | Data rows: {1}" -f $h1.Count, $cleanedRows)

# --- Load garbled_fixed CSV ---
Write-Host "[2/3] Loading garbled_fixed CSV..." -ForegroundColor Yellow
$text2 = Read-FileText -Path (Join-Path $srcDir "Direkta Ayuda Beneficiaries_issues_garbled_fixed.csv")
$text2 = $text2 -replace "`r`n", "`n" -replace "`r", "`n"
$lines2 = $text2 -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$h2raw = $lines2[0]
# garbled_fixed: first field is "Line Number (missing opening quote)
# Normalize so first field is properly quoted: prepend '"' if needed
if ($h2raw.StartsWith('Line Number","')) {
    $h2raw = '"Line Number","Reason"' + $h2raw.Substring('Line Number","Reason"'.Length)
}
$h2 = Parse-CsvHeader -Line $h2raw
$idx2 = Get-ColIndexMap -Headers $h2
$garbledTotal = $lines2.Count - 1
Write-Host ("    Header cols: {0} | Data rows: {1}" -f $h2.Count, $garbledTotal)
Write-Host ("    Headers: {0}" -f ($h2 -join " | "))

# --- Load parse_error_fixed CSV ---
Write-Host "[3/3] Loading parse_error_fixed CSV..." -ForegroundColor Yellow
$text3 = Read-FileText -Path (Join-Path $srcDir "Direkta Ayuda Beneficiaries_issues_parse_error_fixed.csv")
$text3 = $text3 -replace "`r`n", "`n" -replace "`r", "`n"
$lines3 = $text3 -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
$h3raw = $lines3[0]
if ($h3raw.StartsWith('Line Number","')) {
    $h3raw = '"Line Number","Reason"' + $h3raw.Substring('Line Number","Reason"'.Length)
}
$h3 = Parse-CsvHeader -Line $h3raw
$idx3 = Get-ColIndexMap -Headers $h3
$parseErrorTotal = $lines3.Count - 1
Write-Host ("    Header cols: {0} | Data rows: {1}" -f $h3.Count, $parseErrorTotal)

# --- Verify column coverage ---
Write-Host ""
Write-Host "[CHECK] Column coverage..." -ForegroundColor Cyan
$missing2 = @()
$missing3 = @()
foreach ($col in $targetCols) {
    $srcCol = $col
    if ($colMap.ContainsKey($col)) { $srcCol = $colMap[$col] }
    if ($srcCol -ne "" -and -not $idx2.ContainsKey($srcCol)) { $missing2 += $col }
    if ($srcCol -ne "" -and -not $idx3.ContainsKey($srcCol)) { $missing3 += $col }
}
if ($missing2.Count -gt 0) { Write-Warning ("  garbled_fixed missing: {0}" -f ($missing2 -join ", ")) }
if ($missing3.Count -gt 0) { Write-Warning ("  parse_error_fixed missing: {0}" -f ($missing3 -join ", ")) }
if ($missing2.Count -eq 0 -and $missing3.Count -eq 0) {
    Write-Host "  All 19 target columns found in both fixed files." -ForegroundColor Green
}

# --- Build output ---
Write-Host ""
Write-Host "[BUILD] Merging rows..." -ForegroundColor Cyan
$outputLines = @()
$outputLines += ($targetCols -join ",")

# Append cleaned
foreach ($line in $lines1[1..($lines1.Count-1)]) {
    $row = Parse-CsvRow -Line $line
    $out = Normalize-Columns -Row $row -Idx $idx1
    $outputLines += ($out -join ",")
}
Write-Host ("  + {0} cleaned rows" -f $cleanedRows)

# Append garbled_fixed
foreach ($line in $lines2[1..($lines2.Count-1)]) {
    $row = Parse-CsvRow -Line $line
    $out = Normalize-Columns -Row $row -Idx $idx2
    $outputLines += ($out -join ",")
}
Write-Host ("  + {0} garbled_fixed rows" -f $garbledTotal)

# Append parse_error_fixed (skip empty birthdate)
$parseAppended = 0
$parseExcluded = 0
foreach ($line in $lines3[1..($lines3.Count-1)]) {
    $row = Parse-CsvRow -Line $line
    $bday = Get-Birthdate -Row $row -Idx $idx3
    if ([string]::IsNullOrWhiteSpace($bday)) {
        $parseExcluded++
        continue
    }
    $out = Normalize-Columns -Row $row -Idx $idx3
    $outputLines += ($out -join ",")
    $parseAppended++
}
Write-Host ("  + {0} parse_error_fixed rows  (excluded: {1} with empty birthdate)" -f $parseAppended, $parseExcluded)

# --- Write output with UTF-8 BOM ---
Write-Host ""
Write-Host "[WRITE] Output file..." -ForegroundColor Cyan
$outPath = Join-Path $srcDir "Direkta Ayuda Beneficiaries_import.csv"
$content = $outputLines -join "`r`n"
$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllText($outPath, $content, $utf8Bom)
Write-Host "  Written: $outPath" -ForegroundColor Green

# --- Final report ---
$totalRows = $outputLines.Count - 1
Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host ("  Total rows in output:  {0}" -f $totalRows) -ForegroundColor Green
Write-Host ("  - From cleaned:         {0}" -f $cleanedRows)
Write-Host ("  - From garbled_fixed:   {0}" -f $garbledTotal)
Write-Host ("  - From parse_error:     {0}  (excluded {1})" -f $parseAppended, $parseExcluded)
Write-Host ""
if ($totalRows -eq 4532) {
    Write-Host "  Status: DONE  (matches expected 4,532 rows)" -ForegroundColor Green
} else {
    Write-Host ("  Status: DONE  (got {0} rows, expected 4,532)" -f $totalRows) -ForegroundColor Yellow
}
Write-Host "======================================" -ForegroundColor Green
