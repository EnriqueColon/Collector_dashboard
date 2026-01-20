import { describe, it, expect } from 'vitest';
import { normalizeCounty, normalizeLender, NormalizationRegistry } from '../../utils/normalization';

describe('Normalization', () => {
  describe('normalizeCounty', () => {
    it('should normalize county names consistently', () => {
      expect(normalizeCounty('new york')).toBe('New York');
      expect(normalizeCounty('NEW YORK')).toBe('New York');
      expect(normalizeCounty('New York')).toBe('New York');
    });

    it('should handle abbreviations', () => {
      expect(normalizeCounty('st. louis')).toBe('Saint Louis');
      expect(normalizeCounty('ft. worth')).toBe('Fort Worth');
    });

    it('should handle NYC variations', () => {
      expect(normalizeCounty('nyc')).toBe('New York');
      expect(normalizeCounty('NYC')).toBe('New York');
      expect(normalizeCounty('new york city')).toBe('New York');
    });

    it('should handle empty/null values', () => {
      expect(normalizeCounty('')).toBe('Unknown');
      expect(normalizeCounty(null as unknown as string)).toBe('Unknown');
      expect(normalizeCounty(undefined as unknown as string)).toBe('Unknown');
    });

    it('should handle extra whitespace', () => {
      expect(normalizeCounty('  new york  ')).toBe('New York');
      expect(normalizeCounty('new   york')).toBe('New York');
    });
  });

  describe('normalizeLender', () => {
    it('should normalize lender names consistently', () => {
      expect(normalizeLender('ABC Mortgage Company')).toBe('Abc Mortgage Company');
      expect(normalizeLender('abc mortgage company')).toBe('Abc Mortgage Company');
    });

    it('should handle abbreviations', () => {
      expect(normalizeLender('ABC Inc.')).toBe('Abc Incorporated');
      expect(normalizeLender('XYZ LLC')).toBe('Xyz Limited Liability Company');
      expect(normalizeLender('Bank & Trust Co.')).toBe('Bank And Trust Company');
    });

    it('should remove punctuation', () => {
      expect(normalizeLender('ABC, Inc.')).toBe('Abc Incorporated');
      expect(normalizeLender('Bank & Co.')).toBe('Bank And Company');
    });

    it('should handle empty/null values', () => {
      expect(normalizeLender('')).toBe('Unknown');
      expect(normalizeLender(null as unknown as string)).toBe('Unknown');
      expect(normalizeLender(undefined as unknown as string)).toBe('Unknown');
    });

    it('should normalize common words', () => {
      expect(normalizeLender('the bank of america')).toBe('The Bank Of America');
    });
  });

  describe('NormalizationRegistry', () => {
    it('should allow custom county rules', () => {
      const registry = new NormalizationRegistry();
      registry.addCountyRule((county) => county.replace('County', 'Cty'));
      
      expect(registry.normalizeCounty('New York County')).toBe('New York Cty');
    });

    it('should allow custom lender rules', () => {
      const registry = new NormalizationRegistry();
      registry.addLenderRule((lender) => lender.replace('Bank', 'Bnk'));
      
      expect(registry.normalizeLender('First Bank')).toBe('First Bnk');
    });
  });
});

