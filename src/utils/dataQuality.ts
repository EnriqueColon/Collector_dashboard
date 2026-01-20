// Data quality handlers for duplicates and malformed data

import { ComplaintRow, ProcessedComplaint } from '../types';
import { normalizeCounty, normalizeLender } from './normalization';

export interface DataQualityIssue {
  rowIndex: number;
  row: ComplaintRow;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: number; // Index of the original row this duplicates
}

/**
 * Normalizes a string for comparison (removes extra spaces, converts to lowercase)
 */
function normalizeForComparison(str: string | undefined | null): string {
  if (!str) return '';
  
  // Ensure it's a string
  const strValue = typeof str === 'string' ? str : String(str || '');
  
  return strValue
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, ''); // Remove punctuation for fuzzy matching
}

/**
 * Creates multiple keys for a row to detect duplicates with different strategies
 * Uses proper normalization functions to ensure consistent matching
 */
function createRowKeys(row: ProcessedComplaint): string[] {
  const address = normalizeForComparison(row.propertyAddress);
  
  // Use proper county normalization (handles "County" suffix, etc.)
  // Prefer normalizedCounty if already set, otherwise normalize the raw county
  const county = normalizeForComparison(
    row.normalizedCounty || normalizeCounty(row.county)
  );
  
  // Use proper lender normalization (handles abbreviations, etc.)
  // Prefer normalizedLender if already set, otherwise normalize the raw lender/plaintiff
  const lender = normalizeForComparison(
    row.normalizedLender || normalizeLender(row.lender || row.plaintiff)
  );
  
  const dateStr = row.complaintDate 
    ? (row.complaintDate instanceof Date 
        ? row.complaintDate.toISOString().split('T')[0] 
        : new Date(row.complaintDate).toISOString().split('T')[0])
    : '';
  const upbStr = row.upb?.toString() || '';

  // Strategy 1: Exact match on all key fields
  const exactKey = [address, county, lender, dateStr, upbStr].join('|');
  
  // Strategy 2: Match without UPB (same property, same date, same lender)
  const withoutUPB = [address, county, lender, dateStr].join('|');
  
  // Strategy 3: Match on address and date only (potential duplicates with different lenders)
  const addressDate = [address, dateStr].join('|');
  
  // Strategy 4: Fuzzy match on address and lender (handles slight variations)
  const fuzzyAddress = address.substring(0, 20); // First 20 chars of normalized address
  const fuzzyKey = [fuzzyAddress, county, lender, dateStr].join('|');

  return [exactKey, withoutUPB, addressDate, fuzzyKey];
}

/**
 * Detects duplicate rows using multiple strategies
 */
export function detectDuplicates(
  rows: ProcessedComplaint[]
): Map<number, { isDuplicate: boolean; duplicateOf?: number }> {
  const duplicateMap = new Map<number, { isDuplicate: boolean; duplicateOf?: number }>();
  const seenKeys = new Map<string, number>(); // Map of key to first occurrence index
  
  rows.forEach((row, index) => {
    // Skip invalid rows from duplicate detection (but still mark them)
    if (!row.isValid) {
      duplicateMap.set(index, { isDuplicate: false });
      return;
    }

    const keys = createRowKeys(row);
    let isDuplicate = false;
    let duplicateOf: number | undefined;

    // Check each key strategy
    for (const key of keys) {
      if (key && seenKeys.has(key)) {
        const originalIndex = seenKeys.get(key)!;
        // Only mark as duplicate if it's not the same row
        if (originalIndex !== index) {
          isDuplicate = true;
          duplicateOf = originalIndex;
          break;
        }
      }
    }

    // If not a duplicate, register all keys
    if (!isDuplicate) {
      keys.forEach(key => {
        if (key && !seenKeys.has(key)) {
          seenKeys.set(key, index);
        }
      });
    }

    duplicateMap.set(index, { isDuplicate, duplicateOf });
  });
  
  return duplicateMap;
}

/**
 * Checks if a string looks like it might be JSON
 */
