/**
 * Export utilities for downloading search results as Excel (.xlsx) files
 */

interface DeveloperData {
  login: string;
  name?: string | null;
  avatar_url?: string;
  html_url: string;
  bio?: string | null;
  location?: string | null;
  company?: string | null;
  email?: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
  blog?: string;
  hireable?: boolean | null;
  hasEmail?: boolean;
  [key: string]: any;
}

/**
 * Convert data to CSV format
 */
function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] ?? '';
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * Create a Blob from CSV data
 */
function createCSVBlob(data: any[], headers: string[]): Blob {
  const csv = convertToCSV(data, headers);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Convert CSV to ArrayBuffer for XLSX
 */
function csvToArrayBuffer(csv: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(csv).buffer;
}

/**
 * Generate a simple XLSX file (as CSV with .xlsx extension)
 * This creates a file that Excel can open directly
 */
export function exportToExcel(developers: DeveloperData[], filename: string = 'developers'): void {
  const headers = [
    'GitHub Username',
    'Name',
    'Email',
    'Location',
    'Company',
    'Bio',
    'Followers',
    'Following',
    'Repositories',
    'Blog URL',
    'GitHub Profile',
    'Available for Hire',
    'Has Email'
  ];

  // Transform data to match headers
  const exportData = developers.map(dev => ({
    'GitHub Username': dev.login,
    'Name': dev.name || dev.login,
    'Email': dev.email || '',
    'Location': dev.location || '',
    'Company': dev.company || '',
    'Bio': dev.bio || '',
    'Followers': dev.followers || 0,
    'Following': dev.following || 0,
    'Repositories': dev.public_repos || 0,
    'Blog URL': dev.blog || '',
    'GitHub Profile': dev.html_url,
    'Available for Hire': dev.hireable ? 'Yes' : 'No',
    'Has Email': dev.hasEmail || dev.email ? 'Yes' : 'No'
  }));

  // Create CSV
  const csv = convertToCSV(exportData, headers);
  
  // Create blob with BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
  
  // Download
  downloadBlob(blob, `${filename}.xlsx`);
}

/**
 * Download a blob as a file
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export with custom columns
 */
export function exportCustomColumns(
  developers: DeveloperData[], 
  columns: { key: string; header: string }[],
  filename: string = 'developers'
): void {
  const headers = columns.map(c => c.header);
  
  const exportData = developers.map(dev => {
    const row: any = {};
    columns.forEach(col => {
      row[col.header] = dev[col.key] ?? '';
    });
    return row;
  });

  const csv = convertToCSV(exportData, headers);
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xlsx`);
}
