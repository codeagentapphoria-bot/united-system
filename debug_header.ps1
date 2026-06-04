$f = "Direkta Ayuda Beneficiaries_issues_garbled_fixed.csv"
$b = [System.IO.File]::ReadAllBytes($f)
"$f first bytes:"
$b[0..20] | ForEach-Object { "{0:X2}" -f $_ }
""
"$f first 80 chars:"
[System.Text.Encoding]::UTF8.GetString($b, 0, [Math]::Min(80, $b.Length))
