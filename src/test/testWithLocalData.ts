// Script to test data processing with local mock data
// Run with: npx tsx src/test/testWithLocalData.ts

import { processRowsWithQualityChecks } from '../utils/dataQuality';
import { normalizeCounty, normalizeLender } from '../utils/normalization';
import {
  calculateFourWeekRollUp,
  calculateYTDStats,
  calculateCurrentMonthStats,
  calculateLenderAnalysis,
  getRecentComplaints,
} from '../utils/calculations';
import { mockRows } from './mockData';

console.log('🧪 Testing Data Processing with Mock Data\n');
console.log('=' .repeat(60));

// Step 1: Process rows with quality checks
console.log('\n1️⃣ Processing rows with quality checks...');
const { processed, issues, summary } = processRowsWithQualityChecks(mockRows);

console.log('\n📊 Quality Summary:');
console.log(`   Total Rows: ${summary.totalRows}`);
console.log(`   Valid Rows: ${summary.validRows}`);
console.log(`   Invalid Rows: ${summary.invalidRows}`);
console.log(`   Duplicate Rows: ${summary.duplicateRows}`);
console.log(`   JSON Errors: ${summary.rowsWithJSONErrors}`);
console.log(`   Other Errors: ${summary.rowsWithOtherErrors}`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues Found:');
  issues.slice(0, 5).forEach(issue => {
    console.log(`   Row ${issue.rowIndex + 1}:`);
    if (issue.isDuplicate) {
      console.log(`     - Duplicate${issue.duplicateOf !== undefined ? ` (of row ${issue.duplicateOf + 1})` : ''}`);
    }
    issue.errors.forEach(error => {
      console.log(`     - ${error}`);
    });
  });
  if (issues.length > 5) {
    console.log(`   ... and ${issues.length - 5} more issues`);
  }
}

// Step 2: Apply normalization
console.log('\n2️⃣ Applying normalization...');
const normalized = processed.map(row => ({
  ...row,
  normalizedCounty: normalizeCounty(row.county),
  normalizedLender: normalizeLender(row.lender || row.plaintiff),
}));

console.log('   Normalization applied to all rows');

// Step 3: Calculate metrics
console.log('\n3️⃣ Calculating metrics...');

const fourWeekRollUp = calculateFourWeekRollUp(normalized);
console.log('\n📈 Four-Week Roll-Up:');
if (fourWeekRollUp.length > 0) {
  fourWeekRollUp.forEach(county => {
    console.log(`   ${county.county}:`);
    console.log(`     Total Complaints: ${county.totalComplaints}`);
    console.log(`     Total UPB: $${county.totalUPB.toLocaleString()}`);
    console.log(`     Meets Criteria: ${county.totalMeetsCriteria}`);
    console.log(`     UPB (Meets Criteria): $${county.totalUPBMeetsCriteria.toLocaleString()}`);
  });
} else {
  console.log('   No data for the four-week period');
}

const ytdStats = calculateYTDStats(normalized);
console.log('\n📅 Year-to-Date Statistics:');
console.log(`   Total Complaints: ${ytdStats.totalComplaints}`);
console.log(`   Meets Criteria: ${ytdStats.totalMeetsCriteria}`);
console.log(`   Total UPB (Meets Criteria): $${ytdStats.totalUPBMeetsCriteria.toLocaleString()}`);

const currentMonthStats = calculateCurrentMonthStats(normalized);
console.log('\n📆 Current Month Statistics:');
console.log(`   Total Complaints: ${currentMonthStats.totalComplaints}`);
console.log(`   Meets Criteria: ${currentMonthStats.totalMeetsCriteria}`);
console.log(`   Total UPB (Meets Criteria): $${currentMonthStats.totalUPBMeetsCriteria.toLocaleString()}`);

const lenderAnalysis = calculateLenderAnalysis(normalized);
console.log('\n🏦 Lender Analysis (Top 5):');
if (lenderAnalysis.length > 0) {
  lenderAnalysis.slice(0, 5).forEach(lender => {
    console.log(`   ${lender.lender}:`);
    console.log(`     YTD Complaints: ${lender.ytdComplaints}, UPB: $${lender.ytdUPB.toLocaleString()}`);
    console.log(`     Current Month: ${lender.currentMonthComplaints}, UPB: $${lender.currentMonthUPB.toLocaleString()}`);
  });
} else {
  console.log('   No lender data');
}

const recentComplaints = getRecentComplaints(normalized);
console.log('\n🕐 Recent Complaints (Last 15 Days):');
if (recentComplaints.length > 0) {
  recentComplaints.slice(0, 5).forEach(complaint => {
    console.log(`   ${complaint.propertyAddress}`);
    console.log(`     County: ${complaint.county}, Lender: ${complaint.lender}`);
    console.log(`     UPB: $${complaint.upb.toLocaleString()}, Date: ${complaint.complaintDate.toLocaleDateString()}`);
  });
} else {
  console.log('   No recent complaints');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Testing complete!');
console.log('\n💡 To test with real Google Sheets data:');
console.log('   1. Update src/config/columnMapping.ts with your column names');
console.log('   2. Run: npm run dev');
console.log('   3. Open http://localhost:5173 in your browser');

