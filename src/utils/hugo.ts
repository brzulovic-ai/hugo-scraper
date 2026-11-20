import { HugoPost, GenerationOptions } from "../types";
import { generateOgImagePath } from "./ogImage";
export {
  calculateReadingTime,
  stripMarkdown,
  performSeoAudit,
  extractKeywords,
  generateMetaDescriptionSuggestions
} from "./seo";
export type { ReadingTimeResult, SeoAuditResult, KeywordAnalysis, MetaDescriptionSuggestion } from "./seo";
export { generateOgImageSvg, generateOgImagePath, svgToDataUri } from "./ogImage";
export type { OgImageOptions } from "./ogImage";

/**
 * Generate a clean, SEO-friendly URL slug from a title string.
 */
export function generateSlug(title: string): string {
  if (!title || !title.trim()) return "untitled-post";
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove non-alphanumeric chars except space and hyphen
    .replace(/[\s_-]+/g, "-") // replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens

  return slug.length > 0 ? slug : "untitled-post";
}

/**
 * Sanitize comma-separated tags or category strings into clean arrays.
 */
export function sanitizeTags(input: string): string[] {
  if (!input || typeof input !== "string") return [];
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .filter((tag, index, self) => self.indexOf(tag) === index); // unique
}

/**
 * Ensure the model name used is explicitly included in the tags list.
 */
export function ensureModelTag(tags: string[] = [], modelName?: string): string[] {
  const result = [...tags];
  if (!modelName || !modelName.trim()) return result;

  const rawModel = modelName.trim();
  // Strip namespace/provider prefix (e.g. "anthropic/claude-3-7-sonnet" -> "claude-3-7-sonnet")
  const baseModel = rawModel.includes("/") ? rawModel.split("/").pop()! : rawModel;
  
  const cleanModelTag = baseModel
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "-")
    .replace(/-+/g, "-");

  if (cleanModelTag && !result.some((t) => t.toLowerCase() === cleanModelTag)) {
    result.push(cleanModelTag);
  }

  return result.filter((tag, index, self) => self.indexOf(tag) === index);
}

export interface SupportedLanguage {
  id: "both" | "french" | "english";
  label: string;
  shortLabel: string;
  flag: string;
  description: string;
  default?: boolean;
  isBilingual: boolean;
  instructions: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    id: "both",
    label: "French & English (Bilingual / Bilingue)",
    shortLabel: "Both (FR & EN)",
    flag: "🇫🇷🇬🇧",
    default: true,
    isBilingual: true,
    instructions: "Generate dual-language bilingual content with parallel sections in French and English.",
    description: "Generates dual-language French & English content with bilingual frontmatter and parallel sections."
  },
  {
    id: "french",
    label: "French (Français)",
    shortLabel: "Français",
    flag: "🇫🇷",
    isBilingual: false,
    instructions: "Generate the post entirely in high-quality, fluent French (Français).",
    description: "Generates the post entirely in high-quality, fluent French."
  },
  {
    id: "english",
    label: "English",
    shortLabel: "English",
    flag: "🇬🇧",
    isBilingual: false,
    instructions: "Generate the post entirely in fluent, standard English.",
    description: "Generates the post entirely in English."
  }
];

export function getLanguageConfig(langId: string = "both"): SupportedLanguage {
  const lower = (langId || "").toLowerCase();
  if (lower.includes("fr") && !lower.includes("both") && !lower.includes("biling")) {
    return SUPPORTED_LANGUAGES[1];
  }
  if (lower.includes("en") && !lower.includes("both") && !lower.includes("biling")) {
    return SUPPORTED_LANGUAGES[2];
  }
  return SUPPORTED_LANGUAGES[0]; // default both
}

/**
 * Validate whether a string is a valid HTTP/HTTPS URL.
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return false;
    }
    const parsed = new URL(trimmed);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname && parsed.hostname.length > 0);
  } catch {
    return false;
  }
}

/**
 * Validate whether a string is a YouTube URL.
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/|live\/)|youtu\.be\/)/i.test(url.trim());
}

/**
 * Extract YouTube Video ID from any standard YouTube URL.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Handle youtu.be/ID
  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (youtuBeMatch && youtuBeMatch[1]) return youtuBeMatch[1];

  // Handle youtube.com/watch?v=ID or /shorts/ID or /embed/ID
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/|live\/))([a-zA-Z0-9_-]{11})/i);
  if (match && match[1]) return match[1];

  // Query parameter fallback
  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const v = parsed.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  } catch {
    // Ignore URL parse error
  }

  return null;
}

/**
 * Validate whether a string is an Instagram post/reel/video URL.
 */
export function isInstagramUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:instagram\.com|instagr\.am)\/(?:reel|p|tv|reels)\/([a-zA-Z0-9_-]+)/i.test(url.trim());
}

/**
 * Extract Instagram shortcode and media type (reel, post, tv).
 */
export function extractInstagramCode(url: string): { code: string; type: "reel" | "p" | "tv" } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:instagram\.com|instagr\.am)\/(reel|p|tv|reels)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[2]) {
    const rawType = match[1].toLowerCase();
    const type: "reel" | "p" | "tv" = rawType === "reels" || rawType === "reel" ? "reel" : rawType === "tv" ? "tv" : "p";
    return { code: match[2], type };
  }
  return null;
}

/**
 * Validate whether a string is a TikTok video URL.
 */
export function isTikTokUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:tiktok\.com\/(?:@[\w.-]+\/video\/\d+|t\/[\w-]+)|(?:vm|vt)\.tiktok\.com\/[\w-]+)/i.test(url.trim());
}

/**
 * Extract TikTok video metadata details (username, video ID, or shortcode).
 */
