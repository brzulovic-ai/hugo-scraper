import { describe, it, expect } from "vitest";
import {
  SUPPORTED_MODELS,
  detectModelProvider,
  extractJsonFromText,
} from "../src/utils/models";

describe("Model Configuration & Provider Selection", () => {
  describe("Supported Models Catalog", () => {
    it("contains Gemini free-tier models", () => {
      const geminiIds = SUPPORTED_MODELS.gemini.map((m) => m.id);
      expect(geminiIds).toContain("gemini-3.7-flash");
      expect(geminiIds).toContain("gemini-3.1-flash-lite");
      expect(geminiIds).toContain("gemini-flash-latest");
    });

    it("contains Groq ultra-fast free models", () => {
      const groqIds = SUPPORTED_MODELS.groq.map((m) => m.id);
      expect(groqIds).toContain("llama-3.3-70b-versatile");
      expect(groqIds).toContain("llama-3.1-8b-instant");
      expect(groqIds).toContain("mixtral-8x7b-32768");
      expect(groqIds).toContain("gemma2-9b-it");
      expect(groqIds).toContain("deepseek-r1-distill-llama-70b");
    });

    it("contains Ollama local models", () => {
      const ollamaIds = SUPPORTED_MODELS.ollama.map((m) => m.id);
      expect(ollamaIds).toContain("llama3.2");
      expect(ollamaIds).toContain("llama3.1");
      expect(ollamaIds).toContain("mistral");
      expect(ollamaIds).toContain("deepseek-r1");
      expect(ollamaIds).toContain("phi4");
      expect(ollamaIds).toContain("qwen2.5-coder");
    });

    it("contains LiteLLM proxy default models", () => {
      const litellmIds = SUPPORTED_MODELS.litellm.map((m) => m.id);
      expect(litellmIds).toContain("gpt-4o-mini");
      expect(litellmIds).toContain("claude-3-5-haiku");
      expect(litellmIds).toContain("mistral-small");
      expect(litellmIds).toContain("anthropic/claude-3-7-sonnet");
    });
  });

  describe("detectModelProvider", () => {
    it("detects gemini models correctly", () => {
      expect(detectModelProvider("gemini-3.7-flash")).toBe("gemini");
      expect(detectModelProvider("gemini-3.1-flash-lite")).toBe("gemini");
    });

    it("detects LiteLLM models correctly", () => {
      expect(detectModelProvider("gpt-4o")).toBe("litellm");
      expect(detectModelProvider("gpt-4o-mini")).toBe("litellm");
      expect(detectModelProvider("claude-3-5-sonnet")).toBe("litellm");
      expect(detectModelProvider("anthropic/claude-3-7-sonnet")).toBe("litellm");
    });

    it("detects Groq models correctly", () => {
      expect(detectModelProvider("llama-3.3-70b-versatile")).toBe("groq");
      expect(detectModelProvider("llama-3.1-8b-instant")).toBe("groq");
      expect(detectModelProvider("mixtral-8x7b-32768")).toBe("groq");
      expect(detectModelProvider("deepseek-r1-distill-llama-70b")).toBe("groq");
    });

    it("detects Ollama models correctly", () => {
      expect(detectModelProvider("llama3.2")).toBe("ollama");
      expect(detectModelProvider("llama3.1")).toBe("ollama");
      expect(detectModelProvider("mistral")).toBe("ollama");
      expect(detectModelProvider("deepseek-r1")).toBe("ollama");
      expect(detectModelProvider("qwen2.5-coder")).toBe("ollama");
    });

    it("respects explicit provider override", () => {
      expect(detectModelProvider("custom-model", "ollama")).toBe("ollama");
      expect(detectModelProvider("custom-model", "groq")).toBe("groq");
      expect(detectModelProvider("custom-model", "gemini")).toBe("gemini");
    });
  });

  describe("extractJsonFromText", () => {
    it("parses clean JSON string", () => {
      const input = '{"title":"My Post","summary":"Great post"}';
      const output = extractJsonFromText(input);
      expect(output.title).toBe("My Post");
      expect(output.summary).toBe("Great post");
    });

    it("extracts JSON wrapped in markdown code fence", () => {
      const input = '```json\n{\n  "title": "Hugo Guide",\n  "categories": ["Tech"]\n}\n```';
      const output = extractJsonFromText(input);
      expect(output.title).toBe("Hugo Guide");
      expect(output.categories).toEqual(["Tech"]);
    });

    it("extracts JSON surrounded by text commentary", () => {
      const input = 'Here is the generated JSON:\n{"title": "Deep Dive", "slug": "deep-dive"}\nHope you enjoy!';
      const output = extractJsonFromText(input);
      expect(output.title).toBe("Deep Dive");
      expect(output.slug).toBe("deep-dive");
    });

    it("throws clear error on invalid JSON", () => {
      expect(() => extractJsonFromText("Not a json string at all")).toThrow();
    });
  });
});

