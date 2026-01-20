// Calculation utilities for dashboard metrics

import {
  ProcessedComplaint,
  FourWeekRollUp,
  YTDStats,
  CurrentMonthStats,
  LenderAnalysis,
  RecentComplaint,
  FourWeekRollUpWeekly,
  Last7DaysComplaint,
  MonthlyLenderData,
  FlowThroughDeal,
  RegionSummary,
  YearSummary,
  MonthlyTrendSummary,
  LenderCriteriaSummary,
} from '../types';
import { normalizeCounty, normalizeLender } from './normalization';
import { getRegionFromCounty, getOrderedRegions } from './regionMapping';
import { subDays, startOfMonth, startOfYear, format } from 'date-fns';

/**
 * Checks if a complaint meets criteria
 */
export function meetsCriteria(complaint: ProcessedComplaint): boolean {
  if (!complaint.meetsCriteria) return false;
  
  // Ensure it's a string
  const criteria = typeof complaint.meetsCriteria === 'string' 
    ? complaint.meetsCriteria 
    : String(complaint.meetsCriteria || '');
  
  return criteria.toLowerCase().includes('meets criteria');
}

/**
 * Filters out invalid and duplicate complaints
 */
function filterValidComplaints(complaints: ProcessedComplaint[]): ProcessedComplaint[] {
  return complaints.filter(c => c.isValid && !c.isDuplicate);
}

/**
 * Calculates four-week roll-up by county
 * Note: Total complaints includes all rows (even invalid/duplicates) for transparency
 *       But "meets criteria" metrics only count valid, non-duplicate rows
 */
export function calculateFourWeekRollUp(
  complaints: ProcessedComplaint[]
): FourWeekRollUp[] {
  const fourWeeksAgo = subDays(new Date(), 28);
  
  // Get all recent complaints (including invalid/duplicates for total count)
  const allRecentComplaints = complaints.filter(c => {
    if (!c.complaintDate) return false;
    const date = c.complaintDate instanceof Date 
      ? c.complaintDate 
      : new Date(c.complaintDate);
    return date >= fourWeeksAgo;
  });
  
  // Get valid, non-duplicate complaints for criteria-based metrics
  const validComplaints = filterValidComplaints(allRecentComplaints);
  
  const countyMap = new Map<string, FourWeekRollUp>();
  
  // Count all complaints (for total)
  allRecentComplaints.forEach(complaint => {
    // Use normalizedCounty (should always be set after processing)
    const county = complaint.normalizedCounty || normalizeCounty(complaint.county);
    
    if (!countyMap.has(county)) {
      countyMap.set(county, {
        county,
        totalComplaints: 0,
        totalUPB: 0,
        totalMeetsCriteria: 0,
        totalUPBMeetsCriteria: 0,
      });
    }
    
    const stats = countyMap.get(county)!;
    stats.totalComplaints++;
    
    // Only count UPB if valid
    if (complaint.isValid && complaint.upb) {
      stats.totalUPB += complaint.upb;
    }
  });
  
  // Count only valid complaints that meet criteria
  validComplaints.forEach(complaint => {
    if (meetsCriteria(complaint)) {
      // Use normalizedCounty (should always be set after processing)
      const county = complaint.normalizedCounty || normalizeCounty(complaint.county);
      const stats = countyMap.get(county);
      
      if (stats) {
        stats.totalMeetsCriteria++;
        if (complaint.upb) {
          stats.totalUPBMeetsCriteria += complaint.upb;
        }
      }
    }
  });
  
  return Array.from(countyMap.values()).sort((a, b) => 
    a.county.localeCompare(b.county)
  );
}

/**
 * Calculates year-to-date statistics
 */
export function calculateYTDStats(complaints: ProcessedComplaint[]): YTDStats {
  // Only process valid, non-duplicate complaints
  const validComplaints = filterValidComplaints(complaints);
  
  const yearStart = startOfYear(new Date());
  
  const ytdComplaints = validComplaints.filter(c => {
    if (!c.complaintDate) return false;
    const date = c.complaintDate instanceof Date 
      ? c.complaintDate 
      : new Date(c.complaintDate);
    return date >= yearStart;
  });
  
  const stats: YTDStats = {
    totalComplaints: ytdComplaints.length,
    totalMeetsCriteria: 0,
    totalUPBMeetsCriteria: 0,
  };
  
  ytdComplaints.forEach(complaint => {
    if (meetsCriteria(complaint)) {
      stats.totalMeetsCriteria++;
      if (complaint.upb) {
        stats.totalUPBMeetsCriteria += complaint.upb;
      }
    }
  });
  
  return stats;
}

