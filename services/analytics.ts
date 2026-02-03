
import { Ticket, Priority, ComplianceStatus, Agent, TicketState, ForecastPoint, RebalanceMove, CategoryRule, ClusterAlert } from '../types';

// NOTE: We removed the top-level import of '@xenova/transformers' to prevent
// module resolution errors (like "buffer not found") from crashing the app on startup.
// It is now imported dynamically inside initSemanticEngine.

// --- Constants & Weights ---
const WEIGHTS = {
  PRIORITY: { [Priority.Critical]: 10, [Priority.High]: 7, [Priority.Moderate]: 4, [Priority.Low]: 1 },
  TIME_CRITICAL: 10, // > 48h
  TIME_HIGH: 7,      // > 24h
  TIME_MODERATE: 4,  // > 8h
};

// --- 1. Intelligent Classification Engine (Semantic + Rule Based) ---



export const OFFICIAL_TAXONOMY: CategoryRule[] = [
  {
    id: 'SOX Change Champion',
    keywords: ['champion', 'change champion'],
    boostTerms: ['change', 'update', 'new', 'replace'],
    weight: 2.5
  },
  {
    id: 'SOX Change Control Significance',
    keywords: ['significance', 'key', 'standard', 'retire', 'classification', 'non-key'],
    boostTerms: ['change', 'update', 'modify', 'control'],
    weight: 2.2
  },
  {
    id: 'SOX Change EPR ID',
    keywords: ['epr id', 'epr'],
    boostTerms: ['change', 'update', 'wrong', 'incorrect', 'finance id'],
    weight: 3.0
  },
  {
    id: 'SOX Control - Access Issue',
    keywords: ['access', 'authorization', 'permission', 'login', '401', 'error', 'denied', 'webi', 'folder', 'sso', 'pingid', 'unable to login', 'locked', 'cant access'],
    boostTerms: ['unable', 'cant', 'grant', 'approve', 'auditor', 'evidence'],
    weight: 2.2
  },
  {
    id: 'SOX Control Change Frequency',
    keywords: ['frequency'],
    boostTerms: ['change', 'update', 'quarterly', 'monthly', 'annual', 'semi-annual', 'weekly'],
    weight: 2.5
  },
  {
    id: 'SOX Control Change Mega or Major',
    keywords: ['mega', 'major'],
    boostTerms: ['change', 'update', 'move', 'process change', 'impact'],
    weight: 2.5
  },
  {
    id: 'SOX Control Owner Update',
    keywords: ['owner', 'performer', 'ownership', 'transfer', 'assign', 'role', 'spoc', 'l2', 'responsible', 'assignee'],
    boostTerms: ['change', 'update', 'replace', 'new', 'transition', 'leaving', 'left firm'],
    weight: 2.0
  },
  {
    id: 'SOX Control Title Update',
    keywords: ['control title', 'control description', 'control name', 'wording'],
    boostTerms: ['change', 'update', 'typo', 'rename', 'text', 'correction', 'match rcm'],
    weight: 2.0
  },
  {
    id: 'SOX Control Workflow Retrigger',
    keywords: ['retrigger', 'workflow', 'triggered', 'stuck', 'flow', 'rerun', 'activate', 'submission', 'submit', 'approve', 'reject'],
    boostTerms: ['audit', 'request', 'fail', 'issue', 'process', 'task', 'pending'],
    weight: 2.2
  },
];

// --- 1. Intelligent Classification Engine (Semantic + Rule Based) --- //

// --- Semantic Engine Singleton ---
let extractor: any = null;
let sentimentModel: any = null;
let taxonomyVectors: { id: string, vector: number[] }[] = [];

