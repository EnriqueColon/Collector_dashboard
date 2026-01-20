// Custom hook for fetching and processing sheet data

import { useState, useEffect, useCallback } from 'react';
import { fetchSheetData } from '../services/googleSheets';
import { processRowsWithQualityChecks } from '../utils/dataQuality';
import { normalizeCounty, normalizeLender } from '../utils/normalization';
import { ComplaintRow, ProcessedComplaint } from '../types';

interface UseSheetDataResult {
  complaints: ProcessedComplaint[];
  loading: boolean;
  error: string | null;
  issues: Array<{
    rowIndex: number;
    row: ComplaintRow;
    errors: string[];
    isDuplicate: boolean;
    duplicateOf?: number;
  }>;
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    rowsWithJSONErrors: number;
    rowsWithOtherErrors: number;
  };
  refresh: () => Promise<void>;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useSheetData(
  sheetName: string = 'Sheet1',
  autoRefresh: boolean = true
): UseSheetDataResult {
  const [complaints, setComplaints] = useState<ProcessedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<UseSheetDataResult['issues']>([]);
  const [summary, setSummary] = useState<UseSheetDataResult['summary']>({
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    duplicateRows: 0,
    rowsWithJSONErrors: 0,
    rowsWithOtherErrors: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const rawRows = await fetchSheetData(sheetName);
      
      // Process with comprehensive quality checks
      const { processed, issues: qualityIssues, summary: qualitySummary } = 
        processRowsWithQualityChecks(rawRows);
      
      // Log summary for debugging
      console.log('Data Quality Summary:', qualitySummary);
      if (qualityIssues.length > 0) {
        console.warn(`Found ${qualityIssues.length} data quality issues`);
        console.warn('Issues:', qualityIssues.slice(0, 10)); // Log first 10 issues
      }
      
      // Apply normalization
      const normalized = processed.map(row => ({
        ...row,
        normalizedCounty: normalizeCounty(row.county),
        normalizedLender: normalizeLender(row.lender || row.plaintiff),
      }));
      
      setComplaints(normalized);
      setIssues(qualityIssues);
      setSummary(qualitySummary);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching sheet data:', err);
    } finally {
      setLoading(false);
    }
  }, [sheetName]);

  useEffect(() => {
    fetchData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchData, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [fetchData, autoRefresh]);

  return {
    complaints,
    loading,
    error,
    issues,
    summary,
    refresh: fetchData,
  };
}

