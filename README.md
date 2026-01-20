# Collector Analytics Dashboard

A web-based analytics dashboard for tracking foreclosure complaints collected from county clerk websites.

## Features

- **Real-time Data**: Automatically fetches and refreshes data from Google Sheets
- **Data Quality Checks**: Detects duplicates and malformed JSON fields
- **Normalization**: Consistent county and lender name normalization
- **Multiple Analytics Views**:
  - Four-Week Roll-Up by County
  - Year-to-Date Statistics
  - Current Month Statistics
  - Lender Analysis (Criteria Only)
  - Most Recent Complaints (Last 15 Days)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown in the terminal (typically `http://localhost:5173`)

## Configuration

### Google Sheets Integration

The dashboard connects to a Google Sheet at:
`https://docs.google.com/spreadsheets/d/1cx-5MHBBWy1a7XGJTOhkQyAj5eMA_v0Qbkr-7xBJPXw`

**For Public Sheets**: The dashboard will work automatically using CSV export.

**For Private Sheets**: 

Since this is a frontend-only application, **make your sheet public (view-only)**:

1. Open your Google Sheet
2. Click "Share" → "Change to anyone with the link"
3. Set to "Viewer" permissions
4. Click "Done"

The dashboard will automatically work using CSV export.

**Note**: Service accounts require a backend server and cannot be used in browser JavaScript for security reasons. If you need to keep the sheet private, you'll need to set up a backend proxy server.

### Column Mapping

**Important**: Update `src/config/columnMapping.ts` to match your actual spreadsheet column names. See `CONFIGURATION.md` for detailed instructions.

The dashboard expects these standard field names:
- `propertyAddress` - Property address
- `county` - County name
- `lender` or `plaintiff` - Lender/Plaintiff name
- `upb` - Unpaid Principal Balance (numeric)
- `meetsCriteria` - "Meets criteria" or "Does not meet criteria"
- `complaintDate` - Complaint date

The column mapping file allows you to map your actual column names to these standard fields.

## Data Quality

The dashboard automatically:
- Detects duplicate rows based on key fields
- Validates JSON fields and logs errors
- Flags rows with missing required fields
- Continues processing valid records even when issues are found

## Normalization

### County Normalization
- Case-insensitive matching
- Handles common abbreviations (NYC → New York, St. → Saint)
- Consistent capitalization

### Lender Normalization
- Removes punctuation
- Normalizes abbreviations (Inc. → Incorporated, LLC → Limited Liability Company)
- Standardizes casing
- Extensible through `NormalizationRegistry`

## Development

```bash
# Run development server (frontend only)
npm run dev

# Run both frontend and backend in development
npm run dev:full

# Build for production
npm run build

# Start production server (serves built frontend)
npm start

# Build and start production server (one command)
npm run build:start

# Preview production build
npm run preview

# Lint code
npm run lint

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Production Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick Start:**
```bash
# Build and start production server
npm run build:start

# Then open http://localhost:3001 in your browser
```

See [TESTING.md](./TESTING.md) for detailed testing information.

## Project Structure

```
src/
  components/          # React components for tables and UI
  hooks/              # Custom React hooks
  services/           # External service integrations
  types.ts            # TypeScript type definitions
  utils/              # Utility functions (normalization, calculations, data quality)
  App.tsx             # Main application component
  main.tsx            # Application entry point
```

## Browser Support

Modern browsers with ES2020 support (Chrome, Firefox, Safari, Edge).

## License

MIT

