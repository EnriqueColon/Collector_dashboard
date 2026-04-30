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
  'Plaintiff Attorney Name': 'plaintiffAttorneyName',
  'Plaintiff Attorney Email': 'plaintiffAttorneyEmail',
  'Plaintiff Attoreny Email Sent?': 'emailSent',
  'Processing Log': 'complaintDate',

  // Valuation columns
  '[Automatic calculation] Subject address valuation based on median price per square foot': 'valuationMedianSqFt',
  '[Automatic calculation] Subject address valuation based on mean price per square foot':   'valuationMeanSqFt',
  '[Automatic calculation] Subject address valuation based on median price per lot size square foot': 'valuationMedianLot',
  '[Automatic calculation] Subject address valuation based on mean price per lot size square foot':   'valuationMeanLot',
  '[Median Sq Ft. Val.] Loan to Value':  'ltvMedianSqFt',
  '[Mean Sq Ft. Val.] Loan to Value':    'ltvMeanSqFt',
  '[Median Lot Size Val.] Loan to Value': 'ltvMedianLot',
  '[Mean Lot Size Val.] Loan to Value':   'ltvMeanLot',
  
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

