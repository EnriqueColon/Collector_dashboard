// Type definitions for the Collector Dashboard

export interface ComplaintRow {
  // Core fields (adjust based on actual spreadsheet structure)
  id?: string;
  propertyAddress?: string;
  county?: string;
  lender?: string;
  plaintiff?: string;
  upb?: number; // Unpaid Principal Balance
  meetsCriteria?: string; // "Meets criteria" or "Does not meet criteria"
  complaintDate?: string | Date;
  [key: string]: unknown; // Allow for additional fields
}

export interface ProcessedComplaint extends ComplaintRow {
  normalizedCounty: string;
  normalizedLender: string;
  isValid: boolean;
  errors?: string[];
  isDuplicate?: boolean;
}

export interface FourWeekRollUp {
  county: string;
  totalComplaints: number;
  totalUPB: number;
  totalMeetsCriteria: number;
  totalUPBMeetsCriteria: number;
}

export interface YTDStats {
  totalComplaints: number;
  totalMeetsCriteria: number;
  totalUPBMeetsCriteria: number;
}

export interface CurrentMonthStats {
  totalComplaints: number;
  totalMeetsCriteria: number;
  totalUPBMeetsCriteria: number;
}

export interface LenderAnalysis {
  lender: string;
  ytdComplaints: number;
  ytdUPB: number;
  currentMonthComplaints: number;
  currentMonthUPB: number;
}

export interface RecentComplaint {
  propertyAddress: string;
  county: string;
  lender: string;
  upb: number;
  complaintDate: Date;
}

// New types for redesigned UI
export interface WeekData {
  week: number;
  totalComplaints: number;
  totalUPB: number;
}

export interface FourWeekRollUpWeekly extends FourWeekRollUp {
  week1: WeekData;
  week2: WeekData;
  week3: WeekData;
  week4: WeekData;
}

export interface Last7DaysComplaint {
  propertyAddress: string;
  lender: string;
  totalUPB: number;
  complaintDate: Date;
  county: string;
}

export interface MonthlyLenderData {
  month: string; // "YYYY-MM" format
  lender: string;
  numberOfComplaints: number;
  totalUPB: number;
}

export interface MonthlyTrendSummary {
  month: string; // "YYYY-MM" format
  totalComplaints: number;
  complaintsMeetingCriteria: number;
  totalUPB: number;
  upbMeetingCriteria: number;
}

export interface LenderCriteriaSummary {
  lender: string;
  totalComplaints: number;
  totalUPB: number;
}

export interface FlowThroughDeal {
  propertyAddress: string;
  county: string;
  lender: string;
  upb: number;
  complaintDate: Date;
  meetsCriteria: boolean;
}

export interface RegionSummary {
  region: string;
  totalComplaints: number;
  totalUPB: number;
  complaintsMeetingCriteria: number;
  upbMeetingCriteria: number;
}

export interface YearSummary {
  year: string;
  totalComplaints: number;
  totalUPB: number;
  complaintsMeetingCriteria: number;
  upbMeetingCriteria: number;
}