/**
 * Calculates current month statistics
 */
export function calculateCurrentMonthStats(
  complaints: ProcessedComplaint[]
): CurrentMonthStats {
  // Only process valid, non-duplicate complaints
  const validComplaints = filterValidComplaints(complaints);
  
  const monthStart = startOfMonth(new Date());
  
  const monthComplaints = validComplaints.filter(c => {
    if (!c.complaintDate) return false;
    const date = c.complaintDate instanceof Date 
      ? c.complaintDate 
      : new Date(c.complaintDate);
    return date >= monthStart;
  });
  
  const stats: CurrentMonthStats = {
    totalComplaints: monthComplaints.length,
    totalMeetsCriteria: 0,
    totalUPBMeetsCriteria: 0,
  };
  
  monthComplaints.forEach(complaint => {
    if (meetsCriteria(complaint)) {
      stats.totalMeetsCriteria++;
      if (complaint.upb) {
        stats.totalUPBMeetsCriteria += complaint.upb;
      }
    }
  });
  
  return stats;
}

/**
 * Calculates lender analysis (criteria only)
 */
export function calculateLenderAnalysis(
  complaints: ProcessedComplaint[]
): LenderAnalysis[] {
  // Only process valid, non-duplicate complaints that meet criteria
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));
  
  const yearStart = startOfYear(new Date());
  const monthStart = startOfMonth(new Date());
  
  const lenderMap = new Map<string, LenderAnalysis>();
  
  qualifyingComplaints.forEach(complaint => {
    const lender = normalizeLender(
      complaint.normalizedLender || complaint.lender || complaint.plaintiff
    );
    
    if (!lenderMap.has(lender)) {
      lenderMap.set(lender, {
        lender,
        ytdComplaints: 0,
        ytdUPB: 0,
        currentMonthComplaints: 0,
        currentMonthUPB: 0,
      });
    }
    
    const stats = lenderMap.get(lender)!;
    const date = complaint.complaintDate instanceof Date 
      ? complaint.complaintDate 
      : complaint.complaintDate 
        ? new Date(complaint.complaintDate)
        : null;
    
    if (date && date >= yearStart) {
      stats.ytdComplaints++;
      if (complaint.upb) {
        stats.ytdUPB += complaint.upb;
      }
    }
    
    if (date && date >= monthStart) {
      stats.currentMonthComplaints++;
      if (complaint.upb) {
        stats.currentMonthUPB += complaint.upb;
      }
    }
  });
  
  return Array.from(lenderMap.values())
    .sort((a, b) => b.ytdUPB - a.ytdUPB);
}

/**
 * Gets most recent complaints (last 15 days, criteria only)
 */
export function getRecentComplaints(
  complaints: ProcessedComplaint[]
): RecentComplaint[] {
  // Only process valid, non-duplicate complaints that meet criteria
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));
  
  const fifteenDaysAgo = subDays(new Date(), 15);
  
  const recent = qualifyingComplaints
    .filter(c => {
      if (!c.complaintDate) return false;
      
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate);
      return date >= fifteenDaysAgo;
    })
    .map(c => {
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate!);
      
      return {
        propertyAddress: c.propertyAddress || 'Unknown',
        county: c.normalizedCounty || normalizeCounty(c.county),
        lender: c.normalizedLender || normalizeLender(c.lender || c.plaintiff),
        upb: c.upb || 0,
        complaintDate: date,
      };
    })
    .sort((a, b) => b.complaintDate.getTime() - a.complaintDate.getTime());
  
  return recent;
}

/**
 * Formats currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats date value
 */