export function extractTikTokDetails(url: string): { username?: string; videoId?: string; shortCode?: string } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Full format: https://www.tiktok.com/@username/video/1234567890123456789
  const fullMatch = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)\/video\/(\d+)/i);
  if (fullMatch && fullMatch[2]) {
    return {
      username: fullMatch[1],
      videoId: fullMatch[2],
    };
  }

  // Short format: https://vm.tiktok.com/ZM.../ or https://vt.tiktok.com/.../ or https://www.tiktok.com/t/ZM.../
  const shortMatch = trimmed.match(/(?:(?:vm|vt)\.tiktok\.com|tiktok\.com\/t)\/([a-zA-Z0-9_-]+)/i);
  if (shortMatch && shortMatch[1]) {
    return {
      shortCode: shortMatch[1],
    };
  }

  return null;
}

/**
 * Detect the media category of a given URL.
 */
export function detectUrlMediaType(url: string): "youtube" | "instagram" | "tiktok" | "article" {
  if (isYouTubeUrl(url)) return "youtube";
  if (isInstagramUrl(url)) return "instagram";
  if (isTikTokUrl(url)) return "tiktok";
  return "article";
}

/**
 * Format structured Hugo YAML front matter.
 */
export function formatHugoFrontMatter(data: {
  title: string;
  date: string;
  description: string;
  author: string;
  categories: string[];
  tags: string[];
  slug?: string;
  originalUrl?: string;
  modelUsed?: string;
  model_used?: string;
  providerUsed?: string;
  provider_used?: string;
  readingTime?: string;
  reading_time?: string;
  wordCount?: number;
  word_count?: number;
  ogImage?: string;
  images?: string[];
  image?: string;
}): string {
  const cleanTitle = (data.title || "Untitled Post").replace(/"/g, '\\"');
  const cleanDesc = (data.description || "").replace(/"/g, '\\"');
  const cleanAuthor = (data.author || "Admin").replace(/"/g, '\\"');
  const cleanSlug = data.slug || generateSlug(data.title);
  
  const catsYaml = data.categories && data.categories.length > 0
    ? `\ncategories:\n${data.categories.map((c) => `  - "${c.replace(/"/g, '\\"')}"`).join("\n")}`
    : `\ncategories: []`;

  const effectiveModel = data.modelUsed || data.model_used;
  const effectiveProvider = data.providerUsed || data.provider_used;
  const effectiveReadingTime = data.readingTime || data.reading_time;
  const effectiveWordCount = data.wordCount ?? data.word_count;

  // Ensure model is included in tags
  const finalTags = ensureModelTag(data.tags || [], effectiveModel);

  const tagsYaml = finalTags.length > 0
    ? `\ntags:\n${finalTags.map((t) => `  - "${t.replace(/"/g, '\\"')}"`).join("\n")}`
    : `\ntags: []`;

  // Determine Open Graph image path
  const primaryOgImage = data.image || data.ogImage || (data.images && data.images.length > 0 ? data.images[0] : generateOgImagePath(cleanSlug));
  const effectiveImages = data.images && data.images.length > 0 ? data.images : [primaryOgImage];
  const imagesYaml = `\nimages:\n${effectiveImages.map((img) => `  - "${img.replace(/"/g, '\\"')}"`).join("\n")}`;
  const imageMeta = `\nimage: "${primaryOgImage.replace(/"/g, '\\"')}"`;

  const sourceMeta = data.originalUrl ? `\nsource_url: "${data.originalUrl}"` : "";
  const modelMeta = effectiveModel ? `\nmodel_used: "${effectiveModel}"` : "";
  const providerMeta = effectiveProvider ? `\nprovider_used: "${effectiveProvider}"` : "";
  const readingMeta = effectiveReadingTime ? `\nreading_time: "${effectiveReadingTime}"` : "";
  const wordCountMeta = typeof effectiveWordCount === "number" ? `\nword_count: ${effectiveWordCount}` : "";

  return `---
title: "${cleanTitle}"
date: ${data.date || new Date().toISOString()}
draft: false
description: "${cleanDesc}"
slug: "${cleanSlug}"
author: "${cleanAuthor}"${catsYaml}${tagsYaml}${imageMeta}${imagesYaml}${modelMeta}${providerMeta}${readingMeta}${wordCountMeta}${sourceMeta}
---`;
}

/**
 * Combine YAML front matter and Markdown content cleanly.
 */
export function assembleHugoMarkdown(frontMatter: string, markdownContent: string): string {
  const trimmedFm = frontMatter ? frontMatter.trim() : "---";
  const trimmedContent = markdownContent ? markdownContent.trim() : "";
  return `${trimmedFm}\n\n${trimmedContent}\n`;
}

/**
 * Parse URL search query parameters for automated GET caller workflows.
 */
export function parseQueryParameters(queryString: string): {
  url: string;
  proceed: boolean;
  options: Partial<GenerationOptions>;
} {
  const searchParams = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);
  const targetUrl = searchParams.get("url") || searchParams.get("target") || "";
  const proceedParam = searchParams.get("proceed") || searchParams.get("auto");
  const shouldProceed = proceedParam === "1" || proceedParam === "true" || proceedParam === "yes";

  return {
    url: targetUrl.trim(),
    proceed: shouldProceed && Boolean(targetUrl.trim()),
    options: {
      tone: searchParams.get("tone") || undefined,
      author: searchParams.get("author") || undefined,
      language: searchParams.get("lang") || searchParams.get("language") || undefined,
      customCategories: searchParams.get("categories") || searchParams.get("cat") || undefined,
      customTags: searchParams.get("tags") || searchParams.get("tag") || undefined,
      model: searchParams.get("model") || undefined,
      remoteCapability: searchParams.get("remote") || searchParams.get("engine") || undefined,
    },
  };
}
