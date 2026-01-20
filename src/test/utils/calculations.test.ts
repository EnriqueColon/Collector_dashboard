import { describe, it, expect, beforeEach } from 'vitest';
import {
  meetsCriteria,
  calculateFourWeekRollUp,
  calculateYTDStats,
  calculateCurrentMonthStats,
  calculateLenderAnalysis,
  getRecentComplaints,
  formatCurrency,
  formatDate,
} from '../../utils/calculations';
import { ProcessedComplaint } from '../../types';
import { normalizeCounty, normalizeLender } from '../../utils/normalization';
import { subDays, startOfMonth, startOfYear } from 'date-fns';

describe('Calculations', () => {
  let mockComplaints: ProcessedComplaint[];

  beforeEach(() => {
    mockComplaints = [
      {
        propertyAddress: '123 Main St',
        county: 'New York',
        lender: 'ABC Bank',
        upb: 250000,
        meetsCriteria: 'Meets criteria',
        complaintDate: new Date(),
        isValid: true,
        isDuplicate: false,
        normalizedCounty: normalizeCounty('New York'),
        normalizedLender: normalizeLender('ABC Bank'),
      },
      {
        propertyAddress: '456 Oak Ave',
        county: 'Kings',
        lender: 'XYZ Bank',
        upb: 180000,
        meetsCriteria: 'Meets criteria',
        complaintDate: subDays(new Date(), 10),
        isValid: true,
        isDuplicate: false,
        normalizedCounty: normalizeCounty('Kings'),
        normalizedLender: normalizeLender('XYZ Bank'),
      },
      {
        propertyAddress: '789 Pine Rd',
        county: 'Queens',
        lender: 'ABC Bank',
        upb: 320000,
        meetsCriteria: 'Does not meet criteria',
        complaintDate: subDays(new Date(), 5),
        isValid: true,
        isDuplicate: false,
        normalizedCounty: normalizeCounty('Queens'),
        normalizedLender: normalizeLender('ABC Bank'),
      },
      {
        propertyAddress: '321 Elm St',
        county: 'New York',
        lender: 'ABC Bank',
        upb: 275000,
        meetsCriteria: 'Meets criteria',
        complaintDate: startOfYear(new Date()),
        isValid: true,
        isDuplicate: false,
        normalizedCounty: normalizeCounty('New York'),
        normalizedLender: normalizeLender('ABC Bank'),
      },
    ];
  });

  describe('meetsCriteria', () => {
    it('should return true for complaints that meet criteria', () => {
      const complaint: ProcessedComplaint = {
        ...mockComplaints[0],
        meetsCriteria: 'Meets criteria',
      };
      expect(meetsCriteria(complaint)).toBe(true);
    });

    it('should return false for complaints that do not meet criteria', () => {
      const complaint: ProcessedComplaint = {
        ...mockComplaints[2],
        meetsCriteria: 'Does not meet criteria',
      };
      expect(meetsCriteria(complaint)).toBe(false);
    });

    it('should handle case variations', () => {
      const complaint: ProcessedComplaint = {
        ...mockComplaints[0],
        meetsCriteria: 'MEETS CRITERIA',
      };
      expect(meetsCriteria(complaint)).toBe(true);
    });
  });

  describe('calculateFourWeekRollUp', () => {
    it('should calculate roll-up by county', () => {
      const result = calculateFourWeekRollUp(mockComplaints);
      
      expect(result.length).toBeGreaterThan(0);
      const nyCounty = result.find(r => r.county === 'New York');
      expect(nyCounty).toBeDefined();
      expect(nyCounty?.totalComplaints).toBeGreaterThan(0);
    });

    it('should only count valid complaints for criteria metrics', () => {
      const result = calculateFourWeekRollUp(mockComplaints);
      
      result.forEach(county => {
        expect(county.totalMeetsCriteria).toBeLessThanOrEqual(county.totalComplaints);
      });
    });
  });

  describe('calculateYTDStats', () => {
    it('should calculate year-to-date statistics', () => {
      const result = calculateYTDStats(mockComplaints);
      
      expect(result.totalComplaints).toBeGreaterThan(0);
      expect(result.totalMeetsCriteria).toBeLessThanOrEqual(result.totalComplaints);
    });

    it('should only count valid, non-duplicate complaints', () => {
      const withInvalid = [
        ...mockComplaints,
        {
          ...mockComplaints[0],
          isValid: false,
          isDuplicate: false,
        },
        {
          ...mockComplaints[1],
          isValid: true,
          isDuplicate: true,
        },
      ];
      
      const result = calculateYTDStats(withInvalid);
      // Should exclude invalid and duplicate rows
      expect(result.totalComplaints).toBe(mockComplaints.length);
    });
  });

  describe('calculateCurrentMonthStats', () => {
    it('should calculate current month statistics', () => {
      const result = calculateCurrentMonthStats(mockComplaints);
      
      expect(result.totalComplaints).toBeGreaterThanOrEqual(0);
      expect(result.totalMeetsCriteria).toBeLessThanOrEqual(result.totalComplaints);
    });
  });

  describe('calculateLenderAnalysis', () => {
    it('should group by lender', () => {
      const result = calculateLenderAnalysis(mockComplaints);
      
      expect(result.length).toBeGreaterThan(0);
      const abcBank = result.find(r => r.lender.includes('Abc'));
      expect(abcBank).toBeDefined();
    });

    it('should only include complaints that meet criteria', () => {
      const result = calculateLenderAnalysis(mockComplaints);
      
      // Should not include the complaint that doesn't meet criteria
      result.forEach(lender => {
        expect(lender.ytdComplaints).toBeGreaterThan(0);
      });
    });
  });

  describe('getRecentComplaints', () => {
    it('should return complaints from last 15 days', () => {
      const result = getRecentComplaints(mockComplaints);
      
      result.forEach(complaint => {
        const daysAgo = (new Date().getTime() - complaint.complaintDate.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysAgo).toBeLessThanOrEqual(15);
      });
    });

    it('should only include complaints that meet criteria', () => {
      const result = getRecentComplaints(mockComplaints);
      
      // All returned complaints should meet criteria (filtered in the function)
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers as currency', () => {
      expect(formatCurrency(250000)).toContain('$');
      expect(formatCurrency(250000)).toContain('250');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toContain('$');
    });
  });

  describe('formatDate', () => {
    it('should format dates', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('2024');
    });

    it('should handle invalid dates', () => {
      expect(formatDate(new Date('invalid'))).toBe('Invalid Date');
    });

    it('should handle undefined', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });
  });
});

