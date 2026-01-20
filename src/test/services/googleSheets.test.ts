import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { fetchSheetData } from '../../services/googleSheets';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
};

describe('Google Sheets Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchSheetData', () => {
    it('should fetch and parse CSV data', async () => {
      const mockCSV = `Property Address,County,Lender,UPB,Meets Criteria,Complaint Date
123 Main St,New York,ABC Bank,250000,Meets criteria,2024-01-15
456 Oak Ave,Kings,XYZ Bank,180000,Meets criteria,2024-02-20`;

      mockedAxios.get.mockResolvedValueOnce({
        data: mockCSV,
      });

      const result = await fetchSheetData('Sheet1');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('Property Address');
      expect(result[0]['Property Address']).toBe('123 Main St');
    });

    it('should handle errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchSheetData('Sheet1')).rejects.toThrow('Failed to fetch data');
    });

    it('should handle empty sheets', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: 'Property Address,County\n',
      });

      const result = await fetchSheetData('Sheet1');
      expect(result).toHaveLength(0);
    });
  });

  describe('CSV parsing', () => {
    it('should parse simple CSV', async () => {
      const csv = `Name,Value
Test,123`;
      
      mockedAxios.get.mockResolvedValueOnce({ data: csv });
      const result = await fetchSheetData('Sheet1');
      
      expect(result).toHaveLength(1);
      expect(result[0].Name).toBe('Test');
      expect(result[0].Value).toBe(123);
    });

    it('should handle quoted fields', async () => {
      const csv = `Name,Address
"John Doe","123 Main St, New York"`;
      
      mockedAxios.get.mockResolvedValueOnce({ data: csv });
      const result = await fetchSheetData('Sheet1');
      
      expect(result[0].Name).toBe('John Doe');
      expect(result[0].Address).toBe('123 Main St, New York');
    });

    it('should handle empty values', async () => {
      const csv = `Name,Value
Test,`;
      
      mockedAxios.get.mockResolvedValueOnce({ data: csv });
      const result = await fetchSheetData('Sheet1');
      
      expect(result[0].Value).toBeUndefined();
    });
  });
});