// Cosine Similarity Helper
function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Initialize the Feature Extraction Pipeline
export const initSemanticEngine = async () => {
  if (extractor && sentimentModel) return; // Already initialized

  console.log("Loading AI Models...");
  try {
    // Dynamic Import
    const { pipeline, env } = await import('@xenova/transformers');

    // Configure transformers
    env.allowLocalModels = false;
    env.useBrowserCache = true;

    // 1. Load Embedding Model
    if (!extractor) {
      console.log("Loading Embedding Model...");
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

      // Pre-compute embeddings for the taxonomy
      console.log("Embedding Taxonomy...");
      for (const rule of OFFICIAL_TAXONOMY) {
        const text = `${rule.id}. ${rule.keywords.join(' ')}. ${rule.boostTerms.join(' ')}`;
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        taxonomyVectors.push({
          id: rule.id,
          vector: Array.from(output.data)
        });
      }
    }

    // 2. Load Sentiment Model
    if (!sentimentModel) {
      console.log("Loading Sentiment Model...");
      sentimentModel = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    }

    console.log("Neural Engine Ready.");
  } catch (err) {
    console.error("Failed to load Neural Engine:", err);
  }
};

// --- Real-Time Learning: Refresh Embeddings without Reload ---
export const refreshTaxonomyEmbeddings = async (newRules: CategoryRule[]) => {
  if (!extractor) {
    console.warn("Cannot refresh embeddings: Model not loaded.");
    return;
  }

  console.log("Refining Semantic Model with new rules...", newRules.length);
  const newVectors: { id: string, vector: number[] }[] = [];

  for (const rule of newRules) {
    const text = `${rule.id}. ${rule.keywords.join(' ')}. ${rule.boostTerms.join(' ')}`;
    // Re-embed the concept
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    newVectors.push({
      id: rule.id,
      vector: Array.from(output.data)
    });
  }

  // Update the singleton
  taxonomyVectors = newVectors;
  console.log("Semantic Model Refined. New Logic Active.");
};

export const smartCategorize = async (ticket: Ticket, rules: CategoryRule[] = OFFICIAL_TAXONOMY): Promise<string> => {
  const descLower = ticket.description.toLowerCase();

  // --- 1. Rule-Based Scoring (Fast Check) ---
  let ruleBestCategory = 'Manual Triage';
  let ruleMaxScore = 0;

  rules.forEach(rule => {
    let score = 0;
    rule.keywords.forEach(kw => { if (descLower.includes(kw)) score += 1.0; });
    rule.boostTerms.forEach(bt => { if (descLower.includes(bt)) score += 0.5; });
    score *= rule.weight;

    if (score > ruleMaxScore) {
      ruleMaxScore = score;
      ruleBestCategory = rule.id;
    }
  });

  // --- 2. Semantic Vector Scoring (Deep Understanding) ---
  let semanticBestCategory = 'Manual Triage';
  let semanticMaxScore = 0;

  if (extractor && taxonomyVectors.length > 0) {
    try {
      // Combine title and description for embedding
      const ticketText = `${ticket.title}. ${ticket.description}`;
      const output = await extractor(ticketText, { pooling: 'mean', normalize: true });
      const ticketVector = Array.from(output.data) as number[];

      taxonomyVectors.forEach(tax => {
        const similarity = cosineSimilarity(ticketVector, tax.vector);
        if (similarity > semanticMaxScore) {
          semanticMaxScore = similarity;
          semanticBestCategory = tax.id;
        }
      });
    } catch (e) {
      console.warn("Semantic scoring failed for ticket, using rules only.", e);
    }
  }

  // --- 3. Hybrid Decision Logic ---

  // A. Strong Rule Match (Absolute certainty)
  if (ruleMaxScore > 3.0) {
    return ruleBestCategory;
  }

  // B. Strong Semantic Match (High confidence)
  // 0.45 is a solid threshold for MiniLM-L6
  if (semanticMaxScore > 0.45) {
    return semanticBestCategory;
  }

  // C. Moderate Rule Match
  if (ruleMaxScore > 1.5) {
    return ruleBestCategory;
  }

  // D. Fallback Logic
  // If no strong AI/Rule match, check if we should keep the original or title
  const titleRaw = ticket.title.trim();
  const titleLower = titleRaw.toLowerCase();
  const isGeneric = /other|general|support|request|issue|ticket|help/i.test(titleLower) || /other|general|support|request|issue|ticket|help/i.test(ticket.originalCategory.toLowerCase()) || ticket.originalCategory === 'Uncategorized';

  if (!isGeneric && ticket.originalCategory !== 'Uncategorized') {
    return ticket.originalCategory; // Trust original if specific
  }

  if (!isGeneric && titleRaw.length > 10 && titleRaw.length < 50) {
    return titleRaw; // Trust specific title
  }

  // E. Finally, if semantic is at least somewhat relevant (>0.35), use it over 'Manual Triage'
  if (semanticMaxScore > 0.35) {
    return semanticBestCategory;
  }

  return 'Manual Triage';
};

