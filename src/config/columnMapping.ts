// Column mapping configuration
// Update this file to match your actual Google Sheet column names

export const COLUMN_MAPPING: Record<string, string> = {
  // Map your actual spreadsheet column names to standard field names
  'Property Address': 'propertyAddress',
  'County': 'county',
  'Plaintiff': 'plaintiff',
  'Sum of Unpaid Balance(s)': 'upb',
  'Unpaid Balance(s)': 'upb', // Fallback if Sum column is empty
  'Meets Criteria?': 'meetsCriteria',
  'Processing Log': 'complaintDate',
  
  // Additional mappings for flexibility
  'Document Title': 'documentTitle',
  'Defendant': 'defendant',
  'Original Loan Amount': 'originalLoanAmount',
  'Default Date': 'defaultDate',
};

/**
 * Maps a column name to the standard field name
 */
export function mapColumnName(columnName: string): string {
  const trimmed = columnName.trim();
  return COLUMN_MAPPING[trimmed] || trimmed;
}

