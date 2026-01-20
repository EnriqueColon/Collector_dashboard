// Main App Component

import { useState } from 'react';
import { useSheetData } from './hooks/useSheetData';
import {
  calculateFourWeekRollUpWeekly,
  calculateMonthlyLenderData,
  calculateMonthlyTrendSummary,
  calculateLenderCriteriaSummary,
  getFlowThroughYTD,
  getFlowThroughLastWeek,
  calculateCurrentMonthRegionSummary,
  calculateYTDRegionSummary,
  calculateYearSummary,
} from './utils/calculations';
import { FourWeekRollUpWeeklyTable } from './components/FourWeekRollUpWeekly';
import { TopLendersMonthly } from './components/TopLendersMonthly';
import { LenderAnalysisSummary } from './components/LenderAnalysisSummary';
import { FlowThroughAnalysis } from './components/FlowThroughAnalysis';
import { DataQualityPanel } from './components/DataQualityPanel';
import { SummaryPage } from './components/SummaryPage';
import './App.css';

import { SHEET_NAME } from './config/sheetConfig';

function App() {
  const { complaints, loading, error, issues, summary, refresh } = useSheetData(SHEET_NAME);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'summary'>('dashboard');
  const isSummary = currentView === 'summary';

  if (loading && complaints.length === 0) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Collector Analytics Dashboard</h1>
        </header>
        <div className="loading">Loading data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Collector Analytics Dashboard</h1>
        </header>
        <div className="error">
          <p>Error loading data: {error}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  // Calculate all metrics (with error handling)
  let fourWeekRollUpWeekly, monthlyLenders, monthlyTrendSummary, lenderCriteriaSummary, flowThroughYTD, flowThroughLastWeek;
  let currentMonthRegionSummary, ytdRegionSummary, yearSummary;
  
  try {
    fourWeekRollUpWeekly = calculateFourWeekRollUpWeekly(complaints);
    monthlyLenders = calculateMonthlyLenderData(complaints);
    monthlyTrendSummary = calculateMonthlyTrendSummary(complaints);
    lenderCriteriaSummary = calculateLenderCriteriaSummary(complaints);
    flowThroughYTD = getFlowThroughYTD(complaints);
    flowThroughLastWeek = getFlowThroughLastWeek(complaints);
    currentMonthRegionSummary = calculateCurrentMonthRegionSummary(complaints);
    ytdRegionSummary = calculateYTDRegionSummary(complaints);
    yearSummary = calculateYearSummary(complaints);
  } catch (calcError) {
    console.error('Error calculating metrics:', calcError);
    return (
      <div className="app">
        <header className="app-header">
          <h1>Collector Analytics Dashboard</h1>
        </header>
        <div className="error">
          <p>Error calculating metrics: {calcError instanceof Error ? calcError.message : 'Unknown error'}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  // If summary view, show summary page
  if (isSummary) {
    return (
      <>
        <div className="view-switcher">
          <button
            onClick={() => setCurrentView('summary')}
            className={isSummary ? 'active' : ''}
          >
            Summary
          </button>
          <button
            onClick={() => setCurrentView('dashboard')}
            className={!isSummary ? 'active' : ''}
          >
            Detail
          </button>
        </div>
        <SummaryPage
          currentMonthData={currentMonthRegionSummary}
          ytdData={ytdRegionSummary}
          yearData={yearSummary}
        />
      </>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Collector Analytics Dashboard</h1>
        <div className="header-actions">
          <div className="view-switcher">
            <button
              onClick={() => setCurrentView('summary')}
              className={isSummary ? 'active' : ''}
            >
              Summary
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className={!isSummary ? 'active' : ''}
            >
              Detail
            </button>
          </div>
          <button onClick={refresh} className="refresh-button">
            Refresh Data
          </button>
          {issues.length > 0 && (
            <button
              onClick={() => setShowQualityPanel(!showQualityPanel)}
              className="quality-button"
            >
              Data Quality ({issues.length})
            </button>
          )}
        </div>
      </header>

      {showQualityPanel && (
        <DataQualityPanel
          issues={issues}
          summary={summary}
          onClose={() => setShowQualityPanel(false)}
        />
      )}

      <main className="dashboard-content">
        <section className="dashboard-section">
          <FourWeekRollUpWeeklyTable data={fourWeekRollUpWeekly} />
        </section>

        <section className="dashboard-section">
          <TopLendersMonthly data={monthlyLenders} monthlySummary={monthlyTrendSummary} />
        </section>

        <section className="dashboard-section">
          <LenderAnalysisSummary data={lenderCriteriaSummary} complaints={complaints} />
        </section>

        <section className="dashboard-section">
          <FlowThroughAnalysis
            ytdData={flowThroughYTD}
            lastWeekData={flowThroughLastWeek}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>
          Data refreshes automatically every 5 minutes. Last updated:{' '}
          {new Date().toLocaleTimeString()}
        </p>
      </footer>
    </div>
  );
}

export default App;

