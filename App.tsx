
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Users,
  Search,
  BrainCircuit,
  FileText,
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Menu,
  X,
  Send,
  Tag,
  Filter,
  Upload,
  FileSpreadsheet,
  AlertOctagon,
  GraduationCap,
  Clock,
  Timer,
  BookOpen,
  Hourglass,
  ArrowRight,
  Wand2,
  ArrowRightLeft,
  MousePointerClick,
  MessageSquare,
  Sparkles,
  Download,
  Settings,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Activity,
  TrendingUp,
  Pencil,
  Cpu,
  Network,
  Cloud,
  Key,
  Database
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
  ComposedChart,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

import { Ticket, Priority, ComplianceStatus, Agent, TicketState, ForecastPoint, RebalanceMove, CategoryRule, ClusterAlert, FilterCriteria } from './types';
import {
  processTickets,
  calculateAgentLoad,
  generateForecast,
  OFFICIAL_TAXONOMY,
  suggestRebalancing,
  initSemanticEngine,
  learnFromCorrection,
  detectOutageClusters,
  refreshTaxonomyEmbeddings,
  smartCategorize
} from './services/analytics';
import { initSovereignAI, askSovereignAI, isAIReady } from './services/sovereign-ai';
import { saveAzureConfig, getAzureConfig, clearAzureConfig, askAzureAI, AzureConfig } from './services/azure-ai';
import { askData, generateExecutiveSummary, generateRagResponse } from './services/geminiService';
import { parseExcelFile, exportToExcel } from './services/excelService';

// --- Components ---

const HPLogo = () => (
  <img
    src="https://upload.wikimedia.org/wikipedia/commons/a/ad/HP_logo_2012.svg"
    alt="HP Logo"
    className="w-10 h-10"
  />
);

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen, hasData }: any) => {
  const menuItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'operations', label: 'Ticket Operations', icon: FileText },
    { id: 'workload', label: 'Workload Balancer', icon: Users },
    { id: 'logic', label: 'Logic & Rules', icon: BookOpen },
  ];

  if (!hasData) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Panel */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 glass-sidebar transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <HPLogo />
          <div>
            <h1 className="font-bold text-lg tracking-tight">HPNow GRC</h1>
            <p className="text-xs text-slate-400">Ver 3.0 Enterprise</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === item.id
                ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/25'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-4">
          <div className="glass-panel p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2 text-brand-success">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">System Active</span>
            </div>
            <p className="text-xs text-slate-400">AI Logic Engine v3.0 running. Monitoring input streams.</p>
          </div>

          {/* UH Disclaimer */}
          <div className="text-center pt-2 border-t border-white/5">
            <div className="flex items-center justify-center gap-1.5 mb-1.5 text-slate-500">
              <GraduationCap className="w-4 h-4" />
              <span className="text-[10px] uppercase font-bold tracking-wider">University of Houston</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              This tool was designed by <br />
              <span className="text-slate-300 font-medium">UH IISE Capstone Team</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

const MetricCard = ({ title, value, subtext, trend, icon: Icon, color }: any) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon className="w-16 h-16" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-4 text-slate-400">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="flex items-center gap-2 text-xs">
        {trend !== undefined && (
          <span className={trend > 0 ? 'text-brand-success' : 'text-brand-danger'}>
            {trend > 0 ? '↑' : trend < 0 ? '↓' : ''} {Math.abs(trend)}%
          </span>
        )}
        <span className="text-slate-500">{subtext}</span>
      </div>
    </div>
  </div>
);

const RiskBadge = ({ score }: { score: number }) => {
  let color = 'bg-brand-success';
  if (score >= 8) color = 'bg-brand-danger';
  else if (score >= 5) color = 'bg-brand-warning';

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className={`font-mono font-bold ${score >= 8 ? 'text-brand-danger' : score >= 5 ? 'text-brand-warning' : 'text-brand-success'}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
};

const PriorityBadge = ({ priority }: { priority: Priority }) => {
  let styles = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  let icon = <Activity className="w-3 h-3" />;

  if (priority === Priority.Critical) {
    styles = 'bg-red-500/10 text-red-400 border-red-500/20';
    icon = <AlertOctagon className="w-3 h-3" />;
  }
  else if (priority === Priority.High) {
    styles = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    icon = <AlertTriangle className="w-3 h-3" />;
  }
  else if (priority === Priority.Moderate) {
    styles = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    icon = <Activity className="w-3 h-3" />;
  }
  else if (priority === Priority.Low) {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    icon = <CheckCircle className="w-3 h-3" />;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles}`}>
      {icon}
      {priority}
    </span>
  );
};

const ComplianceBadge = ({ status }: { status: ComplianceStatus }) => {
  const isCompliant = status === ComplianceStatus.Compliant;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isCompliant
      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
      : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
      {isCompliant ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {status}
    </span>
  );
};

