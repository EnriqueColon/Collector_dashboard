// Normalization utilities for counties and lenders

/**
 * Normalizes county names to a consistent format
 * Case-insensitive, handles common variations
 */
export function normalizeCounty(county: string | undefined | null): string {
  if (!county) return 'Unknown';
  
  // Ensure it's a string
  const countyStr = typeof county === 'string' ? county : String(county || '');
  
  // Convert to lowercase and trim
  let normalized = countyStr.trim().toLowerCase();
  
  // Remove state suffixes (e.g., ", Florida", ", FL", ", florida")
  normalized = normalized.replace(/,\s*(florida|fl|california|ca|texas|tx|new york|ny)\s*$/i, '').trim();
  
  // Remove "County" suffix (e.g., "Broward County" -> "Broward")
  normalized = normalized.replace(/\s+county\s*$/i, '').trim();
  
  // Handle Miami-Dade variations BEFORE other mappings
  // "Dade" alone should become "Miami-Dade"
  if (normalized === 'dade') {
    normalized = 'miami-dade';
  }
  // "Miami Dade", "Miami-dade", "Miami Dade County", "Miami-Dade County" -> "Miami-Dade"
  // This regex handles spaces, hyphens, and optional "County" suffix
  normalized = normalized.replace(/^miami\s*-?\s*dade(\s+county)?$/i, 'miami-dade');
  
  // Handle common abbreviations and variations
  const countyMap: Record<string, string> = {
    'nyc': 'new york',
    'ny': 'new york',
    'new york city': 'new york',
    'st.': 'saint',
    'st': 'saint',
    'ft.': 'fort',
    'ft': 'fort',
  };
  
  // Apply mappings
  Object.entries(countyMap).forEach(([key, value]) => {
    normalized = normalized.replace(new RegExp(`\\b${key}\\b`, 'gi'), value);
  });
  
  // Capitalize first letter of each word
  // Handle both space-separated and hyphenated names
  const parts = normalized.split(/[\s-]+/).filter(p => p.length > 0);
  const capitalized = parts.map(part => 
    part.charAt(0).toUpperCase() + part.slice(1)
  );
  
  // Check if original had hyphens (for names like "miami-dade")
  const hadHyphen = normalized.includes('-');
  
  if (hadHyphen) {
    // Join with hyphens for hyphenated names (e.g., "Miami-Dade")
    normalized = capitalized.join('-');
  } else {
    // Join with spaces for regular names (e.g., "Orange County" -> "Orange")
    normalized = capitalized.join(' ');
  }
  
  // Ensure Miami-Dade is properly formatted (handles "Miami Dade" -> "Miami-Dade")
  normalized = normalized.replace(/\bMiami\s+Dade\b/gi, 'Miami-Dade');
  
  return normalized;
}

/**
 * Normalizes lender/plaintiff names
 * Handles abbreviations, punctuation, casing variations, and common name variations
 */
