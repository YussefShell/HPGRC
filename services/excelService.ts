
import * as XLSX from 'xlsx';
import { Ticket, Priority, TicketState, ComplianceStatus } from '../types';

// Helper to find a matching key in the raw object case-insensitively and checking for aliases
// Updated: Added trim() to remove accidental whitespace in keys.
const findValue = (row: any, keys: string[]): string | undefined => {
  const rowKeys = Object.keys(row);
  // 1. Exact match (insensitive, trimmed)
  let match = rowKeys.find(rk => keys.includes(rk.toLowerCase().trim()));

  // 2. Partial match if no exact match
  if (!match) {
    match = rowKeys.find(rk => keys.some(k => rk.toLowerCase().includes(k)));
  }

  if (match) return row[match];
  return undefined;
};

// Helper to parse date from Excel serial or string
const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const parseExcelFile = async (file: File): Promise<Ticket[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        const tickets: Ticket[] = jsonData.map((row: any, index: number) => {
          // Normalize Data from arbitrary columns
          // Explicitly prioritized 'short description' as requested
          const title = findValue(row, ['short description', 'short_description', 'summary', 'title', 'subject', 'headline']) || `Imported Ticket #${index + 1}`;

          // Description fallback
          const description = findValue(row, ['description', 'desc', 'details', 'notes', 'issue']) || title;

          // Category Extraction
          // Updated: User requested Short Description be used as the Original Category to avoid hash IDs in 'category' column
          const categoryRaw = findValue(row, ['short description', 'short_description', 'summary', 'category', 'classification', 'type', 'cat', 'issue type']);
          const originalCategory = categoryRaw ? String(categoryRaw).trim() : 'Uncategorized';

          // Priority Mapping
          let priorityRaw = findValue(row, ['priority', 'severity', 'urgency']);
          let priority = Priority.Low;

          if (priorityRaw) {
            const p = String(priorityRaw).toLowerCase();
            if (p.includes('crit') || p.startsWith('1')) priority = Priority.Critical;
            else if (p.includes('high') || p.startsWith('2')) priority = Priority.High;
            else if (p.includes('mod') || p.includes('med') || p.startsWith('3')) priority = Priority.Moderate;
            else if (p.includes('low') || p.startsWith('4') || p.startsWith('5')) priority = Priority.Low;
          }

          // State Mapping
          let stateRaw = findValue(row, ['state', 'status']);
          let state = TicketState.Open;
          if (stateRaw) {
            const s = String(stateRaw).toLowerCase();
            if (s.includes('prog') || s.includes('working') || s.includes('pend')) state = TicketState.InProgress;
            if (s.includes('res')) state = TicketState.Resolved;
            if (s.includes('clo') || s.includes('complete')) state = TicketState.Closed;
          }

          // Assignee
          const assignedToName = findValue(row, ['assigned to', 'assigned', 'assignee', 'owner', 'eng']) || 'Unassigned';

          // Dates & Duration Logic
          let createdDate = new Date();
          const dateRaw = findValue(row, ['created', 'opened', 'date', 'open']);
          const parsedCreated = parseDate(dateRaw);
          if (parsedCreated) createdDate = parsedCreated;

          // Attempt to find Closed Date
          let closedDate: Date | undefined = undefined;
          if (state === TicketState.Closed || state === TicketState.Resolved) {
            const closeRaw = findValue(row, ['closed', 'resolved', 'completed', 'end', 'fixed']);
            const parsedClosed = parseDate(closeRaw);
            if (parsedClosed) closedDate = parsedClosed;
          }

          // Calculate duration
          // If Closed: Duration = Closed - Created
          // If Open: Duration = Now - Created
          const now = new Date();
          const endDate = closedDate || now;

          // Calculate duration in hours with 1 decimal precision
          let diffMs = endDate.getTime() - createdDate.getTime();
          if (diffMs < 0) diffMs = 0; // Sanity check for data errors (Closed < Created)

          const durationHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(1));

          return {
            id: findValue(row, ['number', 'id', 'ticket', 'key', 'ref']) || `T-${10000 + index}`,
            title,
            description,
            assignedTo: assignedToName.toLowerCase().replace(' ', '.'),
            assignedToName,
            priority,
            state,
            createdDate: createdDate.toISOString(),
            closedDate: closedDate ? closedDate.toISOString() : undefined,
            durationHours,
            category: originalCategory, // Initial value
            originalCategory: originalCategory,
            subCategory: 'General',
            // Defaults for enrichment
            riskScore: 0,
            complianceStatus: ComplianceStatus.Compliant,
            sentimentScore: 0,
            isAnomaly: false
          };
        });

        resolve(tickets);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const exportToExcel = (tickets: Ticket[], fileName: string = 'HPNow_GRC_Export.xlsx') => {
  // Flatten data for Excel
  const flatData = tickets.map(t => ({
    'Ticket ID': t.id,
    'Title': t.title,
    'Description': t.description,
    'Priority': t.priority,
    'State': t.state,
    'Assigned Agent': t.assignedToName,
    'Created Date': new Date(t.createdDate).toLocaleDateString(),
    'Duration (Hrs)': t.durationHours,
    'Category': t.category,
    'Risk Score': t.riskScore,
    'Compliance Status': t.complianceStatus,
    'Compliance Reason': t.complianceReason || 'N/A',
    'Sentiment Score': t.sentimentScore,
    'Sentiment Label': t.sentimentEvaluation?.label || 'Neutral',
    'Extracted Systems': t.extractedEntities?.systemNames.join(', ') || '',
    'Extracted Error Codes': t.extractedEntities?.errorCodes.join(', ') || '',
    'Is Anomaly': t.isAnomaly ? 'Yes' : 'No'
  }));

  const worksheet = XLSX.utils.json_to_sheet(flatData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Operational Data");
  XLSX.writeFile(workbook, fileName);
};
