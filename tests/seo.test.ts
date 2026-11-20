import { describe, it, expect } from "vitest";
import {
  stripMarkdown,
  calculateReadingTime,
  extractKeywords,
  generateMetaDescriptionSuggestions,
  performSeoAudit,
} from "../src/utils/seo";
import { formatHugoFrontMatter } from "../src/utils/hugo";
import { HugoPost } from "../src/types";

describe("SEO & Reading Time Utility Tests", () => {
  const sampleMarkdown = `
## Getting Started with Modern Web Architecture

In this guide, we will explore the core concepts of building scalable web applications.
We will delve into microservices, containerization, and static site generators.

{{< youtube PivpCKEiQOQ >}}

### Core Architecture Components

\`\`\`typescript
interface Config {
  port: number;
  host: string;
}
\`\`\`

Static site generation with Hugo offers lightning-fast delivery and top-notch SEO benefits.
Containerization ensures reproducible environments across production clusters.
`;

  describe("stripMarkdown", () => {
    it("strips Hugo shortcodes completely", () => {
      const input = "Check this video: {{< youtube PivpCKEiQOQ >}} and enjoy!";
      const stripped = stripMarkdown(input);
      expect(stripped).not.toContain("{{<");
      expect(stripped).not.toContain("youtube");
      expect(stripped).toContain("Check this video:");
      expect(stripped).toContain("and enjoy!");
    });

    it("strips fenced code blocks to prevent code syntax inflating word counts", () => {
      const input = "Here is some code:\n```typescript\nconst x = 10;\nconst y = 20;\n```\nDone.";
      const stripped = stripMarkdown(input);
      expect(stripped).not.toContain("const x = 10;");
      expect(stripped).toContain("Here is some code:");
      expect(stripped).toContain("Done.");
    });

    it("strips markdown headers, emphasis, and link syntax while preserving text", () => {
      const input = "### Check out [Hugo Docs](https://gohugo.io) for **super** *fast* sites!";
      const stripped = stripMarkdown(input);
      expect(stripped).not.toContain("###");
      expect(stripped).not.toContain("https://gohugo.io");
      expect(stripped).toContain("Hugo Docs");
      expect(stripped).toContain("super");
      expect(stripped).toContain("fast sites");
    });
  });

  describe("calculateReadingTime", () => {
    it("returns 0 words and 0 min read for empty or whitespace content", () => {
      const res = calculateReadingTime("");
      expect(res.words).toBe(0);
      expect(res.minutes).toBe(0);
      expect(res.text).toBe("0 min read");
    });

    it("calculates 1 min read for brief content under 200 words", () => {
      const words = Array(50).fill("architecture").join(" ");
      const res = calculateReadingTime(words);
      expect(res.words).toBe(50);
      expect(res.minutes).toBe(1);
      expect(res.text).toBe("1 min read");
    });

    it("calculates accurate reading time for longer text based on 200 WPM standard", () => {
      // 500 words -> Math.ceil(500 / 200) = 3 minutes
      const words = Array(500).fill("kubernetes").join(" ");
      const res = calculateReadingTime(words);
      expect(res.words).toBe(500);
      expect(res.minutes).toBe(3);
      expect(res.text).toBe("3 min read");
    });

    it("ignores Hugo shortcodes and code blocks when computing word counts", () => {
      const textWithShortcodes = `
      {{< youtube PivpCKEiQOQ >}}
      {{< instagram C3bXYZ >}}
      \`\`\`bash
      docker run -d -p 8080:80 nginx:latest
      \`\`\`
      Word one word two word three.
      `;
      const res = calculateReadingTime(textWithShortcodes);
      expect(res.words).toBe(6); // "Word one word two word three"
      expect(res.minutes).toBe(1);
    });
  });

  describe("extractKeywords", () => {
    it("extracts recurring keywords and filters out common stop words", () => {
      const text = "Hugo is great. Hugo static site generator is fast. Deploy Hugo to Cloud Run.";
      const keywords = extractKeywords(text, "Hugo Guide");
      expect(keywords.length).toBeGreaterThan(0);
      const hugoKeyword = keywords.find((k) => k.keyword.toLowerCase() === "hugo");
      expect(hugoKeyword).toBeDefined();
      expect(hugoKeyword?.count).toBe(3);
      expect(hugoKeyword?.isInTitle).toBe(true);
    });

    it("classifies keyword density appropriately", () => {
      const text = "Docker container container container container container Docker.";
      const keywords = extractKeywords(text);
      const containerKw = keywords.find((k) => k.keyword === "container");
      expect(containerKw).toBeDefined();
      expect(containerKw?.count).toBe(5);
    });
  });

  describe("generateMetaDescriptionSuggestions", () => {
    it("generates 2-3 descriptions with target length around 120-160 characters", () => {
      const post: HugoPost = {
        title: "Mastering Cloud Run Deployments with Docker and Terraform",
        scrapedTitle: "Mastering Cloud Run Deployments with Docker and Terraform",
        description: "A short initial summary.",
        suggestedSlug: "mastering-cloud-run",
        date: "2026-09-05",
        author: "Cloud Architect",
        hugoFrontMatter: "",
        markdownContent: sampleMarkdown,
        hugoFullFile: "",
        originalUrl: "https://cloud.google.com/run",
        summary: "Detailed overview of containerization and serverless Cloud Run deployments.",
        categories: ["Cloud", "DevOps"],
        tags: ["cloud-run", "docker", "terraform"],
      };

      const suggestions = generateMetaDescriptionSuggestions(post.title, sampleMarkdown, post.description);
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      suggestions.forEach((item) => {
        expect(item.text.length).toBeGreaterThan(50);
        expect(item.text.length).toBeLessThanOrEqual(165);
      });
    });
  });

  describe("performSeoAudit", () => {
    const validPost: HugoPost = {
      title: "Architecting Scalable Microservices with Docker and Kubernetes",
      scrapedTitle: "Architecting Scalable Microservices with Docker and Kubernetes",
      description: "Discover modern patterns for deploying resilient microservices with Docker, Kubernetes, and Hugo static sites.",
      suggestedSlug: "architecting-scalable-microservices",
      date: "2026-09-05",
      author: "Site Reliability Engineer",
      hugoFrontMatter: "",
      markdownContent: `## Overview of Microservices
Microservices architecture breaks large monolithic applications into smaller, independent services.
Each service runs in its own process and communicates with lightweight mechanisms.

### Containerization with Docker
Docker packages code and its dependencies together so the application runs quickly and reliably across environments.

## Deployment with Kubernetes
Kubernetes orchestrates containers, managing scaling, healing, and rolling updates seamlessly.

## Key Benefits
- Resilient infrastructure
- Independent scaling
- Faster release cycles
`,
      hugoFullFile: "",
      originalUrl: "https://example.com/microservices",
      summary: "Comprehensive guide to modern microservice patterns.",
      categories: ["Architecture", "DevOps"],
      tags: ["microservices", "docker", "kubernetes"],
    };

    it("calculates an SEO score and returns structured checklist items", () => {
      const audit = performSeoAudit(
        validPost.title,
        validPost.description,
        validPost.markdownContent,
        validPost.tags,
        validPost.categories
      );
      expect(audit.overallScore).toBeGreaterThanOrEqual(60);
      expect(audit.checks.length).toBeGreaterThanOrEqual(5);
      expect(audit.readingTime.words).toBeGreaterThan(50);
      expect(audit.readingTime.text).toContain("min read");
    });

    it("flags missing meta description or title that is too short", () => {
      const poorPost: HugoPost = {
        ...validPost,
        title: "Bad",
        description: "",
        markdownContent: "Too short.",
      };

      const audit = performSeoAudit(
        poorPost.title,
        poorPost.description,
        poorPost.markdownContent,
        poorPost.tags,
        poorPost.categories
      );
      expect(audit.overallScore).toBeLessThan(60);

      const titleCheck = audit.checks.find((c) => c.id === "title-length");
      expect(titleCheck?.status).toBe("warning");

      const descCheck = audit.checks.find((c) => c.id === "meta-desc-length");
      expect(descCheck?.status).toBe("fail");
    });
  });

  describe("formatHugoFrontMatter with readingTime and wordCount", () => {
    it("serializes reading_time and word_count into the YAML header", () => {
      const fm = formatHugoFrontMatter({
        title: "Building Static Sites with Hugo",
        date: "2026-09-05",
        description: "Learn how to build blazing fast static websites.",
        author: "Tech Blogger",
        categories: ["Web"],
        tags: ["hugo", "static-sites"],
        slug: "building-static-sites-with-hugo",
        readingTime: "4 min read",
        wordCount: 750,
      });

      expect(fm).toContain('reading_time: "4 min read"');
      expect(fm).toContain("word_count: 750");
    });
  });
});