export function normalizeLender(lender: string | undefined | null | Date): string {
  if (!lender) return 'Unknown';
  
  // Ensure it's a string
  if (lender instanceof Date) return 'Unknown';
  const lenderStr = typeof lender === 'string' ? lender : String(lender || '');
  
  // Convert to lowercase and trim
  let normalized = lenderStr.trim().toLowerCase();
  
  // Remove common punctuation (but keep hyphens for names like "U.S.")
  normalized = normalized.replace(/[.,;:!?'"()]/g, '');
  
  // Normalize "U.S." and "US" variations
  normalized = normalized.replace(/\b(us|u\.s\.|united states)\b/gi, 'united states');
  
  // Normalize common abbreviations (expanded list)
  const abbreviationMap: Record<string, string> = {
    // Company type abbreviations
    'inc': 'incorporated',
    'inc.': 'incorporated',
    'llc': 'limited liability company',
    'llc.': 'limited liability company',
    'ltd': 'limited',
    'ltd.': 'limited',
    'corp': 'corporation',
    'corp.': 'corporation',
    'co': 'company',
    'co.': 'company',
    'lp': 'limited partnership',
    'lp.': 'limited partnership',
    'llp': 'limited liability partnership',
    'llp.': 'limited liability partnership',
    
    // Financial institution abbreviations
    'na': 'national association',
    'fsa': 'federal savings association',
    'fcu': 'federal credit union',
    'cu': 'credit union',
    'fcb': 'federal credit bank',
    
    // Common word abbreviations
    '&': 'and',
    'amp': 'and',
    'mtg': 'mortgage',
    'mtg.': 'mortgage',
    'svc': 'service',
    'svc.': 'service',
    'svcs': 'services',
    'svcs.': 'services',
    'mgmt': 'management',
    'mgmt.': 'management',
    'fin': 'financial',
    'fin.': 'financial',
    'fnd': 'fund',
    'fnd.': 'fund',
    'grp': 'group',
    'grp.': 'group',
  };
  
  // Apply abbreviation mappings
  Object.entries(abbreviationMap).forEach(([key, value]) => {
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    normalized = normalized.replace(regex, value);
  });
  
  // Normalize plural/singular variations (normalize to singular for better grouping)
  const pluralMap: Record<string, string> = {
    'banks': 'bank',
    'mortgages': 'mortgage',
    'services': 'service',
    'groups': 'group',
    'companies': 'company',
    'corporations': 'corporation',
    'associations': 'association',
    'unions': 'union',
    'funds': 'fund',
    'trusts': 'trust',
  };
  
  Object.entries(pluralMap).forEach(([plural, singular]) => {
    const regex = new RegExp(`\\b${plural}\\b`, 'gi');
    normalized = normalized.replace(regex, singular);
  });
  
  // Normalize common word variations (be conservative - only when clearly the same)
  const wordVariations: Record<string, string> = {
    'finance': 'financial',
    // Note: Not normalizing "lending" to "lender" as they might be different entities
  };
  
  Object.entries(wordVariations).forEach(([variant, standard]) => {
    const regex = new RegExp(`\\b${variant}\\b`, 'gi');
    normalized = normalized.replace(regex, standard);
  });
  
  // Remove "The" prefix if it's not the only word (for better grouping)
  // "The Bank" and "Bank" should be grouped together
  normalized = normalized.replace(/^the\s+/i, '');
  
  // Normalize common suffixes that don't affect identity
  // Remove trailing "Company" if there's already a company type indicator
  // This helps group "ABC Bank" with "ABC Bank Company"
  const hasCompanyType = /\b(incorporated|corporation|limited liability company|llc|inc|corp)\b/i.test(normalized);
  if (hasCompanyType) {
    normalized = normalized.replace(/\s+company\s*$/i, '');
  }
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Consolidate all Wilmington variations into one lender
  if (/^wilmington\b/i.test(normalized)) {
    return 'Wilmington';
  }

  // Consolidate JPMorgan variations into one lender
  if (/^jpmorgan\b/i.test(normalized)) {
    return 'JPMorgan';
  }

  // Consolidate Wells Fargo variations into one lender
  if (/^wells\s*fargo\b/i.test(normalized)) {
    return 'Wells Fargo';
  }

  // Consolidate Computershare Trust Company National into Computer Trust Company
  if (/^computershare\s+trust\s+company\s+national\b/i.test(normalized)) {
    return 'Computer Trust Company';
  }

  // Consolidate Lincoln Street variations into one lender
  if (/^lincoln\s+street\b/i.test(normalized)) {
    return 'Lincoln Street';
  }

  // Consolidate American General Life Insurance into American General Life
  if (/^american\s+general\s+life\s+insurance\b/i.test(normalized)) {
    return 'American General Life';
  }

  // Consolidate EF Mortgage variations into one lender
  if (/ef\s+mortgage/i.test(normalized)) {
    return 'EF Mortgage';
  }

  // Consolidate Tryon/Tyron Street variations into one lender
  if (/(tryon|tyron)\s+street/i.test(normalized)) {
    return 'Tryon Street';
  }

  // Consolidate SIG RCRS separately from Sig Cre
  if (/^sig\s*rcrs\b/i.test(normalized)) {
    return 'SIG RCRS';
  }
  if (/^sig\s*cre\b/i.test(normalized)) {
    return 'Sig Cre';
  }
  
  // Capitalize first letter of each word (title case)
  normalized = normalized
    .split(' ')
    .map(word => {
      // Don't capitalize common words unless they're the first word
      const commonWords = ['the', 'of', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for'];
      if (commonWords.includes(word) && normalized.indexOf(word) > 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
  
  return normalized;
}

/**
 * Extensible normalization registry
 * Can be extended with custom rules
 */
export class NormalizationRegistry {
  private countyRules: Array<(county: string) => string> = [];
  private lenderRules: Array<(lender: string) => string> = [];
  
  addCountyRule(rule: (county: string) => string): void {
    this.countyRules.push(rule);
  }
  
  addLenderRule(rule: (lender: string) => string): void {
    this.lenderRules.push(rule);
  }
  
  normalizeCounty(county: string): string {
    let result = normalizeCounty(county);
    this.countyRules.forEach(rule => {
      result = rule(result);
    });
    return result;
  }
  
  normalizeLender(lender: string): string {
    let result = normalizeLender(lender);
    this.lenderRules.forEach(rule => {
      result = rule(result);
    });
    return result;
  }
}

