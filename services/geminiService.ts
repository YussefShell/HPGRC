
import { GoogleGenAI } from "@google/genai";
import { FilterCriteria, Priority, TicketState, ComplianceStatus, Ticket } from "../types";

// Lazy initialization to prevent app crash if API key is missing
let aiClient: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI | null => {
  if (aiClient) return aiClient;

  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY; // Support both naming conventions
  if (!apiKey) {
    console.warn("Gemini API Key is missing. AI features will be disabled.");
    return null;
  }

  try {
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (e) {
    console.error("Failed to initialize Gemini Client:", e);
    return null;
  }
};

export const askData = async (query: string): Promise<FilterCriteria | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  const model = 'gemini-2.0-flash-exp'; // Updated to latest available model
  const prompt = `
    You are an AI assistant for a GRC (Governance, Risk, Compliance) dashboard.
    Convert the following natural language user query into a structured JSON filter object.
    
    User Query: "${query}"
    
    The JSON schema is:
    {
      "minRisk": number | undefined,
      "priority": ["Critical" | "High" | "Moderate" | "Low"] | undefined,
      "state": ["Open" | "In Progress" | "Resolved" | "Closed"] | undefined,
      "compliance": "Compliant" | "Non-Compliant" | undefined,
      "searchQuery": string | undefined (keywords for title/description search)
    }

    Examples:
    - "Show me critical risk tickets" -> { "minRisk": 8, "priority": ["Critical"] }
    - "Show open non-compliant items" -> { "state": ["Open"], "compliance": "Non-Compliant" }
    - "Find issues about outages" -> { "searchQuery": "outage" }
    - "Summarize the SAP access issues" -> { "searchQuery": "SAP access" }
    
    Return ONLY the valid JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as FilterCriteria;
    }
    return null;
  } catch (error) {
    console.error("Gemini Ask Data Error:", error);
    return null;
  }
};

export const generateExecutiveSummary = async (riskCount: number, complianceCount: number, topRiskCategory: string): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI Summary unavailable (No API Key).";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `Generate a 1-sentence executive summary for a GRC dashboard with: ${riskCount} high risk tickets, ${complianceCount} non-compliant items, and primary concern area being ${topRiskCategory}. Keep it professional and urgent if needed.`,
    });
    return response.text || "Summary generation failed.";
  } catch (e) {
    return "AI Summary unavailable.";
  }
}

export const generateRagResponse = async (query: string, tickets: Ticket[]): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "AI RAG unavailable (No API Key).";

  // Limit context to prevent token overflow and ensure relevance.
  // We prioritize tickets by Risk Score to ensure the AI sees the most critical items first.
  const contextTickets = tickets
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 25) // Take top 25 most risky/relevant from the current filtered view
    .map(t => ({
      id: t.id,
      title: t.title,
      desc: t.description,
      risk: t.riskScore,
      priority: t.priority,
      status: t.state,
      category: t.category,
      duration: t.durationHours + 'h',
      assignee: t.assignedToName
    }));

  const prompt = `
    You are a Senior GRC (Governance, Risk, Compliance) Analyst using the HPNow GRC 3.0 platform.
    
    User Question: "${query}"
    
    Context Data (Top ${contextTickets.length} relevant tickets from current view):
    ${JSON.stringify(contextTickets, null, 2)}
    
    Instructions:
    1. Answer the user's question directly based *only* on the provided ticket data.
    2. Identify patterns, root causes, or specific risk clusters if asked.
    3. Cite specific Ticket IDs (e.g., T-10203) to support your evidence.
    4. Keep the tone professional, analytical, and concise. 
    5. If the data provided doesn't answer the question (e.g. asking about tickets not in the list), state that clearly.
    
    Format nicely with paragraphs or bullet points where appropriate.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("RAG Error:", error);
    return "Unable to generate AI insights at this time.";
  }
};
