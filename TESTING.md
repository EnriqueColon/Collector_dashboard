# Testing Guide

This document explains how to test the Collector Analytics Dashboard.

## Quick Start

1. **Install dependencies** (if you haven't already):
   ```bash
   npm install
   ```

2. **Run all tests**:
   ```bash
   npm test
   ```

3. **Run tests in watch mode** (re-runs on file changes):
   ```bash
   npm test -- --watch
   ```

4. **Run tests with UI** (interactive test runner):
   ```bash
   npm run test:ui
   ```

5. **Run tests with coverage report**:
   ```bash
   npm run test:coverage
   ```

6. **Test data processing with local mock data**:
   ```bash
   npm run test:local
   ```
   This runs a script that processes mock data and shows you how the system handles duplicates, JSON errors, and calculates all metrics.

## Test Structure

Tests are organized in the `src/test/` directory:

```
src/test/
  ├── setup.ts              # Test configuration
  ├── mockData.ts            # Mock data for testing
  ├── utils/
  │   ├── dataQuality.test.ts
  │   ├── normalization.test.ts
  │   └── calculations.test.ts
  ├── services/
  │   └── googleSheets.test.ts
  └── components/
      └── DataQualityPanel.test.tsx
```

## What's Tested

### 1. Data Quality Checks (`dataQuality.test.ts`)
- ✅ Row validation (required fields, data types)
- ✅ JSON field validation and error handling
- ✅ Duplicate detection (multiple strategies)
- ✅ Comprehensive error processing
- ✅ Error recovery (continues processing valid rows)

### 2. Normalization (`normalization.test.ts`)
- ✅ County name normalization
- ✅ Lender name normalization
- ✅ Abbreviation handling
- ✅ Case-insensitive matching
- ✅ Custom normalization rules

### 3. Calculations (`calculations.test.ts`)
- ✅ Criteria checking
- ✅ Four-week roll-up calculations
- ✅ Year-to-date statistics
- ✅ Current month statistics
- ✅ Lender analysis
- ✅ Recent complaints filtering
- ✅ Currency and date formatting

### 4. Google Sheets Service (`googleSheets.test.ts`)
- ✅ CSV data fetching
- ✅ CSV parsing (quoted fields, empty values)
- ✅ Error handling

### 5. Components (`DataQualityPanel.test.tsx`)
- ✅ Component rendering
- ✅ Statistics display
- ✅ Issue details display
- ✅ JSON error highlighting

## Running Specific Tests

Run tests for a specific file:
```bash
npm test dataQuality
```

Run tests matching a pattern:
```bash
npm test -- --grep "duplicate"
```

Run tests in a specific directory:
```bash
npm test src/test/utils
```

## Test Coverage

Generate a coverage report:
```bash
npm run test:coverage
```

This will create a `coverage/` directory with an HTML report. Open `coverage/index.html` in your browser to see detailed coverage.

## Mock Data

The `src/test/mockData.ts` file contains various test scenarios:
- Valid rows
- Duplicate rows
- Rows with JSON errors
- Rows with missing fields
- Rows with invalid data types
- Rows with future dates
- Rows that don't meet criteria

## Writing New Tests

### Example: Testing a Utility Function

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../utils/myUtils';

describe('myFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction('valid input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    const result = myFunction('');
    expect(result).toBe('default');
  });
});
```

### Example: Testing a React Component

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Continuous Integration

The tests are designed to run in CI/CD pipelines. They:
- ✅ Run quickly (no external dependencies)
- ✅ Are deterministic (no flaky tests)
- ✅ Have good coverage of critical paths
- ✅ Use mocks for external services

## Debugging Tests

1. **Use `console.log`** in your test files
2. **Use the test UI**: `npm run test:ui` for interactive debugging
3. **Run a single test**: Add `.only` to a test:
   ```typescript
   it.only('should test this', () => {
     // Only this test will run
   });
   ```
4. **Skip a test**: Add `.skip`:
   ```typescript
   it.skip('should skip this', () => {
     // This test will be skipped
   });
   ```

## Common Issues

### Tests fail with "Cannot find module"
- Make sure you've run `npm install`
- Check that file paths are correct

### Tests timeout
- Check for infinite loops in your code
- Ensure async operations complete properly

### Coverage is low
- Add tests for edge cases
- Test error paths
- Test boundary conditions

## Testing with Real Data

To test with your actual Google Sheets data:

1. **Update column mapping** in `src/config/columnMapping.ts` to match your spreadsheet columns

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Open the dashboard** in your browser (usually `http://localhost:5173`)

4. **Check the Data Quality panel** to see:
   - How many duplicates were detected
   - JSON errors found
   - Other validation issues

5. **Verify calculations** match your expectations:
   - Four-week roll-up totals
   - YTD statistics
   - Lender analysis

## Next Steps

- Add integration tests for the full data flow
- Add E2E tests with Playwright or Cypress
- Add performance tests for large datasets
- Add visual regression tests