function looksLikeJSON(str: string): boolean {
  const trimmed = str.trim();
  return (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    trimmed.startsWith('"') ||
    /^\s*[\{\[]/.test(trimmed) // Starts with { or [
  );
}

/**
 * Attempts to fix common JSON errors
 */
function attemptJSONFix(jsonString: string): string | null {
  let fixed = jsonString.trim();
  
  // Try to fix common issues
  // 1. Missing closing braces/brackets
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;
  
  if (openBraces > closeBraces) {
    fixed += '}'.repeat(openBraces - closeBraces);
  }
  if (openBrackets > closeBrackets) {
    fixed += ']'.repeat(openBrackets - closeBrackets);
  }
  
  // 2. Try wrapping in braces if it looks like object content
  if (!fixed.startsWith('{') && !fixed.startsWith('[') && fixed.includes(':')) {
    fixed = '{' + fixed + '}';
  }
  
  return fixed;
}

/**
 * Validates and parses JSON fields with thorough error checking
 */
export function validateJSONField(
  field: unknown,
  fieldName: string
): { isValid: boolean; parsed: unknown; error?: string; wasFixed?: boolean } {
  if (field === null || field === undefined || field === '') {
    return { isValid: true, parsed: null };
  }
  
  // If it's already an object/array, it's valid
  if (typeof field === 'object' && !Array.isArray(field)) {
    return { isValid: true, parsed: field };
  }
  if (Array.isArray(field)) {
    return { isValid: true, parsed: field };
  }
  
  if (typeof field === 'string') {
    const trimmed = field.trim();
    
    // Skip if it's clearly not JSON
    if (!looksLikeJSON(trimmed) && trimmed.length < 2) {
      return { isValid: true, parsed: field }; // Not JSON, just a regular string
    }
    
    // Try to parse as-is first
    try {
      const parsed = JSON.parse(trimmed);
      return { isValid: true, parsed };
    } catch (error) {
      // Try to fix common JSON errors
      const fixed = attemptJSONFix(trimmed);
      if (fixed) {
        try {
          const parsed = JSON.parse(fixed);
          return {
            isValid: true,
            parsed,
            wasFixed: true,
            error: `JSON in ${fieldName} was malformed but auto-fixed`,
          };
        } catch (fixError) {
          // Fix didn't work, return error
        }
      }
      
      // Provide detailed error information
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      let detailedError = `Invalid JSON in ${fieldName}: ${errorMsg}`;
      
      // Add context about the error
      if (errorMsg.includes('position')) {
        const match = errorMsg.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1]);
          const start = Math.max(0, pos - 20);
          const end = Math.min(trimmed.length, pos + 20);
          detailedError += ` (near: "${trimmed.substring(start, end)}")`;
        }
      }
      
      return {
        isValid: false,
        parsed: null,
        error: detailedError,
      };
    }
  }
  
  // Not a string, might be already parsed
  return { isValid: true, parsed: field };
}

/**
 * Scans all fields in a row for potential JSON content
 */
function scanForJSONFields(row: ComplaintRow): Array<{ fieldName: string; value: unknown }> {
  const jsonFields: Array<{ fieldName: string; value: unknown }> = [];
  
  Object.keys(row).forEach(key => {
    const value = row[key];
    
    // Check if field name suggests JSON
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes('json') ||
      keyLower.includes('metadata') ||
      keyLower.includes('data') ||
      keyLower.includes('details') ||
      keyLower.includes('info') ||
      keyLower.includes('extra') ||
      keyLower.includes('additional')
    ) {
      jsonFields.push({ fieldName: key, value });
    } else if (typeof value === 'string' && looksLikeJSON(value)) {
      // Field doesn't have JSON in name but looks like JSON
      jsonFields.push({ fieldName: key, value });
    }
  });
  
  return jsonFields;
}

/**
 * Validates a single row and returns processed complaint with errors
 */
