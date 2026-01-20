// Region mapping utilities

import { normalizeCounty } from './normalization';

export type Region = 'Miami-Dade' | 'Other Florida' | 'New York' | 'Other/Unmapped';

/**
 * Maps counties to regions
 * Handles variations and aliases
 */
const REGION_MAPPING: Record<string, Region> = {
  // Miami-Dade region
  'Miami-Dade': 'Miami-Dade',
  'Dade': 'Miami-Dade',
  'Miami Dade': 'Miami-Dade',
  'Miami-Dade County': 'Miami-Dade',
  'Miami Dade County': 'Miami-Dade',
  
  // Other Florida region
  'Pinellas': 'Other Florida',
  'Pinellas County': 'Other Florida',
  'Orange': 'Other Florida',
  'Orange County': 'Other Florida',
  'Broward': 'Other Florida',
  'Broward County': 'Other Florida',
  'Collier': 'Other Florida',
  'Collier County': 'Other Florida',
  'Volusia': 'Other Florida',
  'Volusia County': 'Other Florida',
  
  // New York region
  'Kings': 'New York',
  'Kings County': 'New York',
  'Suffolk': 'New York',
  'Suffolk County': 'New York',
  'Bronx': 'New York',
  'Bronxs': 'New York', // Handle typo variation
  'Bronx County': 'New York',
  'New York': 'New York',
  'New York County': 'New York',
  'Queens': 'New York',
  'Queens County': 'New York',
  'Nassau': 'New York',
  'Nassau County': 'New York',
  'Rockland': 'New York',
  'Rockland County': 'New York',
  'Westchester': 'New York',
  'Westchester County': 'New York',
};

/**
 * Maps a county name to its region
 * Returns "Other/Unmapped" for counties not in the mapping
 */
export function getRegionFromCounty(county: string | undefined | null): Region {
  if (!county) return 'Other/Unmapped';
  
  // First normalize the county name
  const normalized = normalizeCounty(county);
  
  // Check direct mapping
  if (REGION_MAPPING[normalized]) {
    return REGION_MAPPING[normalized];
  }
  
  // Check case-insensitive match
  const normalizedLower = normalized.toLowerCase();
  for (const [key, region] of Object.entries(REGION_MAPPING)) {
    if (key.toLowerCase() === normalizedLower) {
      return region;
    }
  }
  
  // Not found in mapping
  return 'Other/Unmapped';
}

/**
 * Gets the ordered list of regions (excluding Other/Unmapped)
 */
export function getOrderedRegions(): Region[] {
  return ['Miami-Dade', 'Other Florida', 'New York'];
}

/**
 * Gets all regions including Other/Unmapped
 */
export function getAllRegions(): Region[] {
  return ['Miami-Dade', 'Other Florida', 'New York', 'Other/Unmapped'];
}
