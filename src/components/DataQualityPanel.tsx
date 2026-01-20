// Data Quality Issues Panel Component

interface DataQualityPanelProps {
  issues: Array<{
    rowIndex: number;
    errors: string[];
    isDuplicate: boolean;
    duplicateOf?: number;
  }>;
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    rowsWithJSONErrors: number;
    rowsWithOtherErrors: number;
  };
  onClose?: () => void;
}

export function DataQualityPanel({ issues, summary, onClose }: DataQualityPanelProps) {
  if (issues.length === 0) {
    return null;
  }

  const errorCount = issues.filter(i => i.errors.length > 0).length;
  const duplicateCount = issues.filter(i => i.isDuplicate).length;
  const jsonErrorCount = issues.filter(i => 
    i.errors.some(err => err.toLowerCase().includes('json'))
  ).length;

  return (
    <div className="quality-panel">
      <div className="quality-panel-header">
        <h3>Data Quality Review</h3>
        {onClose && (
          <button onClick={onClose} className="close-button" aria-label="Close">
            ×
          </button>
        )}
      </div>
      
      {summary && (
        <div className="quality-stats">
          <div className="stat-item">
            <span className="stat-label">Total Rows:</span>
            <span className="stat-value">{summary.totalRows}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Valid Rows:</span>
            <span className="stat-value success">{summary.validRows}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Invalid Rows:</span>
            <span className="stat-value error">{summary.invalidRows}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Duplicates:</span>
            <span className="stat-value warning">{summary.duplicateRows}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">JSON Errors:</span>
            <span className="stat-value error">{summary.rowsWithJSONErrors}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Other Errors:</span>
            <span className="stat-value error">{summary.rowsWithOtherErrors}</span>
          </div>
        </div>
      )}
      
      <div className="quality-summary">
        <span>Total Issues: {issues.length}</span>
        <span>Duplicates: {duplicateCount}</span>
        <span>JSON Errors: {jsonErrorCount}</span>
        <span>Other Errors: {errorCount - jsonErrorCount}</span>
      </div>
      
      <div className="quality-details">
        <h4>Issue Details (showing first 20):</h4>
        {issues.slice(0, 20).map((issue, index) => (
          <div key={index} className="quality-issue">
            <div className="issue-header">
              <strong>Row {issue.rowIndex + 1}</strong>
              {issue.isDuplicate && (
                <span className="badge duplicate">
                  Duplicate{issue.duplicateOf !== undefined && ` (of row ${issue.duplicateOf + 1})`}
                </span>
              )}
              {issue.errors.some(err => err.toLowerCase().includes('json')) && (
                <span className="badge json-error">JSON Error</span>
              )}
            </div>
            {issue.errors.length > 0 && (
              <ul className="issue-errors">
                {issue.errors.map((error, errIndex) => {
                  const isJSONError = error.toLowerCase().includes('json');
                  return (
                    <li key={errIndex} className={isJSONError ? 'json-error-text' : ''}>
                      {error}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
        {issues.length > 20 && (
          <div className="quality-more">
            ... and {issues.length - 20} more issues (check console for full details)
          </div>
        )}
      </div>
    </div>
  );
}

