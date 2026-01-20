import { describe, it, expect } from 'vitest';
import {
  validateRow,
  detectDuplicates,
  validateJSONField,
  processRowsWithQualityChecks,
} from '../../utils/dataQuality';
import {
  mockValidRow,
  mockDuplicateRow,
  mockRowWithJSONError,
  mockRowWithValidJSON,
  mockRowMissingFields,
  mockRowInvalidUPB,
  mockRowInvalidDate,
  mockRows,
} from '../mockData';

describe('Data Quality Checks', () => {
  describe('validateRow', () => {
    it('should validate a valid row', () => {
      const result = validateRow(mockValidRow, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should detect missing required fields', () => {
      const result = validateRow(mockRowMissingFields, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing or empty property address');
      expect(result.errors).toContain('Missing or empty lender/plaintiff');
    });

    it('should detect invalid UPB', () => {
      const result = validateRow(mockRowInvalidUPB, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(err => err.includes('UPB'))).toBe(true);
    });

    it('should detect invalid date', () => {
      const result = validateRow(mockRowInvalidDate, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(err => err.includes('date'))).toBe(true);
    });

    it('should warn about future dates', () => {
      const result = validateRow(
        {
          ...mockValidRow,
          complaintDate: '2025-12-31',
        },
        0
      );
      // Future dates are warnings, not errors
      expect(result.isValid).toBe(true);
      expect(result.errors?.some(err => err.includes('future'))).toBe(true);
    });
  });

  describe('validateJSONField', () => {
    it('should validate valid JSON', () => {
      const result = validateJSONField('{"key": "value"}', 'testField');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toEqual({ key: 'value' });
    });

    it('should detect malformed JSON', () => {
      const result = validateJSONField('{"incomplete": "json', 'testField');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should attempt to fix common JSON errors', () => {
      const result = validateJSONField('{"key": "value"', 'testField');
      // Should attempt to fix missing closing brace
      expect(result.wasFixed || !result.isValid).toBe(true);
    });

    it('should handle null/undefined', () => {
      const result1 = validateJSONField(null, 'testField');
      expect(result1.isValid).toBe(true);
      expect(result1.parsed).toBeNull();

      const result2 = validateJSONField(undefined, 'testField');
      expect(result2.isValid).toBe(true);
    });

    it('should handle already parsed objects', () => {
      const obj = { key: 'value' };
      const result = validateJSONField(obj, 'testField');
      expect(result.isValid).toBe(true);
      expect(result.parsed).toBe(obj);
    });
  });

  describe('detectDuplicates', () => {
    it('should detect exact duplicates', () => {
      const rows = [
        { ...mockValidRow, isValid: true, isDuplicate: false },
        { ...mockDuplicateRow, isValid: true, isDuplicate: false },
      ];

      const duplicateMap = detectDuplicates(rows);
      expect(duplicateMap.get(0)?.isDuplicate).toBe(false);
      expect(duplicateMap.get(1)?.isDuplicate).toBe(true);
      expect(duplicateMap.get(1)?.duplicateOf).toBe(0);
    });

    it('should detect duplicates with slight variations', () => {
      const rows = [
        {
          ...mockValidRow,
          propertyAddress: '123 Main St',
          isValid: true,
          isDuplicate: false,
        },
        {
          ...mockValidRow,
          propertyAddress: '123 Main St.', // Slight variation
          isValid: true,
          isDuplicate: false,
        },
      ];

      const duplicateMap = detectDuplicates(rows);
      // Should detect as duplicate due to normalization
      expect(duplicateMap.get(1)?.isDuplicate).toBe(true);
    });

    it('should not mark different rows as duplicates', () => {
      const rows = [
        { ...mockValidRow, isValid: true, isDuplicate: false },
        {
          ...mockValidRow,
          propertyAddress: '999 Different St',
          isValid: true,
          isDuplicate: false,
        },
      ];

      const duplicateMap = detectDuplicates(rows);
      expect(duplicateMap.get(0)?.isDuplicate).toBe(false);
      expect(duplicateMap.get(1)?.isDuplicate).toBe(false);
    });
  });

  describe('processRowsWithQualityChecks', () => {
    it('should process all rows and identify issues', () => {
      const { processed, issues, summary } = processRowsWithQualityChecks(mockRows);

      expect(processed).toHaveLength(mockRows.length);
      expect(issues.length).toBeGreaterThan(0);
      expect(summary.totalRows).toBe(mockRows.length);
      expect(summary.duplicateRows).toBeGreaterThan(0);
      expect(summary.rowsWithJSONErrors).toBeGreaterThan(0);
    });

    it('should identify JSON errors', () => {
      const rows = [mockRowWithJSONError, mockRowWithValidJSON];
      const { issues, summary } = processRowsWithQualityChecks(rows);

      expect(summary.rowsWithJSONErrors).toBe(1);
      const jsonIssue = issues.find(
        issue => issue.errors.some(err => err.toLowerCase().includes('json'))
      );
      expect(jsonIssue).toBeDefined();
    });

    it('should identify duplicates', () => {
      const rows = [mockValidRow, mockDuplicateRow];
      const { issues, summary } = processRowsWithQualityChecks(rows);

      expect(summary.duplicateRows).toBe(1);
      const duplicateIssue = issues.find(issue => issue.isDuplicate);
      expect(duplicateIssue).toBeDefined();
    });

    it('should continue processing valid rows despite errors', () => {
      const { processed, summary } = processRowsWithQualityChecks(mockRows);

      // Should have valid rows even with errors
      expect(summary.validRows).toBeGreaterThan(0);
      expect(processed.some(p => p.isValid && !p.isDuplicate)).toBe(true);
    });
  });
});

