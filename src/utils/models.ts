export type AIProvider = "gemini" | "groq" | "ollama" | "litellm";

export interface ModelDefinition {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  tag?: string;
  isDefault?: boolean;
}

export const SUPPORTED_MODELS: Record<AIProvider, ModelDefinition[]> = {
  gemini: [
    {
      id: "gemini-flash-lite-latest",
      name: "Gemini Flash-Lite Latest",
      provider: "gemini",
      description: "Auto-updating latest lightweight Gemini Flash-Lite model with ultra-low latency",
      tag: "Free Tier Default",
      isDefault: true,
    },
    {
      id: "gemini-3.1-flash-lite",
      name: "Gemini 3.1 Flash Lite",
      provider: "gemini",
      description: "Optimized for ultra-low latency generation",
      tag: "Ultra Fast",
    },
    {
      id: "gemini-flash-latest",
      name: "Gemini Flash Latest",
      provider: "gemini",
      description: "Auto-updating latest stable Gemini Flash alias",
      tag: "Auto-Update",
    },
  ],
  groq: [],
  ollama: [],
  litellm: [],
};

/**
 * Detects the AI provider based on model name or explicit provider string.
 */
export function detectModelProvider(modelId: string, explicitProvider?: string): AIProvider {
  if (
    explicitProvider === "gemini" ||
    explicitProvider === "groq" ||
    explicitProvider === "ollama" ||
    explicitProvider === "litellm"
  ) {
    return explicitProvider;
  }
  const id = (modelId || "").toLowerCase().trim();
  if (
    id.startsWith("litellm") ||
    id.startsWith("gpt-") ||
    id.startsWith("claude-") ||
    id.startsWith("anthropic/") ||
    id.startsWith("openai/") ||
    id.startsWith("mistral-small") ||
    id.includes("deepseek/") ||
    id.includes("meta-llama/") ||
    id.includes("qwen/")
  ) {
    return "litellm";
  }
  if (id.startsWith("gemini") && !id.includes("/")) {
    return "gemini";
  }
  if (
    id.includes("groq") ||
    id === "llama-3.3-70b-versatile" ||
    id === "llama-3.1-8b-instant" ||
    id === "mixtral-8x7b-32768" ||
    id === "gemma2-9b-it" ||
    id === "deepseek-r1-distill-llama-70b"
  ) {
    return "groq";
  }
  if (
    id.includes("ollama") ||
    id === "llama3.2" ||
    id === "llama3.1" ||
    id === "mistral" ||
    id === "deepseek-r1" ||
    id === "phi4" ||
    id === "qwen2.5-coder" ||
    id === "gemma2"
  ) {
    return "ollama";
  }
  if (id.includes("/")) {
    return "litellm";
  }
  return "gemini";
}

/**
 * Safely extracts and parses JSON from raw LLM text responses,
 * even when wrapped in markdown code fences or surrounded by commentary.
 */
export function extractJsonFromText(rawText: string): any {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty model response received.");
  }

  const trimmed = rawText.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to pattern extractors
  }

  // Check for ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to bracket search
    }
  }

  // Find the first { and the last }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidateJson = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidateJson);
    } catch (err: any) {
      throw new Error(`Failed to parse structured JSON from model response: ${err.message}`);
    }
  }

  throw new Error("No structured JSON object found in model output.");
}