// --- 2. Dynamic Risk Scoring ---
export const calculateRiskScore = (ticket: Ticket): number => {
  // P_Weight
  const pWeight = WEIGHTS.PRIORITY[ticket.priority] || 1;

  // T_Weight
  let tWeight = 1;
  if (ticket.durationHours > 48) tWeight = WEIGHTS.TIME_CRITICAL;
  else if (ticket.durationHours > 24) tWeight = WEIGHTS.TIME_HIGH;
  else if (ticket.durationHours > 8) tWeight = WEIGHTS.TIME_MODERATE;

  // C_Weight (Complexity/Content)
  let cWeight = 1;
  const lowerDesc = ticket.description.toLowerCase();

  // Specific GRC Risk Indicators
  if (/l\d{5}|1\d{4}/.test(lowerDesc)) cWeight += 4; // Control ID present implies Compliance impact
  if (/financial|integrity|revenue/.test(lowerDesc)) cWeight += 3;
  if (/restricted|confidential/.test(lowerDesc)) cWeight += 2;
  if (/access|authorization/.test(lowerDesc)) cWeight += 2; // Access issues are risky

  // Formula: Risk = (P * 0.4) + (T * 0.3) + (C * 0.3)
  let risk = (pWeight * 0.4) + (tWeight * 0.3) + (cWeight * 0.3);

  // Cap at 10
  return Math.min(parseFloat(risk.toFixed(1)), 10);
};

// --- 3. Automated Audit & Compliance ---
export const checkCompliance = (ticket: Ticket): { status: ComplianceStatus, reason?: string } => {
  const lowerDesc = ticket.description.toLowerCase();
  const lowerTitle = ticket.title.toLowerCase();
  const category = ticket.category.toLowerCase();

  // SLA Critical Breach
  if (ticket.priority === Priority.Critical && ticket.durationHours > 48) {
    return { status: ComplianceStatus.NonCompliant, reason: 'SLA Critical Breach (>48h)' };
  }

  // SOD Conflict
  if (lowerDesc.includes('sod') || lowerDesc.includes('segregation') || lowerTitle.includes('sod')) {
    return { status: ComplianceStatus.NonCompliant, reason: 'Potential SOD Conflict' };
  }

  // Self-Assignment Risk
  if (lowerDesc.includes(ticket.assignedToName.toLowerCase()) && ticket.assignedToName.toLowerCase() !== 'unassigned') {
    return { status: ComplianceStatus.NonCompliant, reason: 'Self-Assignment Detected' };
  }

  // Approval Validation 
  const isAccessRequest = lowerTitle.includes('access') || category.includes('access');
  if (isAccessRequest && !lowerDesc.includes('approval') && !lowerDesc.includes('approved') && !lowerDesc.includes('manager') && !lowerDesc.includes('attached')) {
    return { status: ComplianceStatus.NonCompliant, reason: 'Missing Access Approval Evidence' };
  }

  // Master Data Changes need approval
  const isMasterData = lowerTitle.includes('owner') || lowerTitle.includes('performer') || category.includes('owner');
  if (isMasterData && !lowerDesc.includes('approval') && !lowerDesc.includes('agree') && !lowerDesc.includes('confirm') && !lowerDesc.includes('email attached')) {
    return { status: ComplianceStatus.NonCompliant, reason: 'Missing Role Change Confirmation' };
  }

  return { status: ComplianceStatus.Compliant };
};

