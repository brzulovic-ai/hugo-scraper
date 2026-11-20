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
      id: "gemini-3.7-flash",
      name: "Gemini 3.7 Flash",
      provider: "gemini",
      description: "Google's flagship multimodal model with speed & quality",
      tag: "Free Tier Flagship",
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
  groq: [
    {
      id: "llama-3.3-70b-versatile",
      name: "Llama 3.3 70B Versatile",
      provider: "groq",
      description: "Meta's flagship open-weights model on Groq's ultra-fast LPU",
      tag: "Groq Free Tier",
      isDefault: true,
    },
    {
      id: "llama-3.1-8b-instant",
      name: "Llama 3.1 8B Instant",
      provider: "groq",
      description: "Blazing fast inference (500+ tokens/sec) for instant Hugo posts",
      tag: "Instant Speed",
    },
    {
      id: "mixtral-8x7b-32768",
      name: "Mixtral 8x7B (32k Context)",
      provider: "groq",
      description: "Mistral's MoE model with large context window for long articles",
      tag: "32k Context",
    },
    {
      id: "gemma2-9b-it",
      name: "Gemma 2 9B IT",
      provider: "groq",
      description: "Google's lightweight open model hosted on Groq LPU",
      tag: "Open Weights",
    },
    {
      id: "deepseek-r1-distill-llama-70b",
      name: "DeepSeek R1 Distill Llama 70B",
      provider: "groq",
      description: "DeepSeek reasoning-distilled 70B architecture on Groq",
      tag: "Deep Reasoning",
    },
  ],
  ollama: [
    {
      id: "llama3.2",
      name: "Llama 3.2 (3B / 1B)",
      provider: "ollama",
      description: "Meta's compact edge model running locally on your hardware",
      tag: "Local & Private",
      isDefault: true,
    },
    {
      id: "llama3.1",
      name: "Llama 3.1 (8B / 70B)",
      provider: "ollama",
      description: "Meta's state-of-the-art multilingual open model",
      tag: "Local Multilingual",
    },
    {
      id: "mistral",
      name: "Mistral (7B)",
      provider: "ollama",
      description: "High-performance code & writing model by Mistral AI",
      tag: "Local Standard",
    },
    {
      id: "deepseek-r1",
      name: "DeepSeek R1",
      provider: "ollama",
      description: "Local reasoning model for structured tech tutorials",
      tag: "Local Reasoning",
    },
    {
      id: "phi4",
      name: "Phi-4 (14B)",
      provider: "ollama",
      description: "Microsoft's high-reasoning synthetic-trained model",
      tag: "Local Microsoft",
    },
    {
      id: "qwen2.5-coder",
      name: "Qwen 2.5 Coder",
      provider: "ollama",
      description: "Specialized in code blocks, terminal scripts, and technical syntax",
      tag: "Local Code Expert",
    },
    {
      id: "gemma2",
      name: "Gemma 2 (9B / 27B)",
      provider: "ollama",
      description: "Google's open-weight architecture running locally via Ollama",
      tag: "Local Google",
    },
  ],
  litellm: [
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "litellm",
      description: "High-intelligence lightweight OpenAI flagship via LiteLLM Proxy",
      tag: "LiteLLM Fast",
      isDefault: true,
    },
    {
      id: "gpt-4o",
      name: "GPT-4o",
      provider: "litellm",
      description: "OpenAI omni flagship multimodal model via LiteLLM Proxy",
      tag: "LiteLLM Flagship",
    },
    {
      id: "claude-3-5-haiku",
      name: "Claude 3.5 Haiku",
      provider: "litellm",
      description: "Fast and intelligent next-gen Haiku model",
      tag: "LiteLLM Fast",
    },
    {
      id: "claude-3-5-sonnet",
      name: "Claude 3.5 Sonnet",
      provider: "litellm",
      description: "Anthropic's state-of-the-art coding and prose model",
      tag: "LiteLLM Anthropic",
    },
    {
      id: "anthropic/claude-3-7-sonnet",
      name: "Claude 3.7 Sonnet (Thinking)",
      provider: "litellm",
      description: "Hybrid reasoning flagship Claude model via LiteLLM Proxy",
      tag: "LiteLLM Reasoning",
    },
    {
      id: "mistral-small",
      name: "Mistral Small",
      provider: "litellm",
      description: "Mistral fast, enterprise-grade multilingual model",
      tag: "LiteLLM Mistral",
    },
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek V3 Chat",
      provider: "litellm",
      description: "DeepSeek V3 671B open-architecture powerhouse routed through LiteLLM",
      tag: "LiteLLM DeepSeek",
    },
    {
      id: "deepseek/deepseek-reasoner",
      name: "DeepSeek R1 Reasoner",
      provider: "litellm",
      description: "DeepSeek full reasoning model via LiteLLM Proxy",
      tag: "LiteLLM Reasoning",
    },
    {
      id: "gemini/gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "litellm",
      description: "Google Gemini 2.0 Flash routed through your LiteLLM Proxy",
      tag: "LiteLLM Google",
    },
    {
      id: "meta-llama/llama-3.3-70b-instruct",
      name: "Llama 3.3 70B Instruct",
      provider: "litellm",
      description: "Meta open-weights flagship routed via LiteLLM",
      tag: "LiteLLM Meta",
    },
    {
      id: "qwen/qwen-2.5-72b-instruct",
      name: "Qwen 2.5 72B Instruct",
      provider: "litellm",
      description: "Alibaba's benchmark-leading open model via LiteLLM",
      tag: "LiteLLM Qwen",
    },
  ],
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
