// Utility function to format labels
export const formatLabel = (label) => {
  if (!label) return "Unknown";

  // Handle special cases
  const specialCases = {
    college_graduate: "College Graduate",
    post_graduate: "Post Graduate",
    high_school_graduate: "High School Graduate",
    elementary_graduate: "Elementary Graduate",
    elementary_undergraduate: "Elementary Undergraduate",
    high_school_undergraduate: "High School Undergraduate",
    college_undergraduate: "College Undergraduate",
    post_graduate_studies: "Post Graduate Studies",
    no_formal_education: "No Formal Education",
    "self-employed": "Self Employed",
    government_employee: "Government Employee",
    private_employee: "Private Employee",
    business_owner: "Business Owner",
    student: "Student",
    retired: "Retired",
    unemployed: "Unemployed",
    married: "Married",
    single: "Single",
    widowed: "Widowed",
    divorced: "Divorced",
    separated: "Separated",
    male: "Male",
    female: "Female",
  };

  if (specialCases[label.toLowerCase()]) {
    return specialCases[label.toLowerCase()];
  }

  // General formatting: replace underscores with spaces and capitalize
  return label.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};

// Export functions
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;

  // Helper function to escape CSV values
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n")
    ) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Create Excel-compatible HTML table with bold headers and highlighted unemployed
  const headers = Object.keys(data[0]);

  // Create HTML table for Excel with bold headers and highlighting
  const htmlTable = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sheet1</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th { background-color: #1f2937; color: white; font-weight: bold; border: 1px solid #374151; padding: 8px; text-align: left; }
          td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          .unemployed { background-color: #fef3c7; font-weight: bold; }
          .employed { background-color: #d1fae5; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map((header) => `<th>${header}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${data
              .map((row) => {
                const isUnemployed = row["Employment Status"] === "unemployed";
                const rowClass = isUnemployed ? "unemployed" : "employed";
                return `<tr class="${rowClass}">${Object.values(row)
                  .map((value) => `<td>${value || ""}</td>`)
                  .join("")}</tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Export as HTML for better Excel compatibility with formatting
  const blob = new Blob([htmlTable], { type: "text/html" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xls`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportToJSON = (data, filename) => {
  if (!data) return;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  window.URL.revokeObjectURL(url);
};

// Calculate trends
export const calculateTrend = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get filter description
export const getFilterDescription = (
  baseDescription,
  selectedBarangay,
  _unused1,
  barangays,
  _unused2
) => {
  let description = baseDescription;
  if (selectedBarangay) {
    const barangay = barangays.find(
      (b) => b.id.toString() === selectedBarangay
    );
    if (barangay) {
      description += ` (${barangay.barangay_name})`;
    }
  }
  // Puroks removed in v2 - selectedPurok is no longer used
  // Keeping parameter for backward compatibility but purok filtering is disabled
  return description;
};
