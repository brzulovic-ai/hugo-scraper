export interface HugoPost {
  title: string;
  description: string;
  suggestedSlug: string;
  categories: string[];
  tags: string[];
  hugoFrontMatter: string;
  markdownContent: string;
  summary: string;
  hugoFullFile: string;
  originalUrl: string;
  scrapedTitle: string;
  date: string;
  author: string;
  modelUsed?: string;
  providerUsed?: "gemini" | "groq" | "ollama" | "litellm";
  mediaType?: "article" | "youtube" | "instagram" | "tiktok";
  isYouTube?: boolean;
  youtubeVideoId?: string;
  youtubeThumbnail?: string;
  isInstagram?: boolean;
  instagramShortcode?: string;
  instagramThumbnail?: string;
  instagramType?: "reel" | "p" | "tv";
  isTikTok?: boolean;
  tiktokVideoId?: string;
  tiktokUsername?: string;
  tiktokThumbnail?: string;
  rawTranscript?: string;
  savedFilePath?: string;
  readingTime?: string;
  wordCount?: number;
  ogImage?: string;
  images?: string[];
}

export interface UserSettingsProfile {
  savedAt: number;
  author: string;
  tone: string;
  language: string;
  customCategories: string;
  customTags: string;
  provider: "gemini" | "groq" | "ollama" | "litellm";
  model: string;
  remoteCapability: string;
  includeTranscript?: boolean;
  ollamaBaseUrl?: string;
  litellmBaseUrl?: string;
}

export interface GenerationOptions {
  author: string;
  tone: string;
  language: string;
  customCategories: string;
  customTags: string;
  provider?: "gemini" | "groq" | "ollama" | "litellm";
  model: string;
  remoteCapability: string; // "google-free" | "direct" | "reader-proxy"
  includeTranscript?: boolean;
  ollamaBaseUrl?: string;
  ollamaApiKey?: string;
  groqApiKey?: string;
  litellmBaseUrl?: string;
  litellmApiKey?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  url: string;
  post: HugoPost;
  options: GenerationOptions;
}

