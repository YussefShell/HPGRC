
export enum Priority {
  Critical = 'Critical',
  High = 'High',
  Moderate = 'Moderate',
  Low = 'Low'
}

export enum TicketState {
  Open = 'Open',
  InProgress = 'In Progress',
  Resolved = 'Resolved',
  Closed = 'Closed'
}

export enum ComplianceStatus {
  Compliant = 'Compliant',
  NonCompliant = 'Non-Compliant'
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  activeTickets: number;
  loadScore: number;
  status: 'Underutilized' | 'Balanced' | 'Overloaded';
  // Advanced Insights
  burnoutScore: number; // 0-100
  riskLoad: number; // Cumulative risk
  efficiency: number; // Avg duration
}

export interface Ticket {
  id: string; // T-XXXXX
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string; // Helper for logic
  priority: Priority;
  state: TicketState;
  createdDate: string; // ISO String
  closedDate?: string; // ISO String, optional
  durationHours: number;
  category: string;
  originalCategory: string;
  subCategory: string;

  // Computed GRC Fields
  riskScore: number;
  complianceStatus: ComplianceStatus;
  complianceReason?: string;
  sentimentScore: number;
  isAnomaly: boolean;
  predictedCategory?: string;

  // Neural Engine Enhancements
  extractedEntities?: {
    errorCodes: string[];
    systemNames: string[];
    userIds: string[];
  };
  sentimentEvaluation?: {
    score: number; // -1 to 1
    label: 'Positive' | 'Negative' | 'Neutral';
    confidence: number;
  };

  // Predictive SLA
  riskVelocity?: number; // Rate of risk accumulation
  predictedBreach?: boolean; // AI forecast
  hoursToBreach?: number;
}

export interface FilterCriteria {
  minRisk?: number;
  priority?: Priority[];
  state?: TicketState[];
  compliance?: ComplianceStatus;
  category?: string;
  originalCategory?: string;
  searchQuery?: string; // Semantic search
  durationRange?: string; // Drill-down for Aging Chart
}

export interface ForecastPoint {
  date: string;
  actual?: number;
  predicted: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface RebalanceMove {
  ticketId: string;
  ticketTitle: string;
  currentAgent: string;
  suggestedAgent: string;
  reason: string;
}

export interface CategoryRule {
  id: string;
  keywords: string[];
  boostTerms: string[];
  weight: number;
}

export interface ClusterAlert {
  id: string;
  topic: string;
  count: number;
  severity: 'Medium' | 'High' | 'Critical';
  exampleTickets: Ticket[];
  timestamp: string;
}
