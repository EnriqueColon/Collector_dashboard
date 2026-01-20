import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataQualityPanel } from '../../components/DataQualityPanel';

describe('DataQualityPanel', () => {
  const mockIssues = [
    {
      rowIndex: 0,
      row: { propertyAddress: '123 Main St' },
      errors: ['Missing county'],
      isDuplicate: false,
    },
    {
      rowIndex: 1,
      row: { propertyAddress: '456 Oak Ave' },
      errors: ['Invalid JSON in metadata'],
      isDuplicate: false,
    },
    {
      rowIndex: 2,
      row: { propertyAddress: '789 Pine Rd' },
      errors: [],
      isDuplicate: true,
      duplicateOf: 0,
    },
  ];

  const mockSummary = {
    totalRows: 100,
    validRows: 97,
    invalidRows: 3,
    duplicateRows: 1,
    rowsWithJSONErrors: 1,
    rowsWithOtherErrors: 1,
  };

  it('should render quality panel with issues', () => {
    render(<DataQualityPanel issues={mockIssues} summary={mockSummary} />);
    
    expect(screen.getByText('Data Quality Review')).toBeInTheDocument();
    expect(screen.getByText('Total Rows:')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display summary statistics', () => {
    render(<DataQualityPanel issues={mockIssues} summary={mockSummary} />);
    
    expect(screen.getByText('Valid Rows:')).toBeInTheDocument();
    expect(screen.getByText('97')).toBeInTheDocument();
    expect(screen.getByText('Duplicates:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should display issue details', () => {
    render(<DataQualityPanel issues={mockIssues} summary={mockSummary} />);
    
    expect(screen.getByText('Row 1')).toBeInTheDocument();
    expect(screen.getByText('Missing county')).toBeInTheDocument();
    expect(screen.getByText('Invalid JSON in metadata')).toBeInTheDocument();
  });

  it('should highlight JSON errors', () => {
    render(<DataQualityPanel issues={mockIssues} summary={mockSummary} />);
    
    const jsonError = screen.getByText('Invalid JSON in metadata');
    expect(jsonError).toBeInTheDocument();
  });

  it('should show duplicate information', () => {
    render(<DataQualityPanel issues={mockIssues} summary={mockSummary} />);
    
    expect(screen.getByText(/Duplicate/)).toBeInTheDocument();
  });

  it('should not render when there are no issues', () => {
    const { container } = render(<DataQualityPanel issues={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