export function formatDate(date: Date | string | undefined): string {
  if (!date) return 'N/A';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Calculates four-week roll-up with weekly breakdown (only complaints meeting criteria)
 */
export function calculateFourWeekRollUpWeekly(
  complaints: ProcessedComplaint[]
): FourWeekRollUpWeekly[] {
  const now = new Date();
  const fourWeeksAgo = subDays(now, 28);
  
  // Only get valid, non-duplicate complaints that meet criteria
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => {
    if (!c.complaintDate || !meetsCriteria(c)) return false;
    const date = c.complaintDate instanceof Date 
      ? c.complaintDate 
      : new Date(c.complaintDate);
    return date >= fourWeeksAgo;
  });
  
  // Calculate week boundaries
  const week4Start = subDays(now, 28);
  const week3Start = subDays(now, 21);
  const week2Start = subDays(now, 14);
  const week1Start = subDays(now, 7);
  
  const countyMap = new Map<string, FourWeekRollUpWeekly>();
  
  qualifyingComplaints.forEach(complaint => {
    const county = complaint.normalizedCounty || normalizeCounty(complaint.county);
    const date = complaint.complaintDate instanceof Date 
      ? complaint.complaintDate 
      : new Date(complaint.complaintDate!);
    const upb = complaint.upb || 0;
    
    if (!countyMap.has(county)) {
      countyMap.set(county, {
        county,
        week1: { week: 1, totalComplaints: 0, totalUPB: 0 },
        week2: { week: 2, totalComplaints: 0, totalUPB: 0 },
        week3: { week: 3, totalComplaints: 0, totalUPB: 0 },
        week4: { week: 4, totalComplaints: 0, totalUPB: 0 },
        totalComplaints: 0,
        totalUPB: 0,
        totalMeetsCriteria: 0,
        totalUPBMeetsCriteria: 0,
      });
    }
    
    const stats = countyMap.get(county)!;
    
    // Determine which week
    if (date >= week1Start) {
      stats.week1.totalComplaints++;
      stats.week1.totalUPB += upb;
    } else if (date >= week2Start) {
      stats.week2.totalComplaints++;
      stats.week2.totalUPB += upb;
    } else if (date >= week3Start) {
      stats.week3.totalComplaints++;
      stats.week3.totalUPB += upb;
    } else if (date >= week4Start) {
      stats.week4.totalComplaints++;
      stats.week4.totalUPB += upb;
    }
    
    stats.totalComplaints++;
    stats.totalUPB += upb;
    // Since we only process complaints that meet criteria, all count toward criteria metrics
    stats.totalMeetsCriteria++;
    stats.totalUPBMeetsCriteria += upb;
  });
  
  return Array.from(countyMap.values()).sort((a, b) => 
    a.county.localeCompare(b.county)
  );
}

/**
 * Gets complaints from last 7 days (meeting criteria only)
 */
export function getLast7DaysComplaints(
  complaints: ProcessedComplaint[]
): Last7DaysComplaint[] {
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));
  
  const sevenDaysAgo = subDays(new Date(), 7);
  
  return qualifyingComplaints
    .filter(c => {
      if (!c.complaintDate) return false;
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate);
      return date >= sevenDaysAgo;
    })
    .map(c => {
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate!);
      
      return {
        propertyAddress: c.propertyAddress || 'Unknown',
        lender: c.normalizedLender || normalizeLender(c.lender || c.plaintiff),
        totalUPB: c.upb || 0,
        complaintDate: date,
        county: c.normalizedCounty || normalizeCounty(c.county),
      };
    })
    .sort((a, b) => b.complaintDate.getTime() - a.complaintDate.getTime());
}

/**
 * Calculates monthly lender data (top lenders by complaints meeting criteria)
 */
export function calculateMonthlyLenderData(
  complaints: ProcessedComplaint[]
): MonthlyLenderData[] {
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));
  
  const lenderMonthMap = new Map<string, MonthlyLenderData>();
  
  qualifyingComplaints.forEach(complaint => {
    if (!complaint.complaintDate) return;
    
    const date = complaint.complaintDate instanceof Date 
      ? complaint.complaintDate 
      : new Date(complaint.complaintDate);
    const month = format(date, 'yyyy-MM');
    const lender = complaint.normalizedLender || normalizeLender(complaint.lender || complaint.plaintiff);
    const key = `${lender}|${month}`;
    
    if (!lenderMonthMap.has(key)) {
      lenderMonthMap.set(key, {
        month,
        lender,
        numberOfComplaints: 0,
        totalUPB: 0,
      });
    }
    
    const data = lenderMonthMap.get(key)!;
    data.numberOfComplaints++;
    data.totalUPB += complaint.upb || 0;
  });
  
  return Array.from(lenderMonthMap.values())
    .sort((a, b) => {
      // Sort by month (newest first), then by number of complaints (highest first)
      if (b.month !== a.month) {
        return b.month.localeCompare(a.month);
      }
      return b.numberOfComplaints - a.numberOfComplaints;
    });
}

/**
 * Calculates monthly totals vs criteria (complaints + UPB)
 */