// --- NER Helper ---
const extractEntities = (text: string) => {
  const errorCodes = (text.match(/[A-Z]{3}-\d{4,5}|ORA-\d+|SAP-\d+/g) || []);
  const userIds = (text.match(/\b[uU]\d{6,7}\b|[a-zA-Z]+\.[a-zA-Z]+@hp\.com/g) || []); // Corp ID or email

  // Simple System Name Extraction (Capitalized words after keyword or known systems)
  const systems = [];
  const knownSystems = ['SAP', 'Oracle', 'ServiceNow', 'Salesforce', 'Azure', 'AWS', 'Workday', 'Jira'];
  knownSystems.forEach(sys => {
    if (text.includes(sys)) systems.push(sys);
  });

  return {
    errorCodes: Array.from(new Set(errorCodes)),
    userIds: Array.from(new Set(userIds)),
    systemNames: Array.from(new Set(systems))
  };
};



// --- SLA Prediction Logic ---
export const predictBreachRisk = (ticket: Ticket): { riskVelocity: number, predictedBreach: boolean, hoursToBreach: number } => {
  // 1. Calculate Risk Velocity (Speed of risk accumulation)
  // Base velocity is 1.0 per hour.
  // Multipliers: High Priority (1.5x), Critical (2.0x), High Complexity (Risk > 7)

  let velocity = 1.0;
  if (ticket.priority === Priority.Critical) velocity *= 2.0;
  if (ticket.priority === Priority.High) velocity *= 1.5;
  if (ticket.riskScore > 7) velocity *= 1.3;

  // 2. Predict Time to Breach
  // Assume generic SLA: Critical=48h, High=96h, Mod=168h (1 week) 
  let slaHours = 168;
  if (ticket.priority === Priority.Critical) slaHours = 48;
  else if (ticket.priority === Priority.High) slaHours = 96;

  const currentAge = ticket.durationHours;
  const remainingSLA = slaHours - currentAge;

  // AI Prediction: If remaining SLA is less than (Avg Resolution Time * Complexity Factor)
  // Simple heuristic for now, could be ML model
  const complexityFactor = ticket.riskScore > 5 ? 1.5 : 1.0;
  const estTimeNeeded = 12 * complexityFactor; // Assume 12h baseline for complex tasks

  const predictedBreach = remainingSLA < estTimeNeeded;

  return {
    riskVelocity: parseFloat(velocity.toFixed(2)),
    predictedBreach,
    hoursToBreach: Math.max(0, parseFloat(remainingSLA.toFixed(1)))
  };
};