export function validateRow(
  row: ComplaintRow,
  _index: number
): ProcessedComplaint {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields (more thorough)
  const propertyAddress = typeof row.propertyAddress === 'string' 
    ? row.propertyAddress.trim() 
    : row.propertyAddress;
  if (!propertyAddress || propertyAddress === '') {
    errors.push('Missing or empty property address');
  } else if (propertyAddress.length < 5) {
    warnings.push('Property address seems too short');
  }
  
  const county = typeof row.county === 'string' 
    ? row.county.trim() 
    : row.county;
  if (!county || county === '') {
    errors.push('Missing or empty county');
  }
  
  const lender = typeof row.lender === 'string' 
    ? row.lender.trim() 
    : row.lender;
  const plaintiff = typeof row.plaintiff === 'string' 
    ? row.plaintiff.trim() 
    : row.plaintiff;
  if ((!lender || lender === '') && (!plaintiff || plaintiff === '')) {
    errors.push('Missing or empty lender/plaintiff');
  }
  const lenderValue: unknown = lender ?? plaintiff;
  if (lenderValue instanceof Date) {
    errors.push('Invalid lender/plaintiff value: date');
  } else if (
    lenderValue !== undefined &&
    lenderValue !== null &&
    typeof lenderValue !== 'string'
  ) {
    errors.push(`Invalid lender/plaintiff value type: ${typeof lenderValue}`);
  }
  
  // Validate UPB (more thorough)
  let upb: number | undefined;
  if (row.upb !== undefined && row.upb !== null) {
    if (typeof row.upb === 'string') {
      const cleaned = (row.upb as string).trim().replace(/[^0-9.-]/g, '');
      if (cleaned === '') {
        errors.push('UPB is empty or contains no numbers');
      } else {
        const parsed = parseFloat(cleaned);
        if (isNaN(parsed)) {
          errors.push(`Invalid UPB format: "${row.upb}"`);
        } else if (parsed < 0) {
          warnings.push('UPB is negative');
          upb = parsed;
        } else if (parsed === 0) {
          warnings.push('UPB is zero');
          upb = parsed;
        } else if (parsed > 1000000000) {
          warnings.push('UPB seems unusually high');
          upb = parsed;
        } else {
          upb = parsed;
        }
      }
    } else if (typeof row.upb === 'number') {
      if (row.upb < 0) {
        warnings.push('UPB is negative');
      } else if (row.upb === 0) {
        warnings.push('UPB is zero');
      } else if (row.upb > 1000000000) {
        warnings.push('UPB seems unusually high');
      }
      upb = row.upb;
    } else {
      errors.push(`Invalid UPB type: ${typeof row.upb}`);
    }
  } else {
    warnings.push('UPB is missing');
  }
  
  // Validate date (more thorough)
  let complaintDate: Date | undefined;
  if (row.complaintDate) {
    if (row.complaintDate instanceof Date) {
      if (isNaN(row.complaintDate.getTime())) {
        errors.push('Invalid Date object');
      } else {
        complaintDate = row.complaintDate;
        // Check if date is in the future (might be an error)
        if (complaintDate > new Date()) {
          warnings.push('Complaint date is in the future');
        }
        // Check if date is too old (more than 10 years)
        const tenYearsAgo = new Date();
        tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
        if (complaintDate < tenYearsAgo) {
          warnings.push('Complaint date is more than 10 years old');
        }
      }
    } else if (typeof row.complaintDate === 'string') {
      const trimmed = row.complaintDate.trim();
      if (trimmed === '') {
        errors.push('Complaint date is empty string');
      } else {
        const parsed = new Date(trimmed);
        if (isNaN(parsed.getTime())) {
          errors.push(`Invalid date format: "${trimmed}"`);
        } else {
          complaintDate = parsed;
          // Same checks as above
          if (complaintDate > new Date()) {
            warnings.push('Complaint date is in the future');
          }
          const tenYearsAgo = new Date();
          tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
          if (complaintDate < tenYearsAgo) {
            warnings.push('Complaint date is more than 10 years old');
          }
        }
      }
    } else {
      errors.push(`Invalid date type: ${typeof row.complaintDate}`);
    }
  } else {
    warnings.push('Complaint date is missing');
  }
  
  // Comprehensive JSON field validation
  const jsonFields = scanForJSONFields(row);
  jsonFields.forEach(({ fieldName, value }) => {
    const result = validateJSONField(value, fieldName);
    if (!result.isValid && result.error) {
      errors.push(result.error);
    } else if (result.wasFixed && result.error) {
      warnings.push(result.error); // Auto-fixed JSON is a warning, not an error
    }
  });
  
  // Combine errors and warnings (warnings don't make row invalid, but are logged)
  const allIssues = errors.length > 0 ? errors : warnings;
  
  return {
    ...row,
    upb,
    complaintDate,
    isValid: errors.length === 0, // Only errors make it invalid, not warnings
    errors: allIssues.length > 0 ? allIssues : undefined,
    normalizedCounty: '', // Will be set later during normalization
    normalizedLender: '', // Will be set later during normalization
  };
}