// Helper function to apply filters
const applyFilter = (tickets: Ticket[], filter: FilterCriteria | null) => {
  if (!filter) return tickets;
  return tickets.filter(t => {
    let match = true;
    if (filter.minRisk && t.riskScore < filter.minRisk) match = false;
    if (filter.priority && !filter.priority.includes(t.priority)) match = false;
    if (filter.state && !filter.state.includes(t.state)) match = false;
    if (filter.compliance && t.complianceStatus !== filter.compliance) match = false;
    if (filter.category && t.category !== filter.category) match = false;
    if (filter.originalCategory && t.originalCategory !== filter.originalCategory) match = false;
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) match = false;
    }
    if (filter.durationRange) {
      const range = filter.durationRange;
      if (range === '< 24h' && t.durationHours >= 24) match = false;
      else if (range === '1-3 Days' && (t.durationHours < 24 || t.durationHours >= 72)) match = false;
      else if (range === '3-7 Days' && (t.durationHours < 72 || t.durationHours >= 168)) match = false;
      else if (range === '> 7 Days' && t.durationHours < 168) match = false;
    }
    return match;
  });
};

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ask Data State
  const [askQuery, setAskQuery] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCriteria | null>(null);

  // RAG State
  const [ragResponse, setRagResponse] = useState<string | null>(null);

  // Scroll Ref for Drill-down
  const gridRef = useRef<HTMLDivElement>(null);

  // AI Summary
  const [aiSummary, setAiSummary] = useState("Awaiting data upload for analysis...");

  // Optimization State
  const [rebalanceMoves, setRebalanceMoves] = useState<RebalanceMove[]>([]);

  // Advanced Features State
  const [clusterAlerts, setClusterAlerts] = useState<ClusterAlert[]>([]);
  const [chartFilter, setChartFilter] = useState<{ type: 'AGENT' | 'PRIORITY' | 'RISK', value: string } | null>(null);

  // Sovereign AI State
  const [useStrongAI, setUseStrongAI] = useState(false);
  const [aiEngineStatus, setAiEngineStatus] = useState<string | null>(null);
  const [isInitializingAI, setIsInitializingAI] = useState(false);

  // Azure AI State
  const [azureConfig, setAzureConfig] = useState<AzureConfig | null>(getAzureConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [tempAzureConfig, setTempAzureConfig] = useState<AzureConfig>({ apiKey: '', endpoint: '', deployment: '' });


  // Dynamic Rules State
  const [rules, setRules] = useState<CategoryRule[]>(OFFICIAL_TAXONOMY);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<CategoryRule>>({
    id: '',
    keywords: [],
    boostTerms: [],
    weight: 2.0
  });

  // Initialize AI Model
  useEffect(() => {
    const init = async () => {
      // We initialize silently in the background
      await initSemanticEngine();
    };
    init();
  }, []);
  // Handler for file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    // Ensure model is ready before processing, or at least started
    setModelLoading(true);

    try {
      // 1. Parse Excel
      const rawTickets = await parseExcelFile(file);

      // 2. Run GRC Intelligence Pipeline (Risk, Compliance, Categories)
      // This is now async because of embeddings
      const processed = await processTickets(rawTickets, rules);

      // 3. Extract unique agents (Filtering out unassigned done in analytics.ts)
      const agentList = Array.from(new Set(processed.map(t => t.assignedToName))) as string[];
      const loadedAgents = calculateAgentLoad(processed, agentList);

      // 4. Forecast
      const forecast = generateForecast(processed);

      // 5. Detect Outage Clusters
      const clusters = detectOutageClusters(processed);
      setClusterAlerts(clusters);

      setTickets(processed);
      setAgents(loadedAgents);
      setForecastData(forecast);

      // 5. Generate AI Summary
      const highRisk = processed.filter(t => t.riskScore >= 7).length;
      const nonCompliant = processed.filter(t => t.complianceStatus === ComplianceStatus.NonCompliant).length;
      const catCounts: Record<string, number> = {};
      processed.forEach(t => catCounts[t.category] = (catCounts[t.category] || 0) + 1);
      const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

      setAiSummary("Analyzing dataset...");
      generateExecutiveSummary(highRisk, nonCompliant, topCat).then(setAiSummary);

    } catch (error) {
      console.error(error);
      alert("Error parsing file or initializing AI model.");
    } finally {
      setIsUploading(false);
      setModelLoading(false);
    }
  };

  const handleGenerateOptimization = () => {
    const moves = suggestRebalancing(tickets, agents);
    setRebalanceMoves(moves);
    if (moves.length === 0) {
      alert("Workload is balanced. No moves required.");
    }
  };

  const handleApplyRebalancing = () => {
    const newTickets = tickets.map(t => {
      const move = rebalanceMoves.find(m => m.ticketId === t.id);
      if (move) {
        return { ...t, assignedToName: move.suggestedAgent };
      }
      return t;
    });
    setTickets(newTickets);

    // Recalculate agents load
    const agentList = Array.from(new Set(newTickets.map(t => t.assignedToName))) as string[];
    const loadedAgents = calculateAgentLoad(newTickets, agentList);

    setAgents(loadedAgents);
    setRebalanceMoves([]);
    alert("Rebalancing applied successfully!");
  };

  // Filter Logic using Helper
  // Filter Logic (Includes Drill-Down)
  const filteredTickets = useMemo(() => {
    let result = tickets;

    // Apply Chart Drill-Down Filter
    if (chartFilter) {
      if (chartFilter.type === 'AGENT') {
        result = result.filter(t => t.assignedToName === chartFilter.value);
      }
    }

    // Apply Search Filter
    if (activeFilter?.searchQuery) {
      const q = activeFilter.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [tickets, activeFilter, chartFilter]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.category))).sort();
  }, [tickets]);

  const uniqueOriginalCategories = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.originalCategory))).sort();
  }, [tickets]);

  // Workload Analysis Data
  const workloadData = useMemo(() => {
    return agents.map(agent => ({
      name: agent.name.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()), // humanize
      activeTickets: agent.activeTickets,
      loadScore: agent.loadScore,
      status: agent.status
    })).sort((a, b) => b.loadScore - a.loadScore);
  }, [agents]);

  const handleAskData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuery.trim()) return;

    setIsAsking(true);
    setRagResponse(null);

    // 1. Get Structured Filter from Query
    const filter = await askData(askQuery);

    // 2. Set the UI filter (this triggers visual filtering on the grid)
    if (filter) {
      setActiveFilter(filter);
    }

    // 3. Determine the subset of tickets to send to RAG
    // If filter exists, use filtered set. If null (general question), use all tickets.
    const contextTickets = applyFilter(tickets, filter);

    // 4. Generate Response
    if (useStrongAI) {
      const ticketContext = contextTickets.slice(0, 30).map(t =>
        `ID: ${t.id}, Title: ${t.title}, Risk: ${t.riskScore}, Status: ${t.state}`
      ).join('\n');

      const systemPrompt = `You are an expert GRC Analyst assistant. You have access to the following local ticket data:\n\n${ticketContext}\n\nAnswer the user's question based strictly on this data. Be concise and professional.`;

      if (azureConfig) {
        // Azure Mode
        try {
          await askAzureAI(systemPrompt, askQuery, (partial) => setRagResponse(partial));
        } catch (e) {
          console.error(e);
          setRagResponse("Error calling Azure AI. Check your settings.");
        }
      } else if (isAIReady()) {
        // Local Sovereign Mode
        await askSovereignAI(systemPrompt, askQuery, (partial) => {
          setRagResponse(partial);
        });
      }
    } else {
      // Classic RAG (Regex/Logic)
      const narrative = await generateRagResponse(askQuery, contextTickets);
      setRagResponse(narrative);
    }

    setIsAsking(false);
  };

  const updateFilter = (key: keyof FilterCriteria, value: any) => {
    setActiveFilter(prev => {
      const newFilter = prev ? { ...prev } : {};

      if (!value) {
        delete newFilter[key];
      } else {
        if (key === 'priority') newFilter.priority = [value];
        else if (key === 'state') newFilter.state = [value];
        else (newFilter as any)[key] = value;
      }
      return Object.keys(newFilter).length > 0 ? newFilter : null;
    });
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setAskQuery('');
    setRagResponse(null);
  };

  // Drill-down Handler
  const handleChartClick = (type: 'category' | 'priority' | 'durationRange', value: string) => {
    // If priority, we need to pass it as an array to match FilterCriteria
    if (type === 'priority') {
      updateFilter(type, value); // updateFilter handles simple values for 'priority' case by wrapping in array logic inside
    } else {
      updateFilter(type, value);
    }

    // Smooth scroll to the grid
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const stats = useMemo(() => {
    const total = tickets.length;
    const critical = tickets.filter(t => t.priority === Priority.Critical).length;
    const nonCompliant = tickets.filter(t => t.complianceStatus === ComplianceStatus.NonCompliant).length;
    const avgRisk = tickets.reduce((acc, t) => acc + t.riskScore, 0) / total || 0;

    // Calculate Mean Time To Resolve (MTTR)
    const closedTickets = tickets.filter(t => t.state === TicketState.Closed || t.state === TicketState.Resolved);
    const totalDuration = closedTickets.reduce((acc, t) => acc + t.durationHours, 0);
    const avgDurationHours = closedTickets.length > 0 ? totalDuration / closedTickets.length : 0;

    // Resolution Efficiency (< 24h)
    const resolvedFast = closedTickets.filter(t => t.durationHours <= 24).length;
    const efficiencyRate = closedTickets.length > 0 ? (resolvedFast / closedTickets.length) * 100 : 0;

    return {
      total,
      critical,
      nonCompliant,
      avgRisk,
      mttr: avgDurationHours,
      efficiencyRate
    };
  }, [tickets]);

  const durationStats = useMemo(() => {
    const closedTickets = tickets.filter(t => t.state === TicketState.Closed || t.state === TicketState.Resolved);
    const openTickets = tickets.filter(t => t.state !== TicketState.Closed && t.state !== TicketState.Resolved);

    // Avg Resolution by Category
    const categoryDurations: Record<string, { total: number, count: number }> = {};
    closedTickets.forEach(t => {
      if (!categoryDurations[t.category]) categoryDurations[t.category] = { total: 0, count: 0 };
      categoryDurations[t.category].total += t.durationHours;
      categoryDurations[t.category].count++;
    });

    const mttrByCategory = Object.entries(categoryDurations)
      .map(([name, data]) => ({ name, avgHours: Math.round(data.total / data.count) }))
      .sort((a, b) => b.avgHours - a.avgHours) // Descending
      .slice(0, 10); // Top 10 longest

    // Avg Resolution by Priority
    const priorityDurations: Record<string, { total: number, count: number }> = {};
    closedTickets.forEach(t => {
      if (!priorityDurations[t.priority]) priorityDurations[t.priority] = { total: 0, count: 0 };
      priorityDurations[t.priority].total += t.durationHours;
      priorityDurations[t.priority].count++;
    });

    const mttrByPriority = Object.entries(priorityDurations)
      .map(([name, data]) => ({ name, avgHours: Math.round(data.total / data.count) }));

    // Oldest Open Tickets
    const oldestOpen = [...openTickets]
      .sort((a, b) => b.durationHours - a.durationHours)
      .slice(0, 5);

    return { mttrByCategory, mttrByPriority, oldestOpen };
  }, [tickets]);

  // Aging Analysis for Chart
  const agingData = useMemo(() => {
    const buckets = {
      '< 24h': 0,
      '1-3 Days': 0,
      '3-7 Days': 0,
      '> 7 Days': 0
    };

    // Only look at tickets that are NOT closed/resolved
    const openTickets = tickets.filter(t => t.state !== TicketState.Closed && t.state !== TicketState.Resolved);

    openTickets.forEach(t => {
      if (t.durationHours < 24) buckets['< 24h']++;
      else if (t.durationHours < 72) buckets['1-3 Days']++;
      else if (t.durationHours < 168) buckets['3-7 Days']++;
      else buckets['> 7 Days']++;
    });

    return Object.entries(buckets).map(([name, count]) => ({ name, count }));
  }, [tickets]);

  // --- Render Empty State if No Data ---
  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl border-t-4 border-t-brand-accent text-center relative overflow-hidden">
          {/* Background Decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500" />

          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <HPLogo />
          </div>

          <h1 className="text-2xl font-bold mb-2">HPNow GRC 3.0</h1>
          <p className="text-slate-400 mb-8">Secure Command Center</p>

          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <FileSpreadsheet className="w-10 h-10 text-slate-500 group-hover:text-brand-accent mx-auto mb-4 transition-colors" />
            <h3 className="font-medium text-slate-200">Upload Ticket Dataset</h3>
            <p className="text-xs text-slate-500 mt-2">Supports .xlsx, .xls</p>
            <p className="text-xs text-slate-600 mt-4">We will auto-detect columns: Description, Priority, Assignee, etc.</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />

          <div className="mt-8 text-center">
            <p className="text-[10px] text-slate-500">
              This tool was designed by <span className="text-slate-400 font-medium">UH IISE Capstone Team</span>
            </p>
          </div>

          {isUploading && (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 animate-pulse">
              <div className="flex items-center gap-3 text-brand-accent">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {modelLoading ? 'Initializing Semantic Model (This happens once)...' : 'Processing & Categorizing...'}
                </span>
              </div>
              {modelLoading && <p className="text-[10px] text-slate-500">Downloading 20MB embedding model...</p>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Main App Render ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} hasData={true} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header / Ask Data Bar */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#020617]/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 flex-1">
            <button
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Ask Data Input */}
            <div className="relative w-full max-w-2xl group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                {isAsking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-accent border-t-transparent"></div>
                ) : (
                  <BrainCircuit className="w-5 h-5 text-brand-accent" />
                )}
              </div>

              <form onSubmit={handleAskData}>
                <div className="flex bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-brand-accent/50 transition-all">
                  <input
                    type="text"
                    className="flex-1 bg-transparent py-2.5 pl-10 pr-4 text-sm focus:outline-none placeholder:text-slate-500"
                    placeholder={
                      azureConfig ? "Ask Azure OpenAI (Enterprise Mode)" :
                        (useStrongAI ? "Ask Strong AI (Local LLM)" : "Ask Data (Standard Analysis)")
                    }
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                  />

                  {/* Strong AI Toggle */}
                  <div className="flex items-center gap-2 pr-2 border-l border-white/10 pl-2 bg-black/20">
                    <button
                      type="button"
                      onClick={() => {
                        if (azureConfig) {
                          // If Azure is configured, simple toggle
                          setUseStrongAI(!useStrongAI);
                        } else {
                          // Local Logic
                          if (!isAIReady() && !isInitializingAI) {
                            // First time activation
                            setUseStrongAI(true);
                            setIsInitializingAI(true);
                            initSovereignAI((status) => setAiEngineStatus(status))
                              .then(() => {
                                setAiEngineStatus(null);
                                setIsInitializingAI(false);
                              })
                              .catch(() => {
                                setUseStrongAI(false);
                                setIsInitializingAI(false);
                                setAiEngineStatus(null);
                              });
                          } else {
                            setUseStrongAI(!useStrongAI);
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${useStrongAI
                        ? (azureConfig ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]' : 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]')
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                      title={azureConfig ? "Azure Enterprise Mode" : (isAIReady() ? "Local LLM Active" : "Click to load Local LLM")}
                    >
                      {isInitializingAI ? (
                        <span className="animate-pulse">{aiEngineStatus || 'Loading...'}</span>
                      ) : (
                        <>
                          {azureConfig ? <Cloud className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                          {useStrongAI ? (azureConfig ? 'Azure AI' : 'Local AI') : 'Std AI'}
                        </>
                      )}
                    </button>

                    {/* Settings Button */}
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="p-1.5 hover:bg-white/10 rounded text-slate-500 hover:text-white transition-colors"
                      title="AI Settings"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hidden">
                  <Send className="w-3 h-3 text-white" />
                </button>
              </form>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTickets([])} // Reset to upload screen
                className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> New Upload
              </button>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 border-2 border-white/10" />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">

          {/* Active Filter Banner */}
          {activeFilter && (
            <div className="mb-6 flex items-center justify-between bg-brand-accent/10 border border-brand-accent/20 px-4 py-3 rounded-xl animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-brand-accent" />
                <div>
                  <p className="text-sm font-medium text-brand-accent">Active Filter Applied</p>
                  <p className="text-xs text-slate-400">
                    {activeFilter.searchQuery ? `Query: "${askQuery}"` :
                      activeFilter.durationRange ? `Duration: ${activeFilter.durationRange}` :
                        activeFilter.category ? `Category: ${activeFilter.category}` :
                          activeFilter.priority ? `Priority: ${activeFilter.priority}` :
                            'Manual filters applied.'}
                  </p>
                </div>
              </div>
              <button onClick={clearFilter} className="p-2 hover:bg-brand-accent/20 rounded-lg text-brand-accent">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Narrative AI Response (RAG) */}
          {ragResponse && (
            <div className="mb-8 glass-panel rounded-2xl p-0 border-l-4 border-l-indigo-500 overflow-hidden animate-in fade-in slide-in-from-top-4">
              <div className="p-4 bg-indigo-500/10 border-b border-white/5 flex items-center gap-3">
                <div className="bg-indigo-500/20 p-2 rounded-lg">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-indigo-300">AI Narrative Insight</h3>
              </div>
              <div className="p-6">
                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{ragResponse}</p>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Executive Summary */}
              {!ragResponse && (
                <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> AI Executive Brief
                  </h3>
                  <p className="text-lg leading-relaxed text-slate-200">
                    {aiSummary}
                  </p>
                </div>
              )}

              {/* KPI Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Volume"
                  value={stats.total}
                  subtext="Records Loaded"
                  icon={FileText}
                  color="text-blue-500"
                />
                <MetricCard
                  title="Avg Risk Score"
                  value={stats.avgRisk.toFixed(1)}
                  subtext="Risk Threshold 5.0"
                  trend={0}
                  icon={Activity}
                  color="text-orange-500"
                />
                <MetricCard
                  title="Avg Resolution"
                  value={`${Math.round(stats.mttr)}h`}
                  subtext="Global MTTR"
                  trend={0}
                  icon={Clock}
                  color="text-emerald-400"
                />
                <MetricCard
                  title="Efficiency"
                  value={`${stats.efficiencyRate.toFixed(1)}%`}
                  subtext="Resolved < 24h"
                  trend={0}
                  icon={Timer}
                  color="text-cyan-400"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl h-[400px] flex flex-col">
                  <h3 className="font-bold text-lg mb-6">SmartForecaster: Volume Prediction</h3>
                  <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <defs>
                          <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                          itemStyle={{ color: '#cbd5e1' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="actual" stroke="#94a3b8" fill="transparent" strokeWidth={2} name="Actual Volume" />
                        <Area type="monotone" dataKey="predicted" stroke="#3b82f6" fill="url(#colorPred)" strokeWidth={2} name="AI Prediction" strokeDasharray="5 5" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl h-[400px] relative flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      Open Ticket Aging
                      <MousePointerClick className="w-4 h-4 text-slate-500" />
                    </h3>
                  </div>
                  <div className="flex-1 min-h-0 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                          cursor={{ fill: '#ffffff05' }}
                        />
                        <Bar
                          dataKey="count"
                          name="Open Tickets"
                          radius={[4, 4, 0, 0]}
                          onClick={(data) => handleChartClick('durationRange', data.name)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {agingData.map((entry, index) => {
                            // Dynamic coloring based on severity of age
                            let color = '#3b82f6'; // < 24h
                            if (entry.name === '1-3 Days') color = '#fbbf24';
                            if (entry.name === '3-7 Days') color = '#f97316';
                            if (entry.name === '> 7 Days') color = '#ef4444';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="absolute bottom-4 right-6 text-[10px] text-slate-500 italic">Click bars to filter grid</p>
                </div>
              </div>

              {/* NEW: Workforce & Predictive Intelligence */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* 1. Agent Performance Matrix (Scatter) */}
                <div className="lg:col-span-3 glass-panel p-6 rounded-2xl relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">Agent Performance Matrix</h3>
                      <p className="text-xs text-slate-400">Volume vs. Risk Load • Identify Burnout Risks</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">High Burnout</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Balanced</span>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis type="number" dataKey="activeTickets" name="Volume" unit=" tix" stroke="#64748b" fontSize={12} />
                        <YAxis type="number" dataKey="riskLoad" name="Risk Load" stroke="#64748b" fontSize={12} />
                        <ZAxis type="number" dataKey="efficiency" range={[50, 400]} name="Efficiency" />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl">
                                <p className="font-bold text-white mb-1">{data.name}</p>
                                <div className="text-xs text-slate-300 space-y-1">
                                  <div>Volume: <span className="text-white">{data.activeTickets}</span></div>
                                  <div>Risk Load: <span className="text-orange-400">{data.riskLoad.toFixed(1)}</span></div>
                                  <div>Burnout Score: <span className={`${data.burnoutScore > 70 ? 'text-red-400' : 'text-emerald-400'}`}>{data.burnoutScore}%</span></div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Scatter name="Agents" data={agents} fill="#8884d8">
                          {agents.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.burnoutScore > 70 ? '#ef4444' : entry.burnoutScore > 40 ? '#f59e0b' : '#10b981'} />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* NEW: Duration & Efficiency Section */}
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Hourglass className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-lg text-white">Resolution & Duration Analytics</h3>
                    <p className="text-sm text-slate-400">Deep dive into resolution times and bottlenecks.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* 1. MTTR By Category - Interactive */}
                  <div className="lg:col-span-2 glass-panel !bg-black/20 p-4 rounded-xl border-0 h-[320px] relative group flex flex-col">
                    <h4 className="font-bold text-sm mb-4 text-slate-300 flex items-center gap-2">
                      Avg Resolution Time by Category (Hours)
                      <MousePointerClick className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h4>
                    <div className="flex-1 min-h-0 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={durationStats.mttrByCategory} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                          <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={180} tickLine={false} axisLine={false} interval={0} />
                          <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                          <Bar
                            dataKey="avgHours"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                            name="Avg Hours"
                            onClick={(data) => handleChartClick('category', data.name)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 2. Oldest Tickets */}
                  <div className="glass-panel !bg-black/20 p-4 rounded-xl border-0 h-[320px] overflow-hidden flex flex-col">
                    <h4 className="font-bold text-sm mb-4 text-slate-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Oldest Open Tickets
                    </h4>
                    <div className="flex-1 overflow-auto pr-2">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500 font-medium border-b border-white/10">
                          <tr>
                            <th className="pb-2">ID</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2 text-right">Age</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {durationStats.oldestOpen.map(t => (
                            <tr key={t.id} className="group hover:bg-white/5">
                              <td className="py-2.5 font-medium text-slate-300">{t.id}</td>
                              <td className="py-2.5 text-slate-400 truncate max-w-[100px]" title={t.category}>{t.category}</td>
                              <td className="py-2.5 text-right font-bold text-red-400">{t.durationHours}h</td>
                            </tr>
                          ))}
                          {durationStats.oldestOpen.length === 0 && (
                            <tr><td colSpan={3} className="py-4 text-center text-slate-500">No open tickets.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 3. MTTR By Priority (Small) - Interactive */}
                  <div className="lg:col-span-3 glass-panel !bg-black/20 p-4 rounded-xl border-0">
                    <h4 className="font-bold text-sm mb-4 text-slate-300 flex items-center gap-2">
                      Resolution Speed by Priority
                      <span className="text-[10px] text-slate-500 font-normal italic">(Click to filter)</span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {durationStats.mttrByPriority.map((item) => (
                        <div
                          key={item.name}
                          className="bg-white/5 p-3 rounded-lg text-center cursor-pointer hover:bg-white/10 transition-colors border border-transparent hover:border-white/10"
                          onClick={() => handleChartClick('priority', item.name)}
                        >
                          <span className={`text-xs font-bold uppercase ${item.name === 'Critical' ? 'text-red-400' :
                            item.name === 'High' ? 'text-orange-400' :
                              item.name === 'Moderate' ? 'text-blue-400' : 'text-emerald-400'
                            }`}>{item.name}</span>
                          <div className="text-xl font-bold mt-1 text-slate-200">{item.avgHours}h</div>
                          <div className="text-[10px] text-slate-500">Avg Time</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {(activeTab === 'operations' || activeTab === 'dashboard') && activeTab !== 'dashboard' && (
            <div className="glass-panel rounded-2xl overflow-hidden flex flex-col h-full" ref={gridRef}>
              <div className="p-6 border-b border-white/10 flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="font-bold text-xl">Operational Ticket Grid</h2>
                  <span className="text-xs text-slate-400 bg-white/5 px-3 py-1 rounded-full">{filteredTickets.length} Records Found</span>
                  <button
                    onClick={() => exportToExcel(filteredTickets, `HPNow_GRC_Export_${new Date().toISOString().split('T')[0]}.xlsx`)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all ml-4"
                    title="Export grid data to Excel"
                  >
                    <Download className="w-4 h-4" />
                    Export to Excel
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 mr-2" />

                  {/* Original Category Filter */}
                  <select
                    className="bg-[#0f172a] border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-accent text-slate-300 min-w-[160px]"
                    value={activeFilter?.originalCategory || ''}
                    onChange={(e) => updateFilter('originalCategory', e.target.value)}
                  >
                    <option value="">All Original Categories</option>
                    {uniqueOriginalCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Smart Category Filter */}
                  <select
                    className="bg-[#0f172a] border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-accent text-slate-300 min-w-[160px]"
                    value={activeFilter?.category || ''}
                    onChange={(e) => updateFilter('category', e.target.value)}
                  >
                    <option value="">All Smart Categories</option>
                    {uniqueCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Priority Filter */}
                  <select
                    className="bg-[#0f172a] border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-accent text-slate-300 min-w-[120px]"
                    value={activeFilter?.priority?.[0] || ''}
                    onChange={(e) => updateFilter('priority', e.target.value)}
                  >
                    <option value="">All Priorities</option>
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  {/* Search Input */}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Search tickets, IDs, or issues..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-1.5 text-sm text-white focus:outline-none focus:border-brand-accent transition-colors min-w-[200px]"
                      value={activeFilter?.searchQuery || ''}
                      onChange={(e) => updateFilter('searchQuery', e.target.value)}
                    />
                    <Search className="absolute left-3 w-4 h-4 text-slate-400" />
                  </div>

                  {/* State Filter */}
                  <select
                    className="bg-[#0f172a] border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-accent text-slate-300 min-w-[120px]"
                    value={activeFilter?.state?.[0] || ''}
                    onChange={(e) => updateFilter('state', e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    {Object.values(TicketState).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Compliance Filter */}
                  <select
                    className="bg-[#0f172a] border border-white/10 rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:border-brand-accent text-slate-300 min-w-[140px]"
                    value={activeFilter?.compliance || ''}
                    onChange={(e) => updateFilter('compliance', e.target.value)}
                  >
                    <option value="">All Compliance</option>
                    {Object.values(ComplianceStatus).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-white/5 font-medium text-slate-100 uppercase text-xs tracking-wider sticky top-0 backdrop-blur-md z-10">
                    <tr>
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Risk Score</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 w-1/4">Description</th>
                      <th className="px-6 py-4">Original Category</th>
                      <th className="px-6 py-4">Smart Category</th>
                      <th className="px-6 py-4">Compliance</th>
                      <th className="px-6 py-4">Assignee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTickets.map((t) => {
                      // Logic for highlighting re-classified tickets
                      const isRecategorized = t.category !== t.originalCategory && t.originalCategory !== 'Uncategorized';
                      const highlightClass = isRecategorized ? 'bg-brand-accent/5' : 'hover:bg-white/5';
                      const borderClass = isRecategorized ? 'border-l-brand-accent' : 'border-l-transparent';

                      return (
                        <tr key={t.id} className={`${highlightClass} transition-colors border-l-2 ${borderClass} relative group`}>
                          <td className="px-6 py-4 font-medium text-white">{t.id}</td>
                          <td className="px-6 py-4"><RiskBadge score={t.riskScore} /></td>
                          <td className="px-6 py-4"><PriorityBadge priority={t.priority} /></td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${t.state === TicketState.Open ? 'bg-blue-500/10 text-blue-400' :
                              t.state === TicketState.Resolved ? 'bg-emerald-500/10 text-emerald-400' :
                                'bg-slate-700/50 text-slate-400'
                              }`}>
                              {t.state}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="truncate w-48 text-slate-200" title={t.description}>{t.description}</p>
                            <div className="flex gap-2 mt-1">
                              {t.sentimentScore < -0.4 && <span className="text-[10px] bg-red-500/20 text-red-300 px-1.5 rounded">High Frustration</span>}
                              {t.isAnomaly && <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 rounded">Anomaly</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-slate-400 block truncate max-w-[150px]" title={t.originalCategory}>
                              {t.originalCategory}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 group/cat">
                              {isRecategorized ? (
                                <div className="tooltip" title="AI Recategorized">
                                  <Wand2 className="w-3 h-3 text-brand-accent animate-pulse" />
                                </div>
                              ) : t.category === 'Manual Triage' ? (
                                <AlertTriangle className="w-3 h-3 text-brand-warning" />
                              ) : (
                                <Tag className="w-3 h-3 text-slate-500" />
                              )}

                              {/* Editable Category with Feedback Loop */}
                              <select
                                className="bg-transparent font-mono text-xs max-w-[150px] truncate outline-none cursor-pointer hover:bg-white/10 rounded px-1 transition-colors appearance-none"
                                value={t.category}
                                title="Click to retrain logic"
                                onChange={(e) => {
                                  const newCat = e.target.value;
                                  if (newCat !== t.category) {
                                    // 1. Train the system
                                    const updatedRules = learnFromCorrection(t, newCat, rules);
                                    setRules(updatedRules);

                                    // 2. Update local ticket state instantly
                                    const updatedTickets = tickets.map(ticket =>
                                      ticket.id === t.id ? { ...ticket, category: newCat } : ticket
                                    );
                                    setTickets(updatedTickets);

                                    // 3. Notify User
                                    alert(`Logic Updated! The system has learned that similar tickets should be classified as "${newCat}".`);
                                  }
                                }}
                              >
                                {rules.map(r => (
                                  <option key={r.id} value={r.id} className="bg-slate-800">{r.id}</option>
                                ))}
                                {/* Ensure current category is an option even if not in rules */}
                                {!rules.find(r => r.id === t.category) && <option value={t.category} className="bg-slate-800">{t.category}</option>}
                              </select>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <ComplianceBadge status={t.complianceStatus} />
                            {t.complianceReason && (
                              <div className="text-[10px] text-red-400 mt-1">{t.complianceReason}</div>
                            )}
                          </td>
                          <td className="px-6 py-4">{t.assignedToName}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'workload' && (
            <div className="space-y-6">
              {/* Chart Section */}
              <div className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-white">Agent Workload Distribution</h3>
                    <p className="text-sm text-slate-400">Real-time analysis of ticket volume vs. cognitive load.</p>
                  </div>
                  <button
                    onClick={handleGenerateOptimization}
                    className="bg-brand-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium"
                  >
                    <BrainCircuit className="w-4 h-4" />
                    AI Optimize Workload
                  </button>
                </div>

                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={workloadData
                        .sort((a, b) => b.loadScore - a.loadScore) // Sort by load
                        .filter((a, index) => a.activeTickets > 0 || a.loadScore > 0 || index < 10) // Show active OR top 10 placeholders
                        .slice(0, 30)
                      }
                      margin={{ top: 20, right: 30, bottom: 60, left: 20 }} // More bottom space for labels
                    >
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Ticket Volume', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Risk Load Score', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                        cursor={{ fill: '#ffffff05' }}
                        itemStyle={{ fontSize: '12px' }}
                        labelStyle={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar
                        yAxisId="left"
                        dataKey="activeTickets"
                        name="Active Tickets"
                        fill="url(#barGradient)"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                        animationDuration={1500}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="loadScore"
                        name="Weighted Load Score"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        animationDuration={1500}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Optimization Proposals */}
              {rebalanceMoves.length > 0 && (
                <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-emerald-500 animate-in slide-in-from-bottom-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-emerald-400" />
                      AI Rebalancing Plan
                    </h3>
                    <button
                      onClick={handleApplyRebalancing}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Apply {rebalanceMoves.length} Moves
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rebalanceMoves.map((move, idx) => (
                      <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-mono text-slate-500">{move.ticketId}</span>
                          <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-200 mb-3 line-clamp-2" title={move.ticketTitle}>{move.ticketTitle}</p>
                        <div className="mt-auto flex items-center justify-between text-xs bg-black/20 p-2 rounded-lg">
                          <div className="text-red-400">{move.currentAgent}</div>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <div className="text-emerald-400">{move.suggestedAgent}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {workloadData.map(agent => (
                  <div key={agent.name} className="glass-panel p-4 rounded-xl border-l-4 border-l-transparent hover:bg-white/5 transition-colors"
                    style={{ borderLeftColor: agent.status === 'Overloaded' ? '#ef4444' : agent.status === 'Underutilized' ? '#10b981' : '#3b82f6' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-slate-200">{agent.name}</div>
                      {agent.status === 'Overloaded' && <AlertOctagon className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Tickets</span>
                        <span className="font-mono text-slate-300">{agent.activeTickets}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Load Score</span>
                        <span className="font-mono text-slate-300">{agent.loadScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="mt-3 text-[10px] uppercase tracking-wider font-bold text-center py-1 rounded bg-black/20"
                      style={{ color: agent.status === 'Overloaded' ? '#f87171' : agent.status === 'Underutilized' ? '#34d399' : '#60a5fa' }}
                    >
                      {agent.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'logic' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Dynamic Rules Engine</h2>
                <p className="text-slate-400">Manage and train the AI classification logic.</p>
              </div>

              {/* Logic Flowchart */}
              <div className="relative glass-panel p-8 rounded-2xl border-t-4 border-t-purple-500 overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BrainCircuit className="w-32 h-32 text-purple-500" />
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
                  {/* Step 1: Ingest */}
                  <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center relative hover:bg-white/10 transition-colors">
                    <div className="bg-blue-500/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-400">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">1. Ingestion</h4>
                    <p className="text-xs text-slate-400 mt-1">Excel / CSV Import</p>
                  </div>

                  <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 md:rotate-0" />

                  {/* Step 2: Rules */}
                  <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center relative hover:bg-white/10 transition-colors">
                    <div className="bg-indigo-500/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-400">
                      <Search className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">2. Keyword Scan</h4>
                    <p className="text-xs text-slate-400 mt-1">Regex & Boost Terms</p>
                  </div>

                  <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 md:rotate-0" />

                  {/* Step 3: Weighting */}
                  <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl text-center relative hover:bg-white/10 transition-colors">
                    <div className="bg-purple-500/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">3. Risk Scoring</h4>
                    <p className="text-xs text-slate-400 mt-1">Multipliers & Decay</p>
                  </div>

                  <ArrowRight className="w-6 h-6 text-slate-600 rotate-90 md:rotate-0" />

                  {/* Step 4: Output */}
                  <div className="flex-1 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center relative">
                    <div className="absolute -top-1 -right-1">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div className="bg-emerald-500/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-400">
                      <Tag className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-white text-sm">4. Classification</h4>
                    <p className="text-xs text-slate-400 mt-1">Category & Priority</p>
                  </div>
                </div>
              </div>

              {/* Technical Deep Dive Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Model Spec */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Cpu className="w-16 h-16 text-slate-500" />
                  </div>
                  <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    Semantic Engine Specs
                  </h4>
                  <div className="space-y-2 text-xs font-mono text-slate-400">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>Model Architecture</span>
                      <span className="text-emerald-400">Transformer (BERT)</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>Weights</span>
                      <span className="text-white">xenova/all-MiniLM-L6-v2</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span>Vector Dimensions</span>
                      <span className="text-white">384-d Dense Vector</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Quantization</span>
                      <span className="text-white">Int8 (Browser Optimized)</span>
                    </div>
                  </div>
                </div>

                {/* Right: Decision Thresholds */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Network className="w-16 h-16 text-slate-500" />
                  </div>
                  <h4 className="font-bold text-slate-200 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Hybrid Decision Logic
                  </h4>

                  <div className="space-y-2">
                    {/* Rule 1 */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-mono">1st</div>
                      <div className="flex-1">
                        <span className="text-slate-300">Semantic Confidence</span>
                        <span className="text-slate-500 mx-1">&gt;</span>
                        <span className="text-green-400 font-bold">45%</span>
                      </div>
                      <span className="text-slate-500">Auto-Align</span>
                    </div>

                    {/* Rule 2 */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">2nd</div>
                      <div className="flex-1">
                        <span className="text-slate-300">Keyword Rule Score</span>
                        <span className="text-slate-500 mx-1">&gt;</span>
                        <span className="text-blue-400 font-bold">3.0</span>
                      </div>
                      <span className="text-slate-500">Override Override</span>
                    </div>

                    {/* Rule 3 */}
                    <div className="flex items-center gap-3 text-xs">
                      <div className="bg-slate-500/20 text-slate-400 px-1.5 py-0.5 rounded font-mono">3rd</div>
                      <div className="flex-1">
                        <span className="text-slate-300">Weak Match</span>
                        <span className="text-slate-500 mx-1">&lt;</span>
                        <span className="text-orange-400 font-bold">35%</span>
                      </div>
                      <span className="text-slate-500">Manual Triage</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule Editor Section */}
              <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-brand-accent">
                <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-brand-accent" />
                    <div>
                      <h3 className="font-bold text-lg text-white">Rule Configuration</h3>
                      <div className="text-sm text-slate-400">
                        <span className="mr-2">Define keywords and weights.</span>
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs text-brand-accent font-mono border border-brand-accent/30">
                          Score = (Keywords + 0.5 × Boosts) × Weight
                        </code>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRules(OFFICIAL_TAXONOMY)}
                      className="text-xs flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-slate-400 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Defaults
                    </button>
                    <button
                      onClick={() => {
                        if (!newRule.id) {
                          setEditingRuleId('NEW');
                          setNewRule({ id: '', keywords: [], boostTerms: [], weight: 2.0 });
                        } else {
                          setEditingRuleId(null);
                        }
                      }}
                      className="text-xs flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-accent hover:bg-blue-600 text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add New Rule
                    </button>
                  </div>
                </div>

                {/* Add/Edit Rule Form */}
                {editingRuleId && (
                  <div className="bg-white/5 p-4 rounded-xl border border-brand-accent/30 mb-6 animate-in slide-in-from-top-2">
                    <h4 className="font-bold text-sm mb-4 text-brand-accent">
                      {editingRuleId === 'NEW' ? 'Create New Classification Rule' : `Edit Rule: ${newRule.id}`}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Category Name (ID)</label>
                        <input
                          type="text"
                          list="category-options"
                          className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-accent transition-colors"
                          placeholder="e.g., Network Outage"
                          value={newRule.id || ''}
                          disabled={editingRuleId !== 'NEW'}
                          onChange={e => setNewRule({ ...newRule, id: e.target.value })}
                        />
                        <datalist id="category-options">
                          {uniqueCategories.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Importance Weight (1.0 - 5.0)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm"
                          value={newRule.weight || 2.0}
                          onChange={e => setNewRule({ ...newRule, weight: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-400 block mb-1">Keywords (Comma separated)</label>
                        <input
                          type="text"
                          className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm"
                          placeholder="e.g., wifi, internet, connection, slow"
                          value={newRule.keywords?.join(', ') || ''}
                          onChange={e => setNewRule({ ...newRule, keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingRuleId(null)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white">Cancel</button>
                      <button
                        onClick={async () => {
                          if (newRule.id && newRule.keywords) {
                            let updatedRules = [];
                            if (editingRuleId === 'NEW') {
                              updatedRules = [...rules, newRule as CategoryRule];
                            } else {
                              updatedRules = rules.map(r => r.id === newRule.id ? newRule as CategoryRule : r);
                            }
                            setRules(updatedRules);
                            setEditingRuleId(null);

                            // Trigger Real-Time Learning
                            const toastId = "training-" + Date.now();
                            // Simple alert for now, could be a toast
                            console.log("Training Semantic Engine...");
                            // We don't await blocking UI, but we let it run
                            refreshTaxonomyEmbeddings(updatedRules).then(() => {
                              console.log("Training Complete");
                            });
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" /> Save & Train ID
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-white/5 font-bold text-slate-100">
                      <tr>
                        <th className="px-3 py-2 rounded-tl-lg">Rule ID</th>
                        <th className="px-3 py-2">Keywords (1.0)</th>
                        <th className="px-3 py-2">Boost Terms (0.5)</th>
                        <th className="px-3 py-2 text-center">Weight</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-white/5 group">
                          <td className="px-3 py-2 font-medium text-slate-200">{rule.id}</td>
                          <td className="px-3 py-2 text-slate-400 max-w-[200px] truncate" title={rule.keywords.join(', ')}>{rule.keywords.join(', ')}</td>
                          <td className="px-3 py-2 text-slate-500 max-w-[200px] truncate" title={rule.boostTerms.join(', ')}>{rule.boostTerms.join(', ')}</td>
                          <td className="px-3 py-2 text-center font-bold text-purple-400">{rule.weight}x</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setNewRule(rule);
                                  setEditingRuleId(rule.id);
                                }}
                                className="p-1 hover:bg-white/10 text-slate-500 hover:text-white rounded transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setRules(rules.filter(r => r.id !== rule.id))}
                                className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Scoring Model Visualization */}
              <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-orange-500">
                <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Activity className="w-5 h-5 text-orange-500" />
                  <div>
                    <h3 className="font-bold text-lg text-white">Risk Scoring Model</h3>
                    <p className="text-sm text-slate-400">How the AI calculates risk (0-10) for each ticket.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center relative group">
                    <div className="text-3xl font-bold text-blue-400 mb-1">40%</div>
                    <div className="text-sm font-bold text-slate-200">Priority Weight</div>
                    <p className="text-xs text-slate-500 mt-2">Based on assigned urgency</p>
                    <div className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 text-xs text-left">
                      <ul className="space-y-1 text-slate-300">
                        <li>Critical: <span className="text-red-400 font-mono">10.0</span></li>
                        <li>High: <span className="text-orange-400 font-mono">7.0</span></li>
                        <li>Moderate: <span className="text-yellow-400 font-mono">4.0</span></li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center relative group">
                    <div className="text-3xl font-bold text-purple-400 mb-1">30%</div>
                    <div className="text-sm font-bold text-slate-200">Time Decay</div>
                    <p className="text-xs text-slate-500 mt-2">Escalates as SLA breaches approach</p>
                    <div className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 text-xs text-left">
                      <ul className="space-y-1 text-slate-300">
                        <li>&gt; 48 Hours: <span className="text-red-400 font-mono">Critical</span></li>
                        <li>&gt; 24 Hours: <span className="text-orange-400 font-mono">High</span></li>
                        <li>&gt; 8 Hours: <span className="text-yellow-400 font-mono">Moderate</span></li>
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center relative group">
                    <div className="text-3xl font-bold text-emerald-400 mb-1">30%</div>
                    <div className="text-sm font-bold text-slate-200">Content Analysis</div>
                    <p className="text-xs text-slate-500 mt-2">Keywords & Sensitive Terms</p>
                    <div className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4 text-xs text-left">
                      <ul className="space-y-1 text-slate-300">
                        <li>Financial/Rev: <span className="text-red-400 font-mono">+3.0</span></li>
                        <li>Access/Auth: <span className="text-orange-400 font-mono">+2.0</span></li>
                        <li>Confidential: <span className="text-purple-400 font-mono">+2.0</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compliance & Predictive Engine Visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Compliance Engine */}
                <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-red-500">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-lg text-white">Compliance Engine</h3>
                  </div>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3 bg-white/5 p-4 rounded-lg">
                      <div className="bg-red-500/20 p-2 rounded text-red-400 mt-1"><FileText className="w-4 h-4" /></div>
                      <div>
                        <div className="font-bold text-sm text-slate-200">SOD Integrity Check</div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Analyzes ticket workflows to detect Segregation of Duties (SOD) conflicts, ensuring that critical tasks are separated among different individuals to prevent fraud and error.
                        </p>
                        <div className="mt-2 text-[10px] text-slate-500 border-t border-white/5 pt-2">
                          <strong className="text-slate-400">Logic:</strong> Scans the transaction log and description for high-risk pattern keywords like "sod", "segregation", or "conflict".
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 bg-white/5 p-4 rounded-lg">
                      <div className="bg-red-500/20 p-2 rounded text-red-400 mt-1"><Users className="w-4 h-4" /></div>
                      <div>
                        <div className="font-bold text-sm text-slate-200">Self-Assignment Validation</div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Identifies and flags governance risks where an agent assigns a ticket to themselves, preventing potential self-approval and ensuring independent oversight.
                        </p>
                        <div className="mt-2 text-[10px] text-slate-500 border-t border-white/5 pt-2">
                          <strong className="text-slate-400">Logic:</strong> Validates that the "Assigned To" field is distinct from the "Reporter" identity to ensure separation.
                        </div>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 bg-white/5 p-4 rounded-lg">
                      <div className="bg-red-500/20 p-2 rounded text-red-400 mt-1"><CheckCircle2 className="w-4 h-4" /></div>
                      <div>
                        <div className="font-bold text-sm text-slate-200">Approval Evidence Audit</div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Scans access request tickets for required audit artifacts, confirming that proper management approval has been documented before access is provisioned.
                        </p>
                        <div className="mt-2 text-[10px] text-slate-500 border-t border-white/5 pt-2">
                          <strong className="text-slate-400">Logic:</strong> If category is "Access", verifies description contains approval artifacts (e.g., "approved", "manager", "attached").
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Predictive Engine */}
                <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-blue-500">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-lg text-white">Predictive Forecasting</h3>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mb-4">
                    <p className="text-sm text-blue-200 font-mono">y = mx + b (Weighted Regression)</p>
                  </div>
                  <p className="text-sm text-slate-300 mb-4">
                    The engine uses a weighted rolling average of arrival rates, adjusted for:
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-400 mb-4 space-y-1">
                    <li><strong>Seasonality:</strong> Time of day patterns (e.g., Morning spike)</li>
                    <li><strong>Agent Availability:</strong> Active user count vs. ticket ratio</li>
                    <li><strong>Velocity:</strong> Rate of change in last 60 mins</li>
                  </ul>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Input Features</span>
                      <span>Output</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden flex">
                      <div className="w-1/3 bg-slate-500"></div>
                      <div className="w-1/3 bg-slate-600"></div>
                      <div className="w-1/3 bg-blue-500 animate-pulse"></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Time of Day</span>
                      <span>Active Agents</span>
                      <span>Predicted Vol</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main >

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-accent" />
              AI Configuration
            </h2>
            <p className="text-sm text-slate-400 mb-6">Configure Enterprise AI (Azure OpenAI) or manage Local AI settings.</p>

            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200 mb-4">
                <div className="font-bold flex items-center gap-2 mb-1">
                  <TypeIcon className="w-4 h-4" /> Enterprise Mode (BYOK)
                </div>
                Enter your Azure OpenAI credentials below to switch from Local AI to Enterprise Cloud AI.
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Azure OpenAI Endpoint</label>
                <div className="relative">
                  <Cloud className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm focus:border-brand-accent outline-none"
                    placeholder="https://your-resource.openai.azure.com/"
                    value={tempAzureConfig.endpoint}
                    onChange={e => setTempAzureConfig({ ...tempAzureConfig, endpoint: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm focus:border-brand-accent outline-none"
                    placeholder="sk-..."
                    value={tempAzureConfig.apiKey}
                    onChange={e => setTempAzureConfig({ ...tempAzureConfig, apiKey: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Deployment Name</label>
                <div className="relative">
                  <Database className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-3 text-sm focus:border-brand-accent outline-none"
                    placeholder="gpt-4-turbo"
                    value={tempAzureConfig.deployment}
                    onChange={e => setTempAzureConfig({ ...tempAzureConfig, deployment: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-8">
              {azureConfig && (
                <button
                  onClick={() => {
                    clearAzureConfig();
                    setAzureConfig(null);
                    setTempAzureConfig({ apiKey: '', endpoint: '', deployment: '' });
                  }}
                  className="px-4 py-2 text-sm text-red-400 hover:text-red-300 mr-auto"
                >
                  Clear Credentials
                </button>
              )}
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (tempAzureConfig.apiKey && tempAzureConfig.endpoint) {
                    saveAzureConfig(tempAzureConfig);
                    setAzureConfig(tempAzureConfig);
                    setUseStrongAI(true); // Auto-enable
                    setShowSettings(false);
                  } else {
                    alert("Please fill in API Key and Endpoint");
                  }
                }}
                className="px-4 py-2 text-sm bg-brand-accent hover:bg-blue-600 text-white rounded-lg font-medium"
              >
                Save & Enable Azure
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

function TypeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" x2="15" y1="20" y2="20" />
      <line x1="12" x2="12" y1="4" y2="20" />
    </svg>
  )
}