// --- 5. Workload Balancer Logic ---
export const analyzeSentimentAndAnomaly = async (ticket: Ticket): Promise<{
  sentiment: number,
  isAnomaly: boolean,
  sentimentEval: Ticket['sentimentEvaluation'],
  entities: Ticket['extractedEntities']
}> => {
  const lowerDesc = ticket.description.toLowerCase();

  // A. Entity Extraction (NER)
  const entities = extractEntities(ticket.description + " " + ticket.title);

  // B. Sentiment Analysis (Hybrid: Transformer + Fallback)
  let sentimentScore = 0;
  let label: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
  let confidence = 0;

  if (sentimentModel) {
    try {
      // Truncate to avoids token limit issues, first 512 chars usually contain the sentiment
      const result = await sentimentModel(ticket.description.slice(0, 500));
      // result shape: [{ label: 'POSITIVE'|'NEGATIVE', score: 0.99 }]
      const output = result[0];
      label = output.label === 'POSITIVE' ? 'Positive' : 'Negative';
      confidence = output.score;
      // Map to -1 to 1 scale
      sentimentScore = output.label === 'POSITIVE' ? output.score : -output.score;
    } catch (e) {
      console.warn("AI Sentiment failed", e);
    }
  } else {
    // Fallback Lexicon
    if (lowerDesc.includes('outage')) sentimentScore -= 0.9;
    if (lowerDesc.includes('fail') || lowerDesc.includes('error')) sentimentScore -= 0.5;
    if (lowerDesc.includes('urgent')) sentimentScore -= 0.3;
    if (lowerDesc.includes('thank') || lowerDesc.includes('great')) sentimentScore += 0.5;

    sentimentScore = Math.max(-1, Math.min(1, sentimentScore));
    label = sentimentScore > 0.2 ? 'Positive' : sentimentScore < -0.2 ? 'Negative' : 'Neutral';
    confidence = Math.abs(sentimentScore);
  }

  // C. Anomaly Flags
  let isAnomaly = false;
  // Mismatch: High neg sentiment but Low priority
  if (sentimentScore < -0.4 && (ticket.priority === Priority.Low || ticket.priority === Priority.Moderate)) {
    isAnomaly = true;
  }
  // Executive Interest
  if (/(ceo|cio|vp|board|director|cfo)/.test(lowerDesc)) {
    isAnomaly = true;
  }
  // High volume of entities (System panic?)
  if (entities.errorCodes.length > 2) isAnomaly = true;

  return {
    sentiment: sentimentScore,
    isAnomaly,
    sentimentEval: { score: sentimentScore, label, confidence },
    entities
  };
};

// --- 5. Workload Balancer Logic ---
export const calculateAgentLoad = (tickets: Ticket[], agents: string[]): Agent[] => {
  const agentMap = new Map<string, Agent>();

  // Initialize
  agents.forEach(name => {
    // Exclude 'Unassigned' from being considered an agent
    if (name.toLowerCase() === 'unassigned') return;

    agentMap.set(name, {
      id: name,
      name: name,
      role: 'Support Engineer',
      activeTickets: 0,
      loadScore: 0,
      status: 'Balanced',
      burnoutScore: 0,
      riskLoad: 0,
      efficiency: 0
    });
  });

  // Calculate Load
  tickets.forEach(t => {
    if (t.state === TicketState.Closed || t.state === TicketState.Resolved) {
      // For resolved tickets, track efficiency
      const agentName = t.assignedToName;
      let agent = agentMap.get(agentName);
      if (agent) {
        agent.efficiency = (agent.efficiency + t.durationHours) / 2; // Rolling avg approximation
      }
      return;
    }

    // Normalize agent name
    let agentName = t.assignedToName;
    if (agentName.toLowerCase() === 'unassigned') return; // Do not add load for unassigned tickets

    let agent = agentMap.get(agentName);
    if (!agent) {
      agent = {
        id: agentName,
        name: agentName,
        role: 'Support Engineer', // Default
        activeTickets: 0,
        loadScore: 0,
        status: 'Balanced',
        burnoutScore: 0,
        riskLoad: 0,
        efficiency: 0
      };
      agentMap.set(agentName, agent);
    }

    if (agent) {
      agent.activeTickets += 1;

      // Calculate Risk Load (Sum of Risk Scores)
      agent.riskLoad += t.riskScore;

      // Load Weight = Base(1) + PriorityAddon + (Risk/10)
      let priorityAddon = 0;
      if (t.priority === Priority.Critical) priorityAddon = 2;
      else if (t.priority === Priority.High) priorityAddon = 1;

      agent.loadScore += (1.0 + priorityAddon + (t.riskScore / 10));
    }
  });

  const agentList = Array.from(agentMap.values());
  const totalLoad = agentList.reduce((sum, a) => sum + a.loadScore, 0);
  const meanLoad = totalLoad / (agentList.length || 1);
  // Simple std dev approximation for this scale
  const variance = agentList.reduce((sum, a) => sum + Math.pow(a.loadScore - meanLoad, 2), 0) / (agentList.length || 1);
  const stdDev = Math.sqrt(variance) || 1; // Avoid divide by zero

  // Determine Status & Burnout
  return agentList.map(a => {
    if (a.loadScore > meanLoad + 0.5 * stdDev) a.status = 'Overloaded';
    else if (a.loadScore < meanLoad - 0.5 * stdDev) a.status = 'Underutilized';
    else a.status = 'Balanced';

    a.loadScore = parseFloat(a.loadScore.toFixed(2));

    // Burnout Score Algorithm
    // High Volume + High Risk = High Burnout
    // Max reasonable load ~ 15 tickets, Max risk load ~ 100
    const volFactor = Math.min(a.activeTickets / 15, 1);
    const riskFactor = Math.min(a.riskLoad / 80, 1);
    a.burnoutScore = Math.round(((volFactor * 0.4) + (riskFactor * 0.6)) * 100);

    return a;
  });
};