export function calculateMonthlyTrendSummary(
  complaints: ProcessedComplaint[]
): MonthlyTrendSummary[] {
  const validComplaints = filterValidComplaints(complaints);
  const monthMap = new Map<string, MonthlyTrendSummary>();

  validComplaints.forEach(complaint => {
    if (!complaint.complaintDate) return;

    const date = complaint.complaintDate instanceof Date
      ? complaint.complaintDate
      : new Date(complaint.complaintDate);
    const month = format(date, 'yyyy-MM');

    if (!monthMap.has(month)) {
      monthMap.set(month, {
        month,
        totalComplaints: 0,
        complaintsMeetingCriteria: 0,
        totalUPB: 0,
        upbMeetingCriteria: 0,
      });
    }

    const stats = monthMap.get(month)!;
    const upb = typeof complaint.upb === 'number' && !isNaN(complaint.upb) ? complaint.upb : 0;

    stats.totalComplaints++;
    stats.totalUPB += upb;

    if (meetsCriteria(complaint)) {
      stats.complaintsMeetingCriteria++;
      stats.upbMeetingCriteria += upb;
    }
  });

  return Array.from(monthMap.values()).sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Calculates lender totals for complaints that meet criteria
 */
export function calculateLenderCriteriaSummary(
  complaints: ProcessedComplaint[]
): LenderCriteriaSummary[] {
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));

  const lenderMap = new Map<string, LenderCriteriaSummary>();

  qualifyingComplaints.forEach(complaint => {
    const lender = normalizeLender(
      complaint.normalizedLender || complaint.lender || complaint.plaintiff
    );
    const upb = typeof complaint.upb === 'number' && !isNaN(complaint.upb) ? complaint.upb : 0;

    if (!lenderMap.has(lender)) {
      lenderMap.set(lender, {
        lender,
        totalComplaints: 0,
        totalUPB: 0,
      });
    }

    const stats = lenderMap.get(lender)!;
    stats.totalComplaints++;
    stats.totalUPB += upb;
  });

  return Array.from(lenderMap.values());
}

/**
 * Gets flow-through deals (YTD - all deals meeting criteria)
 */
export function getFlowThroughYTD(
  complaints: ProcessedComplaint[]
): FlowThroughDeal[] {
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));
  
  const yearStart = startOfYear(new Date());
  
  return qualifyingComplaints
    .filter(c => {
      if (!c.complaintDate) return false;
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate);
      return date >= yearStart;
    })
    .map(c => {
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate!);
      
      return {
        propertyAddress: c.propertyAddress || 'Unknown',
        county: c.normalizedCounty || normalizeCounty(c.county),
        lender: c.normalizedLender || normalizeLender(c.lender || c.plaintiff),
        upb: c.upb || 0,
        complaintDate: date,
        meetsCriteria: true,
      };
    })
    .sort((a, b) => b.complaintDate.getTime() - a.complaintDate.getTime());
}

/**
 * Gets flow-through deals (Last Week - deals meeting criteria in last 7 calendar days)
 */
export function getFlowThroughLastWeek(
  complaints: ProcessedComplaint[]
): FlowThroughDeal[] {
  const validComplaints = filterValidComplaints(complaints);
  const qualifyingComplaints = validComplaints.filter(c => meetsCriteria(c));
  
  // Last 7 calendar days (same as Last7DaysTable)
  const lastWeekStart = subDays(new Date(), 7);
  
  return qualifyingComplaints
    .filter(c => {
      if (!c.complaintDate) return false;
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate);
      return date >= lastWeekStart;
    })
    .map(c => {
      const date = c.complaintDate instanceof Date 
        ? c.complaintDate 
        : new Date(c.complaintDate!);
      
      return {
        propertyAddress: c.propertyAddress || 'Unknown',
        county: c.normalizedCounty || normalizeCounty(c.county),
        lender: c.normalizedLender || normalizeLender(c.lender || c.plaintiff),
        upb: c.upb || 0,
        complaintDate: date,
        meetsCriteria: true,
      };
    })
    .sort((a, b) => b.complaintDate.getTime() - a.complaintDate.getTime());
}

/**
 * Calculates region summary for current month
 */
export function calculateCurrentMonthRegionSummary(
  complaints: ProcessedComplaint[]
): RegionSummary[] {
  // Only process valid, non-duplicate complaints
  const validComplaints = filterValidComplaints(complaints);
  
  const monthStart = startOfMonth(new Date());
  
  // Filter to current month
  const monthComplaints = validComplaints.filter(c => {
    if (!c.complaintDate) return false;
    const date = c.complaintDate instanceof Date 
      ? c.complaintDate 
      : new Date(c.complaintDate);
    return date >= monthStart;
  });
  
  // Group by region
  const regionMap = new Map<string, RegionSummary>();
  
  // Initialize all regions
  getOrderedRegions().forEach(region => {
    regionMap.set(region, {
      region,
      totalComplaints: 0,
      totalUPB: 0,
      complaintsMeetingCriteria: 0,
      upbMeetingCriteria: 0,
    });
  });
  
  // Process complaints
  monthComplaints.forEach(complaint => {
    const region = getRegionFromCounty(complaint.normalizedCounty || complaint.county);
    
    // Skip Other/Unmapped regions (as per requirement)
    if (region === 'Other/Unmapped') {
      return;
    }
    
    const stats = regionMap.get(region);
    if (!stats) return;
    
    // Count all complaints
    stats.totalComplaints++;
    
    // Add UPB (handle non-numeric safely - treat as 0)
    const upb = typeof complaint.upb === 'number' && !isNaN(complaint.upb) ? complaint.upb : 0;
    stats.totalUPB += upb;
    
    // Count if meets criteria
    if (meetsCriteria(complaint)) {
      stats.complaintsMeetingCriteria++;
      stats.upbMeetingCriteria += upb;
    }
  });
  
  // Convert to array and sort by region order
  const orderedRegions = getOrderedRegions();
  return orderedRegions
    .map(region => regionMap.get(region)!)
    .filter(stats => stats.totalComplaints > 0); // Only include regions with data
}

