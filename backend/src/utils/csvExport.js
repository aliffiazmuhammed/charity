/**
 * Escape a field value for CSV.
 * Wraps in double quotes if it contains commas, quotes, or newlines.
 */
const escapeCSVField = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Format a date to DD/MM/YYYY.
 */
const formatDate = (dateValue) => {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Generate a CSV string from an array of donation objects.
 * Columns: Name, Phone, Amount (₹), Date, Note
 */
export const generateCSV = (donations) => {
  const headers = ['Name', 'Phone', 'Amount (₹)', 'Date', 'Note', 'Care Of'];
  const headerRow = headers.join(',');

  const dataRows = donations.map((donation) => {
    const fields = [
      escapeCSVField(donation.donorName),
      escapeCSVField(donation.phone),
      escapeCSVField(donation.amount),
      escapeCSVField(formatDate(donation.date)),
      escapeCSVField(donation.note || ''),
      escapeCSVField(donation.careOf || ''),
    ];
    return fields.join(',');
  });

  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
};
