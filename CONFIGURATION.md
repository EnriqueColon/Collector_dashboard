# Configuration Guide

## Column Mapping

The dashboard needs to map your Google Sheet column names to standard field names. Update `src/config/columnMapping.ts` to match your spreadsheet structure.

### Required Fields

The dashboard expects the following fields (case-insensitive matching is supported):

1. **propertyAddress** - Property address
   - Common column names: "Property Address", "Address", "property_address"

2. **county** - County name
   - Common column names: "County", "county_name", "County Name"

3. **lender** or **plaintiff** - Lender/Plaintiff name
   - Common column names: "Lender", "Plaintiff", "Lender/Plaintiff", "lender_name"

4. **upb** - Unpaid Principal Balance (numeric)
   - Common column names: "UPB", "Unpaid Principal Balance", "upb_amount", "Principal Balance"

5. **meetsCriteria** - Criteria status
   - Common column names: "Meets Criteria", "meets_criteria", "Criteria", "Status"
   - Expected values: "Meets criteria" or "Does not meet criteria" (case-insensitive)

6. **complaintDate** - Complaint filing date
   - Common column names: "Complaint Date", "Date", "complaint_date", "Filed Date"
   - Accepts various date formats

### Example Configuration

```typescript
export const COLUMN_MAPPING: Record<string, string> = {
  'Property Address': 'propertyAddress',
  'County': 'county',
  'Lender/Plaintiff': 'lender',
  'UPB': 'upb',
  'Meets Criteria': 'meetsCriteria',
  'Complaint Date': 'complaintDate',
};
```

### How to Find Your Column Names

1. Open your Google Sheet
2. Look at the first row (header row)
3. Copy the exact column names
4. Add them to the `COLUMN_MAPPING` object in `src/config/columnMapping.ts`

## Google Sheets Access

### Public Sheets
If your Google Sheet is publicly accessible, the dashboard will work automatically using CSV export.

### Private Sheets
For private sheets, you have two options:

1. **Make the sheet public (view-only)**: 
   - Share → Get link → Change to "Anyone with the link can view"

2. **Use Google Sheets API**:
   - Get a Google API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Sheets API
   - Add the API key to your environment or update the service

## Normalization Customization

### County Normalization
Edit `src/utils/normalization.ts` to add custom county name mappings:

```typescript
const countyMap: Record<string, string> = {
  'your-variation': 'standard-name',
  // Add more mappings
};
```

### Lender Normalization
Edit `src/utils/normalization.ts` to add custom lender name mappings:

```typescript
const abbreviationMap: Record<string, string> = {
  'your-abbrev': 'full-name',
  // Add more mappings
};
```

## Refresh Interval

The dashboard automatically refreshes every 5 minutes. To change this, edit `src/hooks/useSheetData.ts`:

```typescript
const REFRESH_INTERVAL = 5 * 60 * 1000; // Change to your desired interval
```

## Data Quality Thresholds

The dashboard flags:
- Duplicate rows (based on property address, county, lender, date, and UPB)
- Missing required fields
- Invalid JSON in JSON fields
- Invalid date formats
- Invalid UPB values

Adjust validation rules in `src/utils/dataQuality.ts` if needed.

