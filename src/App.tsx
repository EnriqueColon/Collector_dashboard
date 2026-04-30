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
import { KPISummaryCards } from './components/KPISummaryCards';
import { SkeletonLoader } from './components/SkeletonLoader';
import { CountyHeatmap } from './components/CountyHeatmap';
import { Login } from './components/Login';
import './App.css';

import { SHEET_NAME } from './config/sheetConfig';

const NAV_SECTIONS = [
  { id: 'section-rollup',  label: '4-Week Roll-Up' },
  { id: 'section-heatmap', label: 'County Activity' },
  { id: 'section-trends',  label: 'Monthly Trends' },
  { id: 'section-lenders', label: 'Lender Analysis' },
  { id: 'section-deals',   label: 'Deals' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('dashboard_auth') === '1');

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return <Dashboard onLogout={() => { localStorage.removeItem('dashboard_auth'); setAuthenticated(false); }} />;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { complaints, loading, error, issues, summary, refresh } = useSheetData(SHEET_NAME);
  const [showQualityPanel, setShowQualityPanel] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'summary'>('dashboard');
  const isSummary = currentView === 'summary';

  if (loading && complaints.length === 0) {
    return <SkeletonLoader />;
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
    return (
      <div className="app">
        <header className="app-header"><h1>Collector Analytics Dashboard</h1></header>
        <div className="error">
          <p>Error calculating metrics: {calcError instanceof Error ? calcError.message : 'Unknown error'}</p>
          <button onClick={refresh}>Retry</button>
        </div>
      </div>
    );
  }

  if (isSummary) {
    return (
      <>
        <header className="app-header">
          <h1>Collector Analytics Dashboard</h1>
          <div className="header-actions">
            <div className="view-switcher">
              <button onClick={() => setCurrentView('summary')} className={isSummary ? 'active' : ''}>Summary</button>
              <button onClick={() => setCurrentView('dashboard')} className={!isSummary ? 'active' : ''}>Detail</button>
            </div>
            <button onClick={onLogout} className="refresh-button" style={{ backgroundColor: 'var(--text-secondary)', borderColor: 'var(--text-secondary)' }}>Log Out</button>
          </div>
        </header>
        <SummaryPage currentMonthData={currentMonthRegionSummary} ytdData={ytdRegionSummary} yearData={yearSummary} />
      </>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Collector Analytics Dashboard</h1>
        <div className="header-actions">
          <div className="view-switcher">
            <button onClick={() => setCurrentView('summary')} className={isSummary ? 'active' : ''}>Summary</button>
            <button onClick={() => setCurrentView('dashboard')} className={!isSummary ? 'active' : ''}>Detail</button>
          </div>
          <button onClick={refresh} className="refresh-button">Refresh Data</button>
          {issues.length > 0 && (
            <button onClick={() => setShowQualityPanel(!showQualityPanel)} className="quality-button">
              Data Quality ({issues.length})
            </button>
          )}
          <button onClick={onLogout} className="logout-button">Log Out</button>
        </div>
      </header>

      {/* Sticky section nav */}
      <nav className="section-nav">
        {NAV_SECTIONS.map(s => (
          <button key={s.id} className="section-nav-btn" onClick={() => scrollTo(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>

      {showQualityPanel && (
        <DataQualityPanel issues={issues} summary={summary} onClose={() => setShowQualityPanel(false)} />
      )}

      <main className="dashboard-content">
        {/* KPI summary cards */}
        <KPISummaryCards complaints={complaints} />

        <section id="section-rollup" className="dashboard-section">
          <FourWeekRollUpWeeklyTable data={fourWeekRollUpWeekly} />
        </section>

        <section id="section-heatmap" className="dashboard-section">
          <CountyHeatmap data={fourWeekRollUpWeekly} />
        </section>

        <section id="section-trends" className="dashboard-section">
          <TopLendersMonthly data={monthlyLenders} monthlySummary={monthlyTrendSummary} />
        </section>

        <section id="section-lenders" className="dashboard-section">
          <LenderAnalysisSummary data={lenderCriteriaSummary} complaints={complaints} />
        </section>

        <section id="section-deals" className="dashboard-section">
          <FlowThroughAnalysis ytdData={flowThroughYTD} lastWeekData={flowThroughLastWeek} />
        </section>
      </main>

      <footer className="app-footer">
        <p>Data refreshes every 5 minutes &bull; Last updated: {new Date().toLocaleTimeString()}</p>
      </footer>
    </div>
  );
}

export default App;
