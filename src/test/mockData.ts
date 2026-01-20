// Mock data for testing

import { ComplaintRow } from '../types';

export const mockValidRow: ComplaintRow = {
  propertyAddress: '123 Main St, New York, NY 10001',
  county: 'New York',
  lender: 'ABC Mortgage Company Inc.',
  upb: 250000,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2024-01-15',
};

export const mockDuplicateRow: ComplaintRow = {
  propertyAddress: '123 Main St, New York, NY 10001',
  county: 'New York',
  lender: 'ABC Mortgage Company Inc.',
  upb: 250000,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2024-01-15',
};

export const mockRowWithJSONError: ComplaintRow = {
  propertyAddress: '456 Oak Ave, Brooklyn, NY 11201',
  county: 'Kings',
  lender: 'XYZ Bank LLC',
  upb: 180000,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2024-02-20',
  metadata: '{"incomplete": "json', // Malformed JSON
};

export const mockRowWithValidJSON: ComplaintRow = {
  propertyAddress: '789 Pine Rd, Queens, NY 11101',
  county: 'Queens',
  lender: 'DEF Financial Services',
  upb: 320000,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2024-03-10',
  metadata: '{"source": "county_clerk", "parsed": true}',
};

export const mockRowMissingFields: ComplaintRow = {
  propertyAddress: '',
  county: 'Bronx',
  // Missing lender
  upb: 150000,
  meetsCriteria: 'Does not meet criteria',
  complaintDate: '2024-04-05',
};

export const mockRowInvalidUPB: ComplaintRow = {
  propertyAddress: '321 Elm St, Staten Island, NY 10301',
  county: 'Richmond',
  lender: 'GHI Lending Corp',
  upb: 'not a number' as unknown as number,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2024-05-12',
};

export const mockRowInvalidDate: ComplaintRow = {
  propertyAddress: '654 Maple Dr, Manhattan, NY 10002',
  county: 'New York',
  lender: 'JKL Mortgage Inc',
  upb: 275000,
  meetsCriteria: 'Meets criteria',
  complaintDate: 'invalid-date',
};

export const mockRowFutureDate: ComplaintRow = {
  propertyAddress: '987 Cedar Ln, Brooklyn, NY 11202',
  county: 'Kings',
  lender: 'MNO Bank',
  upb: 195000,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2025-12-31', // Future date
};

export const mockRowDoesNotMeetCriteria: ComplaintRow = {
  propertyAddress: '147 Birch St, Queens, NY 11102',
  county: 'Queens',
  lender: 'PQR Financial',
  upb: 220000,
  meetsCriteria: 'Does not meet criteria',
  complaintDate: '2024-06-01',
};

export const mockRows: ComplaintRow[] = [
  mockValidRow,
  mockDuplicateRow,
  mockRowWithJSONError,
  mockRowWithValidJSON,
  mockRowMissingFields,
  mockRowInvalidUPB,
  mockRowInvalidDate,
  mockRowFutureDate,
  mockRowDoesNotMeetCriteria,
];

// Sample data for different time periods
export const mockRecentRow: ComplaintRow = {
  propertyAddress: '111 Recent St, New York, NY 10001',
  county: 'New York',
  lender: 'Recent Bank',
  upb: 300000,
  meetsCriteria: 'Meets criteria',
  complaintDate: new Date().toISOString().split('T')[0], // Today
};

export const mockOldRow: ComplaintRow = {
  propertyAddress: '222 Old St, New York, NY 10001',
  county: 'New York',
  lender: 'Old Bank',
  upb: 200000,
  meetsCriteria: 'Meets criteria',
  complaintDate: '2020-01-01', // More than 4 years ago
};