/**
 * Calculates region summary for year-to-date
 */
export function calculateYTDRegionSummary(
  complaints: ProcessedComplaint[]
): RegionSummary[] {
  // Only process valid, non-duplicate complaints
  const validComplaints = filterValidComplaints(complaints);
  
  const yearStart = startOfYear(new Date());
  
  // Filter to YTD
  const ytdComplaints = validComplaints.filter(c => {
    if (!c.complaintDate) return false;
    const date = c.complaintDate instanceof Date 
      ? c.complaintDate 
      : new Date(c.complaintDate);
    return date >= yearStart;
  });
  
  // Group by region
  const regionMap = new Map<string, RegionSummary>();
  
  // Initialize all regions
  getOrderedRegions().forEach(region => {
    regionMap.set(region, {
      region,
      totalComplaints: 0,
      totalUPB: 0,
      complaintsMeetingCriteria: 0,
      upbMeetingCriteria: 0,
    });
  });
  
  // Process complaints
  ytdComplaints.forEach(complaint => {
    const region = getRegionFromCounty(complaint.normalizedCounty || complaint.county);
    
    // Skip Other/Unmapped regions (as per requirement)
    if (region === 'Other/Unmapped') {
      return;
    }
    
    const stats = regionMap.get(region);
    if (!stats) return;
    
    // Count all complaints
    stats.totalComplaints++;
    
    // Add UPB (handle non-numeric safely - treat as 0)
    const upb = typeof complaint.upb === 'number' && !isNaN(complaint.upb) ? complaint.upb : 0;
    stats.totalUPB += upb;
    
    // Count if meets criteria
    if (meetsCriteria(complaint)) {
      stats.complaintsMeetingCriteria++;
      stats.upbMeetingCriteria += upb;
    }
  });
  
  // Convert to array and sort by region order
  const orderedRegions = getOrderedRegions();
  return orderedRegions
    .map(region => regionMap.get(region)!)
    .filter(stats => stats.totalComplaints > 0); // Only include regions with data
}

/**
 * Calculates year-based summary (2024, 2025)
 */
export function calculateYearSummary(
  complaints: ProcessedComplaint[]
): YearSummary[] {
  // Only process valid, non-duplicate complaints
  const validComplaints = filterValidComplaints(complaints);
  
  // Group by year
  const yearMap = new Map<string, YearSummary>();
  
  // Initialize years 2024, 2025
  const years = ['2024', '2025'];
  years.forEach(year => {
    yearMap.set(year, {
      year,
      totalComplaints: 0,
      totalUPB: 0,
      complaintsMeetingCriteria: 0,
      upbMeetingCriteria: 0,
    });
  });
  
  // Process complaints
  validComplaints.forEach(complaint => {
    if (!complaint.complaintDate) return;
    
    const date = complaint.complaintDate instanceof Date 
      ? complaint.complaintDate 
      : new Date(complaint.complaintDate);
    
    const year = date.getFullYear().toString();
    
    // Only process 2024, 2025
    if (!years.includes(year)) {
      return;
    }
    
    const stats = yearMap.get(year);
    if (!stats) return;
    
    // Count all complaints
    stats.totalComplaints++;
    
    // Add UPB (handle non-numeric safely - treat as 0)
    const upb = typeof complaint.upb === 'number' && !isNaN(complaint.upb) ? complaint.upb : 0;
    stats.totalUPB += upb;
    
    // Count if meets criteria
    if (meetsCriteria(complaint)) {
      stats.complaintsMeetingCriteria++;
      stats.upbMeetingCriteria += upb;
    }
  });
  
  // Convert to array and sort by year (2024, 2025)
  return years
    .map(year => yearMap.get(year)!)
    .filter(stats => stats.totalComplaints > 0); // Only include years with data
}