export const suggestRebalancing = (tickets: Ticket[], agents: Agent[]): RebalanceMove[] => {
  const moves: RebalanceMove[] = [];
  // Identify overloaded (load > mean + 0.5std)
  const overloaded = agents.filter(a => a.status === 'Overloaded');
  // Identify underutilized (load < mean - 0.5std)
  let potentialTargets = agents.filter(a => a.status === 'Underutilized');

  // Fallback: if no underutilized, use Balanced agents with lowest load to assist
  if (potentialTargets.length === 0) {
    potentialTargets = agents.filter(a => a.status === 'Balanced').sort((a, b) => a.loadScore - b.loadScore);
  } else {
    potentialTargets.sort((a, b) => a.loadScore - b.loadScore);
  }

  if (overloaded.length === 0 || potentialTargets.length === 0) return [];

  let targetIndex = 0;

  overloaded.forEach(sourceAgent => {
    const movableTickets = tickets.filter(t =>
      t.assignedToName === sourceAgent.name &&
      t.state !== TicketState.Closed &&
      t.state !== TicketState.Resolved &&
      t.priority !== Priority.Critical &&
      t.riskScore < 7
    ).sort((a, b) => a.riskScore - b.riskScore);

    // Heuristic: Move 2 tickets
    const ticketsToMove = movableTickets.slice(0, 2);

    ticketsToMove.forEach(ticket => {
      const targetAgent = potentialTargets[targetIndex];

      moves.push({
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        currentAgent: sourceAgent.name,
        suggestedAgent: targetAgent.name,
        reason: `Rebalance: Move low-risk (${ticket.riskScore}) item from overloaded agent.`
      });

      targetIndex = (targetIndex + 1) % potentialTargets.length;
    });
  });

  return moves;
};

// --- 6. Forecast Generator (Seasonal Trend Model) ---