/**
 * Processes all rows with comprehensive quality checks
 */
export function processRowsWithQualityChecks(
  rows: ComplaintRow[]
): {
  processed: ProcessedComplaint[];
  issues: DataQualityIssue[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    rowsWithJSONErrors: number;
    rowsWithOtherErrors: number;
  };
} {
  const processed: ProcessedComplaint[] = [];
  const issues: DataQualityIssue[] = [];
  let rowsWithJSONErrors = 0;
  let rowsWithOtherErrors = 0;
  
  // First pass: validate all rows thoroughly
  rows.forEach((row, index) => {
    try {
      const validated = validateRow(row, index);
      processed.push(validated);
      
      // Track JSON errors separately
      const hasJSONError = validated.errors?.some(err => 
        err.toLowerCase().includes('json')
      ) || false;
      
      if (hasJSONError) {
        rowsWithJSONErrors++;
      }
      
      if (!validated.isValid || (validated.errors && validated.errors.length > 0)) {
        if (!hasJSONError) {
          rowsWithOtherErrors++;
        }
        
        issues.push({
          rowIndex: index,
          row,
          errors: validated.errors || [],
          isDuplicate: false,
        });
      }
    } catch (error) {
      // Catch any unexpected errors during validation
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      processed.push({
        ...row,
        isValid: false,
        errors: [`Validation failed: ${errorMsg}`],
        normalizedCounty: '',
        normalizedLender: '',
      });
      issues.push({
        rowIndex: index,
        row,
        errors: [`Validation exception: ${errorMsg}`],
        isDuplicate: false,
      });
      rowsWithOtherErrors++;
    }
  });
  
  // Normalize counties and lenders BEFORE duplicate detection
  // This ensures "Broward" and "Broward County" are treated as the same
  processed.forEach(row => {
    row.normalizedCounty = normalizeCounty(row.county);
    row.normalizedLender = normalizeLender(row.lender || row.plaintiff);
  });
  
  // Second pass: detect duplicates with multiple strategies
  const duplicateMap = detectDuplicates(processed);
  let duplicateCount = 0;
  
  duplicateMap.forEach((duplicateInfo, index) => {
    if (duplicateInfo.isDuplicate) {
      duplicateCount++;
      processed[index].isDuplicate = true;
      
      // Add to issues or update existing issue
      const existingIssue = issues.find(issue => issue.rowIndex === index);
      if (existingIssue) {
        existingIssue.isDuplicate = true;
        existingIssue.duplicateOf = duplicateInfo.duplicateOf;
        if (!existingIssue.errors.includes('Duplicate row')) {
          existingIssue.errors.unshift(
            `Duplicate row (matches row ${(duplicateInfo.duplicateOf ?? 0) + 1})`
          );
        }
      } else {
        issues.push({
          rowIndex: index,
          row: rows[index],
          errors: [`Duplicate row (matches row ${(duplicateInfo.duplicateOf ?? 0) + 1})`],
          isDuplicate: true,
          duplicateOf: duplicateInfo.duplicateOf,
        });
      }
    }
  });
  
  const validRows = processed.filter(p => p.isValid && !p.isDuplicate).length;
  const invalidRows = processed.length - validRows;
  
  return {
    processed,
    issues,
    summary: {
      totalRows: rows.length,
      validRows,
      invalidRows,
      duplicateRows: duplicateCount,
      rowsWithJSONErrors,
      rowsWithOtherErrors,
    },
  };
}

