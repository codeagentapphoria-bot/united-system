/**
 * Utility to export data to CSV and trigger download
 * @param data Array of objects to export
 * @param filename Name of the file to download
 * @param headers Optional custom headers mapping { key: label }
 */
export const exportToCSV = (
  data: any[],
  filename: string,
  headers?: Record<string, string>
) => {
  if (!data || data.length === 0) return;

  // Determine headers
  const keys = Object.keys(data[0]);
  const headerRow = headers
    ? Object.values(headers).join(',')
    : keys.join(',');

  // Create rows
  const rows = data.map((item) => {
    return (headers ? Object.keys(headers) : keys)
      .map((key) => {
        const value = item[key] ?? '';
        // Handle strings with commas by wrapping in quotes
        const stringValue = typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value;
        return stringValue;
      })
      .join(',');
  });

  // Combine header and rows
  const csvContent = [headerRow, ...rows].join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

