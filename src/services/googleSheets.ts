// Google Sheets API integration service

import axios from 'axios';
import { ComplaintRow } from '../types';
import { mapColumnName } from '../config/columnMapping';
import { GOOGLE_SHEET_ID } from '../config/sheetConfig';

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// Use proxy in development, or direct URL if VITE_API_URL is set
const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

/**
 * Fetches data from Google Sheets
 * Tries backend API first (for private sheets), then falls back to CSV export (for public sheets)
 */
export async function fetchSheetData(
  sheetName: string = 'Sheet1'
): Promise<ComplaintRow[]> {
  // Try backend API first (for private sheets with service account)
  try {
    const response = await axios.get(`${API_BASE_URL}/api/sheet-data`, {
      params: { sheet: sheetName },
      timeout: 10000, // 10 second timeout
    });
    
    if (response.data && response.data.data) {
      // Map the data to our standard format
      return response.data.data.map((row: Record<string, unknown>) => {
        const mapped: ComplaintRow = {};
        Object.keys(row).forEach(key => {
          const mappedKey = mapColumnName(key);
          mapped[mappedKey] = parseValue(String(row[key] || ''), mappedKey);
        });
        return mapped;
      });
    }
  } catch (apiError: any) {
    // Log the error for debugging
    console.error('Backend API error:', apiError.message);
    if (apiError.code === 'ECONNREFUSED' || apiError.code === 'ERR_NETWORK') {
      console.warn('Cannot connect to backend server. Make sure it\'s running on port 3001.');
    }
    if (apiError.response) {
      console.error('Response status:', apiError.response.status);
      console.error('Response data:', apiError.response.data);
    }
    // If backend is not available, try CSV export (for public sheets)
    console.warn('Backend API not available, trying CSV export');
  }

  // Fallback to CSV export (works for public sheets)
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    
    const response = await axios.get(csvUrl, {
      responseType: 'text',
    });
    
    return parseCSVToRows(response.data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    throw new Error(
      `Failed to fetch data from Google Sheets: ${errorMessage}\n` +
      `Make sure:\n` +
      `1. The backend server is running (npm run server) for private sheets, OR\n` +
      `2. The sheet is public (view-only) and the sheet name "${sheetName}" is correct.`
    );
  }
}

/**
 * Alternative method using Google Sheets API v4 (requires API key or OAuth)
 */
export async function fetchSheetDataAPI(
  sheetName: string = 'Sheet1',
  apiKey?: string
): Promise<ComplaintRow[]> {
  if (!apiKey) {
    // Fallback to CSV method
    return fetchSheetData(sheetName);
  }
  
  try {
    const url = `${GOOGLE_SHEETS_API_BASE}/${GOOGLE_SHEET_ID}/values/${sheetName}?key=${apiKey}`;
    const response = await axios.get(url);
    
    if (!response.data.values || response.data.values.length === 0) {
      return [];
    }
    
    const [headers, ...rows] = response.data.values;
    return rows.map((row: string[]) => {
      const rowObj: ComplaintRow = {};
      headers.forEach((header: string, index: number) => {
        const value = row[index] || '';
      const mappedKey = mapColumnName(header);
      rowObj[mappedKey] = parseValue(value, mappedKey);
      });
      return rowObj;
    });
  } catch (error) {
    console.error('Error fetching sheet data via API:', error);
    // Fallback to CSV method
    return fetchSheetData(sheetName);
  }
}

/**
 * Parses CSV data into row objects
 */
function parseCSVToRows(csvData: string): ComplaintRow[] {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows: ComplaintRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: ComplaintRow = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      const mappedKey = mapColumnName(header);
      row[mappedKey] = parseValue(value, mappedKey);
    });
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Parses a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Parses a value to appropriate type
 */
function parseValue(value: string, fieldName?: string): unknown {
  if (!value || value.trim() === '') return undefined;
  
  // Try to parse as number
  const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  if (!isNaN(numValue) && value.trim() === numValue.toString()) {
    return numValue;
  }
  
  // Only parse as date for known date fields
  const dateFields = new Set(['complaintDate', 'defaultDate']);
  if (fieldName && dateFields.has(fieldName)) {
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime())) {
      return dateValue;
    }
  }
  
  // Return as string
  return value.trim();
}

/**
 * Maps column names to standard field names
 * Uses the column mapping configuration
 */
export function mapColumnsToFields(row: Record<string, unknown>): ComplaintRow {
  const mapped: ComplaintRow = {};
  
  Object.keys(row).forEach(key => {
    const mappedKey = mapColumnName(key);
    mapped[mappedKey] = row[key];
  });
  
  return mapped;
}

