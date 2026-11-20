import { describe, it, expect } from "vitest";
import {
  generateSlug,
  sanitizeTags,
  isValidUrl,
  formatHugoFrontMatter,
  assembleHugoMarkdown,
  parseQueryParameters,
  isInstagramUrl,
  extractInstagramCode,
  isTikTokUrl,
  extractTikTokDetails,
  ensureModelTag,
  getLanguageConfig,
  SUPPORTED_LANGUAGES,
} from "../src/utils/hugo";

describe("Hugo Utility & Helper Tests", () => {
  describe("ensureModelTag", () => {
    it("adds model name as a tag if not present", () => {
      const tags = ["technology", "hugo"];
      const updated = ensureModelTag(tags, "gemini-flash-lite-latest");
      expect(updated).toEqual(["technology", "hugo", "gemini-flash-lite-latest"]);
    });

    it("does not duplicate tag if already present", () => {
      const tags = ["technology", "llama-3.3-70b-versatile"];
      const updated = ensureModelTag(tags, "llama-3.3-70b-versatile");
      expect(updated).toEqual(["technology", "llama-3.3-70b-versatile"]);
    });

    it("sanitizes proxy routes like anthropic/claude-3-7-sonnet to tag", () => {
      const tags = ["ai", "coding"];
      const updated = ensureModelTag(tags, "anthropic/claude-3-7-sonnet");
      expect(updated).toContain("claude-3-7-sonnet");
    });

    it("handles undefined or empty tags array safely", () => {
      const updated = ensureModelTag([], "mistral-large");
      expect(updated).toEqual(["mistral-large"]);
    });
  });

  describe("getLanguageConfig & SUPPORTED_LANGUAGES", () => {
    it("has 'both' as default supported language", () => {
      const defaultLang = SUPPORTED_LANGUAGES.find((l) => (l as any).default);
      expect(defaultLang?.id).toBe("both");
    });

    it("returns bilingual configuration for 'both'", () => {
      const config = getLanguageConfig("both");
      expect(config.id).toBe("both");
      expect(config.isBilingual).toBe(true);
      expect(config.instructions.toLowerCase()).toContain("bilingual");
      expect(config.instructions).toContain("French");
      expect(config.instructions).toContain("English");
    });

    it("returns French configuration for 'french' or 'fr'", () => {
      const config = getLanguageConfig("french");
      expect(config.id).toBe("french");
      expect(config.isBilingual).toBe(false);
      expect(config.instructions).toContain("French (Français)");
    });

    it("returns English configuration for 'english' or 'en'", () => {
      const config = getLanguageConfig("english");
      expect(config.id).toBe("english");
      expect(config.isBilingual).toBe(false);
      expect(config.instructions).toContain("English");
    });

    it("falls back gracefully for unknown language codes", () => {
      const config = getLanguageConfig("both");
      expect(config.id).toBe("both");
    });
  });

  describe("generateSlug", () => {
    it("converts standard titles to kebab-case slugs", () => {
      expect(generateSlug("Getting Started with Hugo Static Site Generator")).toBe(
        "getting-started-with-hugo-static-site-generator"
      );
    });

    it("strips special characters and punctuation", () => {
      expect(generateSlug("What's New in React 19 & Tailwind v4? (2026 Edition!)")).toBe(
        "whats-new-in-react-19-tailwind-v4-2026-edition"
      );
    });

    it("handles empty or whitespace strings gracefully", () => {
      expect(generateSlug("")).toBe("untitled-post");
      expect(generateSlug("   ")).toBe("untitled-post");
    });
  });

  describe("Instagram & TikTok Helpers", () => {
    it("detects Instagram reel and post URLs", () => {
      expect(isInstagramUrl("https://www.instagram.com/reel/C3bXYZ12345/")).toBe(true);
      expect(isInstagramUrl("https://instagram.com/p/DF12345abc/")).toBe(true);
      expect(isInstagramUrl("https://example.com/post")).toBe(false);
    });

    it("extracts Instagram shortcodes", () => {
      expect(extractInstagramCode("https://www.instagram.com/reel/C3bXYZ12345/")).toEqual({
        code: "C3bXYZ12345",
        type: "reel",
      });
      expect(extractInstagramCode("https://instagram.com/p/DF12345abc/")).toEqual({
        code: "DF12345abc",
        type: "p",
      });
    });

    it("detects TikTok video URLs", () => {
      expect(isTikTokUrl("https://www.tiktok.com/@openai/video/7345678901234567890")).toBe(true);
      expect(isTikTokUrl("https://vm.tiktok.com/ZM8abcde/")).toBe(true);
      expect(isTikTokUrl("https://example.com/video")).toBe(false);
    });

    it("extracts TikTok username and video ID", () => {
      const details = extractTikTokDetails("https://www.tiktok.com/@openai/video/7345678901234567890");
      expect(details).toEqual({
        username: "openai",
        videoId: "7345678901234567890",
      });
    });
  });

  describe("sanitizeTags", () => {
    it("splits comma-delimited strings and trims whitespace", () => {
      const result = sanitizeTags("react,  typescript , vite, hugo  ");
      expect(result).toEqual(["react", "typescript", "vite", "hugo"]);
    });

    it("removes duplicates and empty items", () => {
      const result = sanitizeTags("hugo, , react, hugo, docker, ");
      expect(result).toEqual(["hugo", "react", "docker"]);
    });

    it("handles empty input", () => {
      expect(sanitizeTags("")).toEqual([]);
    });
  });

  describe("isValidUrl", () => {
    it("validates legitimate HTTP and HTTPS URLs", () => {
      expect(isValidUrl("https://gohugo.io/getting-started/quick-start/")).toBe(true);
      expect(isValidUrl("http://example.com/article")).toBe(true);
    });

    it("rejects invalid or non-http protocols", () => {
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
      expect(isValidUrl("not-a-valid-url")).toBe(false);
      expect(isValidUrl("ftp://files.example.com")).toBe(false);
      expect(isValidUrl("")).toBe(false);
    });
  });

  describe("formatHugoFrontMatter", () => {
    it("generates compliant YAML front matter structure", () => {
      const frontMatter = formatHugoFrontMatter({
        title: "Deploying to Cloud Run",
        date: "2026-08-15T12:00:00.000Z",
        description: "A comprehensive guide to Google Cloud Run",
        author: "DevOps Engineer",
        categories: ["Cloud", "DevOps"],
        tags: ["GCP", "Containers", "Docker"],
        slug: "deploying-to-cloud-run",
        originalUrl: "https://cloud.google.com/run",
        model_used: "gemini-flash-lite-latest",
        provider_used: "gemini",
      });

      expect(frontMatter).toContain('title: "Deploying to Cloud Run"');
      expect(frontMatter).toContain('author: "DevOps Engineer"');
      expect(frontMatter).toContain('slug: "deploying-to-cloud-run"');
      expect(frontMatter).toContain('source_url: "https://cloud.google.com/run"');
      expect(frontMatter).toContain('model_used: "gemini-flash-lite-latest"');
      expect(frontMatter).toContain('provider_used: "gemini"');
      expect(frontMatter).toContain('- "Cloud"');
      expect(frontMatter).toContain('- "Docker"');
    });

    it("handles custom LiteLLM model tags in front matter", () => {
      const frontMatter = formatHugoFrontMatter({
        title: "Anthropic Claude Post",
        date: "2026-08-15T12:00:00.000Z",
        description: "Testing custom model tagging",
        author: "AI Engineer",
        categories: ["AI"],
        tags: ["LLM", "claude-3-7-sonnet"],
        slug: "anthropic-claude-post",
        model_used: "anthropic/claude-3-7-sonnet",
        provider_used: "litellm",
      });

      expect(frontMatter).toContain('model_used: "anthropic/claude-3-7-sonnet"');
      expect(frontMatter).toContain('provider_used: "litellm"');
    });
  });

  describe("assembleHugoMarkdown", () => {
    it("concatenates front matter and markdown body with proper newlines", () => {
      const fm = '---\ntitle: "Test"\n---';
      const body = "## Overview\n\nThis is a test post body.";
      const fullPost = assembleHugoMarkdown(fm, body);

      expect(fullPost).toBe('---\ntitle: "Test"\n---\n\n## Overview\n\nThis is a test post body.\n');
    });
  });

  describe("parseQueryParameters", () => {
    it("parses URL and automatic trigger parameters (?url=...&proceed=1)", () => {
      const query = "?url=https%3A%2F%2Fgohugo.io&proceed=1&author=Admin&lang=French&model=gemini-flash-lite-latest";
      const result = parseQueryParameters(query);

      expect(result.url).toBe("https://gohugo.io");
      expect(result.proceed).toBe(true);
      expect(result.options.author).toBe("Admin");
      expect(result.options.language).toBe("French");
      expect(result.options.model).toBe("gemini-flash-lite-latest");
    });

    it("disables automatic proceed when proceed is absent or false", () => {
      const query = "?url=https://example.com/test";
      const result = parseQueryParameters(query);

      expect(result.url).toBe("https://example.com/test");
      expect(result.proceed).toBe(false);
    });
  });

  describe("generated volume filename formatting", () => {
    it("creates safe kebab-case markdown filenames for the generated/ volume", () => {
      const slug = "my-awesome-hugo-guide-2026";
      const fileName = `${slug}.md`;
      expect(fileName).toBe("my-awesome-hugo-guide-2026.md");
      expect(fileName.endsWith(".md")).toBe(true);
      expect(fileName).not.toMatch(/[^a-z0-9_.-]/);
    });
  });
});
