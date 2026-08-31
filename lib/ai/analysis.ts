import type { Trend } from "@/types/db";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

export interface AnalysisResult {
  summary: string;
  trend: Trend;
  themes: string[];
}

const ANALYSIS_PROMPT = `You are a mental health support assistant. Analyze the following session transcript from a peer support session.

Provide your analysis in the following JSON format:
{
  "summary": "A 2-3 sentence summary of the session, covering the main topics discussed and emotional state of the participant.",
  "trend": "improving" | "stable" | "declining",
  "themes": ["theme1", "theme2"]
}

Guidelines for trend assessment:
- "improving": User shows positive coping, hope, progress, or resolution
- "stable": User is consistent, no significant positive or negative change
- "declining": User shows worsening symptoms, hopelessness, or regression

Themes should be 2-5 key topics (e.g., "anxiety", "work stress", "social isolation", "coping strategies").

IMPORTANT: Respond with ONLY the JSON object, no additional text or markdown formatting.`;

export async function analyzeTranscript(
  transcript: string,
  history?: string,
): Promise<AnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  let userMessage = `Session transcript:\n\n"${transcript}"`;

  if (history) {
    userMessage += `\n\nPrevious session history for context:\n\n"${history}"`;
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer":
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Sahara - Peer Support Platform",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: ANALYSIS_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in API response");
  }

  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as AnalysisResult;

    if (!parsed.summary || !parsed.trend || !parsed.themes) {
      throw new Error("Invalid analysis structure");
    }

    if (!["improving", "stable", "declining"].includes(parsed.trend)) {
      parsed.trend = "stable";
    }

    return parsed;
  } catch {
    throw new Error(`Failed to parse analysis: ${cleaned}`);
  }
}

export async function getUserTranscriptHistory(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string | null> {
  const { data: sessionData } = await supabase
    .from("session_participants")
    .select("transcript, created_at")
    .eq("user_id", userId)
    .not("transcript", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: journalData } = await supabase
    .from("journal_entries")
    .select("content, created_at")
    .eq("user_id", userId)
    .eq("include_in_analysis", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const parts: string[] = [];

  if (sessionData && sessionData.length > 0) {
    parts.push("--- Session Transcripts ---");
    for (const d of sessionData) {
      if (d.transcript) {
        parts.push(
          `[${new Date(d.created_at).toLocaleDateString()}]\n${d.transcript}`,
        );
      }
    }
  }

  if (journalData && journalData.length > 0) {
    parts.push("--- Journal Entries ---");
    for (const d of journalData) {
      if (d.content) {
        parts.push(
          `[${new Date(d.created_at).toLocaleDateString()}]\n${d.content}`,
        );
      }
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}