export const generateForecast = (history: Ticket[]): ForecastPoint[] => {
  // 1. Group by Date
  const counts: Record<string, number> = {};
  if (history.length === 0) return [];

  // Find max date in dataset to avoid zero-filling future days
  let maxDateVal = 0;
  history.forEach(t => {
    const d = new Date(t.createdDate);
    if (isNaN(d.getTime())) return;
    const key = d.toISOString().split('T')[0];
    counts[key] = (counts[key] || 0) + 1;
    if (d.getTime() > maxDateVal) maxDateVal = d.getTime();
  });

  // Anchor to the latest data point
  const anchorDate = maxDateVal > 0 ? new Date(maxDateVal) : new Date();
  anchorDate.setHours(0, 0, 0, 0);

  // Build continuous timeline for analysis (Last 90 days for good seasonality)
  const timeline: { date: Date, val: number, dayOfWeek: number }[] = [];
  const lookbackDays = 90;

  for (let i = lookbackDays; i >= 0; i--) {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    timeline.push({ date: d, val: counts[key] || 0, dayOfWeek: d.getDay() });
  }

  // 2. Calculate Seasonality Indices (Day of Week Patterns)
  const daySums = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  timeline.forEach(p => {
    daySums[p.dayOfWeek] += p.val;
    dayCounts[p.dayOfWeek]++;
  });

  // Avoid divide by zero
  const dayAvgs = daySums.map((sum, i) => dayCounts[i] > 0 ? sum / dayCounts[i] : 0);
  const globalAvg = dayAvgs.reduce((a, b) => a + b, 0) / 7 || 1;
  const seasonalityIndices = dayAvgs.map(avg => avg / globalAvg);

  // 3. Calculate Current Baseline (Trend)
  // Weighted average of last 14 days to capture recent volume shifts
  const recentDays = timeline.slice(-14);
  const weightedSum = recentDays.reduce((acc, curr, i) => acc + (curr.val * (i + 1)), 0);
  const weightTotal = recentDays.reduce((acc, _, i) => acc + (i + 1), 0);
  const currentBaseline = weightedSum / (weightTotal || 1);

  // 4. Calculate Standard Deviation for Confidence Intervals
  const residuals = timeline.slice(-30).map(t => {
    const expected = currentBaseline * seasonalityIndices[t.dayOfWeek];
    return t.val - expected;
  });
  const variance = residuals.reduce((a, b) => a + (b * b), 0) / residuals.length;
  const stdDev = Math.sqrt(variance) || 1.0;

  // 5. Generate Output
  const result: ForecastPoint[] = [];

  // A. History (Visualization) - Show last 30 days
  const historyStartIdx = timeline.length - 30;
  for (let i = historyStartIdx; i < timeline.length; i++) {
    if (i < 0) continue;
    const t = timeline[i];
    result.push({
      date: t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actual: t.val,
      predicted: undefined,
      confidenceLower: undefined,
      confidenceUpper: undefined
    });
  }

  // B. Forecast (Next 14 Days)
  let nextDate = new Date(anchorDate);

  for (let i = 1; i <= 14; i++) {
    nextDate.setDate(nextDate.getDate() + 1);
    const dayOfWeek = nextDate.getDay();

    // Apply Seasonality to Baseline
    // Simple projection: Baseline * SeasonalityFactor
    let predVal = currentBaseline * seasonalityIndices[dayOfWeek];

    // Dampen extreme spikes (optional)
    if (seasonalityIndices[dayOfWeek] > 2.0) predVal *= 0.9;

    // Confidence expands slightly over time
    const margin = 1.96 * stdDev * (1 + (i * 0.05));

    result.push({
      date: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      predicted: Math.max(0, Math.round(predVal)),
      confidenceLower: Math.max(0, Math.round(predVal - margin)),
      confidenceUpper: Math.round(predVal + margin),
      actual: undefined
    });
  }

  return result;
}

// Updated to be Async
export const processTickets = async (rawTickets: Ticket[], rules: CategoryRule[] = OFFICIAL_TAXONOMY): Promise<Ticket[]> => {
  // We process sequentially or in parallel batches. 
  // For simplicity and to avoid browser lockup, we map to promises and Promise.all

  const processed = await Promise.all(rawTickets.map(async (t) => {
    // 1. Categorize (Async now)
    const category = await smartCategorize(t, rules);

    // Create a temp object with the category to pass to checkCompliance 
    // (since checkCompliance depends on category for approval logic)
    const tempT = { ...t, category };

    const risk = calculateRiskScore(tempT);
    const compliance = checkCompliance(tempT);
    const analysis = await analyzeSentimentAndAnomaly(tempT);

    // SLA Prediction
    const sla = predictBreachRisk({ ...tempT, riskScore: risk, durationHours: t.durationHours || 0 });

    return {
      ...t,
      category,
      originalCategory: t.originalCategory, // Preserved from ExcelService
      riskScore: risk,
      complianceStatus: compliance.status,
      complianceReason: compliance.reason,
      sentimentScore: analysis.sentiment,
      sentimentEvaluation: analysis.sentimentEval,
      extractedEntities: analysis.entities,
      isAnomaly: analysis.isAnomaly,
      riskVelocity: sla.riskVelocity,
      predictedBreach: sla.predictedBreach,
      hoursToBreach: sla.hoursToBreach
    };
  }));

  return processed;
  return processed;
};

