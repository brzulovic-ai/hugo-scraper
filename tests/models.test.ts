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
      expect(geminiIds).toContain("gemini-flash-lite-latest");
      expect(geminiIds).toContain("gemini-3.1-flash-lite");
      expect(geminiIds).toContain("gemini-flash-latest");
    });

    it("keeps Groq, Ollama, and LiteLLM static model lists empty for live scanning", () => {
      expect(SUPPORTED_MODELS.groq).toEqual([]);
      expect(SUPPORTED_MODELS.ollama).toEqual([]);
      expect(SUPPORTED_MODELS.litellm).toEqual([]);
    });
  });

  describe("detectModelProvider", () => {
    it("detects gemini models correctly", () => {
      expect(detectModelProvider("gemini-flash-lite-latest")).toBe("gemini");
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