// --- 8. Outage Radar (Cluster Detection) ---

export const detectOutageClusters = (tickets: Ticket[]): ClusterAlert[] => {
  const clusters: ClusterAlert[] = [];
  const openTickets = tickets.filter(t => t.state !== TicketState.Closed && t.state !== TicketState.Resolved);

  // 1. Group by significant keywords (simple extraction)
  const keywordMap: Record<string, Ticket[]> = {};
  const ignoredWords = ['issue', 'ticket', 'problem', 'request', 'please', 'help', 'check', 'need', 'access', 'user', 'system'];

  openTickets.forEach(t => {
    const words = t.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
    words.forEach(w => {
      if (w.length > 3 && !ignoredWords.includes(w)) {
        if (!keywordMap[w]) keywordMap[w] = [];
        keywordMap[w].push(t);
      }
    });
  });

  // 2. Identify dense clusters
  Object.entries(keywordMap).forEach(([keyword, group]) => {
    if (group.length >= 3) { // Threshold: 3 tickets
      // Check time density (e.g., created within last 4 hours)
      // For this demo, we assume the dataset is recent, so we just check count
      let severity: 'Medium' | 'High' | 'Critical' = 'Medium';
      if (group.length >= 5) severity = 'High';
      if (group.length >= 10) severity = 'Critical';

      clusters.push({
        id: `cluster-${keyword}-${Date.now()}`,
        topic: keyword,
        count: group.length,
        severity,
        exampleTickets: group.slice(0, 3), // Show first 3 examples
        timestamp: new Date().toISOString()
      });
    }
  });

  return clusters.sort((a, b) => b.count - a.count).slice(0, 3); // Top 3 clusters
};
// --- 7. Learning Loop (Feedback) ---
export const learnFromCorrection = (
  ticket: Ticket,
  newCategory: string,
  currentRules: CategoryRule[]
): CategoryRule[] => {
  // Deep copy to avoid mutation
  const updatedRules = JSON.parse(JSON.stringify(currentRules)) as CategoryRule[];

  // Find or Create Rule for new Category
  let targetRule = updatedRules.find(r => r.id === newCategory);

  if (!targetRule) {
    // Create new rule if it doesn't exist
    targetRule = {
      id: newCategory,
      keywords: [], // Will populate below
      boostTerms: [],
      weight: 2.0 // Default weight
    };
    updatedRules.push(targetRule);
  }

  // Extract potential keywords from Description (Naïve approach: specific unique words)
  // Better approach: User Manually adds keywords. 
  // Hybrid approach: We add the Ticket Title words as weak keywords
  const titleWords = ticket.title.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4 && !['issue', 'ticket', 'problem', 'request', 'please', 'help'].includes(w));

  // Add distinct words to boostTerms (safer than strict keywords)
  titleWords.forEach(w => {
    if (!targetRule?.keywords.includes(w) && !targetRule?.boostTerms.includes(w)) {
      targetRule?.boostTerms.push(w);
    }
  });

  // Slightly boost weight to reinforce
  targetRule.weight = parseFloat((targetRule.weight + 0.1).toFixed(1));

  return updatedRules;
};
