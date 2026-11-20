import express from "express";
import path from "path";
import fs from "fs";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { generateOgImageSvg, generateOgImagePath } from "./src/utils/ogImage";
import { linkifyYouTubeTimestampsInMarkdown, formatFullTranscriptSection } from "./src/utils/youtube";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: "5mb" }));

// Initialize Gemini SDK lazily
let aiClient: GoogleGenAI | null = null;

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY environment variable is not configured in Secrets. Please configure it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to check if URL is YouTube
function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)/i.test(url.trim());
}

// Extract 11-char YouTube video ID
function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];
  const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];
  const embedMatch = trimmed.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

// Decode HTML entities in transcripts
function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/\s+/g, " ")
    .trim();
}

// Format seconds into [MM:SS] or [HH:MM:SS]
function formatSecondsToTimestamp(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "[00:00]";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const paddedMins = mins.toString().padStart(2, "0");
  const paddedSecs = secs.toString().padStart(2, "0");
  if (hrs > 0) {
    const paddedHrs = hrs.toString().padStart(2, "0");
    return `[${paddedHrs}:${paddedMins}:${paddedSecs}]`;
  }
  return `[${paddedMins}:${paddedSecs}]`;
}

// Format transcript items into timestamped paragraphs
function formatTranscriptSegments(segments: Array<{ text: string; start: number }>, intervalSeconds: number = 30): string {
  if (!segments || segments.length === 0) return "";
  const paragraphs: string[] = [];
  let currentText: string[] = [];
  let currentStart = segments[0].start;

  segments.forEach((seg, index) => {
    const cleaned = decodeHtmlEntities(seg.text);
    if (!cleaned) return;

    if (seg.start - currentStart >= intervalSeconds && currentText.length > 0) {
      const ts = formatSecondsToTimestamp(currentStart);
      paragraphs.push(`${ts} ${currentText.join(" ")}`);
      currentText = [cleaned];
      currentStart = seg.start;
    } else {
      currentText.push(cleaned);
    }

    if (index === segments.length - 1 && currentText.length > 0) {
      const ts = formatSecondsToTimestamp(currentStart);
      paragraphs.push(`${ts} ${currentText.join(" ")}`);
    }
  });

  return paragraphs.join("\n\n");
}

// Data model for extracted web content or video metadata
interface ScrapedResult {
  title: string;
  metaDescription: string;
  scrapedContent: string;
  url: string;
  mediaType?: "article" | "youtube" | "instagram" | "tiktok";
  isYouTube?: boolean;
  videoId?: string;
  thumbnailUrl?: string;
  author?: string;
  rawTranscript?: string;
  isInstagram?: boolean;
  instagramShortcode?: string;
  instagramType?: "reel" | "p" | "tv";
  isTikTok?: boolean;
  tiktokVideoId?: string;
  tiktokUsername?: string;
}

// Helper to check if URL is Instagram
function isInstagramUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:https?:\/\/)?(?:www\.|m\.)?(?:instagram\.com|instagr\.am)\/(?:reel|p|tv|reels)\/([a-zA-Z0-9_-]+)/i.test(url.trim());
}

// Extract Instagram shortcode and type
function extractInstagramCode(url: string): { code: string; type: "reel" | "p" | "tv" } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const match = trimmed.match(/(?:instagram\.com|instagr\.am)\/(reel|p|tv|reels)\/([a-zA-Z0-9_-]+)/i);
  if (match && match[2]) {
    const rawType = match[1].toLowerCase();
    const type: "reel" | "p" | "tv" = rawType.startsWith("reel") ? "reel" : rawType === "tv" ? "tv" : "p";
    return { code: match[2], type };
  }
  return null;
}

// Helper to check if URL is TikTok
function isTikTokUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  return /(?:https?:\/\/)?(?:www\.|m\.|vm\.|vt\.)?(?:tiktok\.com\/(?:@[\w.-]+\/video\/\d+|t\/[\w-]+)|(?:vm|vt)\.tiktok\.com\/[\w-]+)/i.test(url.trim());
}

// Extract TikTok details
function extractTikTokDetails(url: string): { username?: string; videoId?: string; shortCode?: string } | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const fullMatch = trimmed.match(/tiktok\.com\/@([a-zA-Z0-9_.-]+)\/video\/(\d+)/i);
  if (fullMatch && fullMatch[2]) {
    return {
      username: fullMatch[1],
      videoId: fullMatch[2],
    };
  }
  const shortMatch = trimmed.match(/(?:(?:vm|vt)\.tiktok\.com|tiktok\.com\/t)\/([a-zA-Z0-9_-]+)/i);
  if (shortMatch && shortMatch[1]) {
    return {
      shortCode: shortMatch[1],
    };
  }
  return null;
}

// Extract Instagram Reel / Video details, captions, and creator metadata
async function scrapeAndSummarizeInstagram(targetUrl: string, code: string, type: "reel" | "p" | "tv"): Promise<ScrapedResult> {
  let title = type === "reel" ? "Instagram Reel" : "Instagram Video Post";
  let author = "Instagram Creator";
  let thumbnailUrl = `https://www.instagram.com/p/${code}/media/?size=l`;
  let captionText = "";

  console.log(`[Instagram] Fetching metadata for ${type} code: ${code}`);

  // 1. Fetch Instagram captioned embed (open HTML payload without strict auth)
  try {
    const embedUrl = `https://www.instagram.com/p/${code}/embed/captioned/`;
    const embedRes = await fetch(embedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (embedRes.ok) {
      const html = await embedRes.text();
      const $ = cheerio.load(html);
      
      const username = $(".CaptionUsername").first().text().trim() || $(".UsernameText").first().text().trim();
      if (username) {
        author = username.startsWith("@") ? username : `@${username}`;
      }

      const captionContent = $(".Caption").first().text().trim() || $(".HoverCard").text().trim();
      if (captionContent) {
        captionText = captionContent.replace(/\s+/g, " ").trim();
      }

      const ogImg = $("img.EmbeddedMediaImage").attr("src") || $('meta[property="og:image"]').attr("content");
      if (ogImg) {
        thumbnailUrl = ogImg;
      }
    }
  } catch (embedErr) {
    console.warn("[Instagram] Embed fetch notice:", embedErr);
  }

  // 2. Fallback to Jina Reader Proxy
  if (!captionText || captionText.length < 30) {
    try {
      console.log(`[Instagram] Trying Jina Reader proxy for Instagram code: ${code}`);
      const proxyUrl = `https://r.jina.ai/https://www.instagram.com/reel/${code}/`;
      const proxyRes = await fetch(proxyUrl, {
        headers: { "Accept": "text/plain" },
        signal: AbortSignal.timeout(10000),
      });
      if (proxyRes.ok) {
        const proxyText = await proxyRes.text();
        if (proxyText && proxyText.length > 50) {
          captionText = proxyText.slice(0, 35000);
          console.log(`[Instagram] Extracted Instagram text via Reader Proxy.`);
        }
      }
    } catch (proxyErr) {
      console.warn("[Instagram] Reader proxy notice:", proxyErr);
    }
  }

  if (captionText) {
    const firstLine = captionText.split("\n")[0].slice(0, 80);
    if (firstLine.length > 5) {
      title = `${author}: ${firstLine}`;
    }
  }

  const contentBlock = captionText
    ? `[Instagram ${type.toUpperCase()} Metadata]:\nShortcode: ${code}\nCreator: ${author}\nURL: ${targetUrl}\n\n[Post Caption, Audio & Spoken Highlights]:\n${captionText}`
    : `[Instagram ${type.toUpperCase()} Metadata]:\nShortcode: ${code}\nCreator: ${author}\nURL: ${targetUrl}\n\n[Note]: Direct video captions were brief; generate an authoritative Hugo tech post and conceptual breakdown based on the topic and creator context.`;

  return {
    title,
    metaDescription: captionText ? captionText.slice(0, 280) : `Instagram ${type} by ${author}`,
    scrapedContent: contentBlock.slice(0, 35000),
    url: targetUrl,
    mediaType: "instagram",
    isInstagram: true,
    instagramShortcode: code,
    instagramType: type,
    thumbnailUrl,
    author,
    rawTranscript: captionText || "",
  };
}

// Extract TikTok video metadata, oEmbed details, and captions
async function scrapeAndSummarizeTikTok(targetUrl: string, details?: { username?: string; videoId?: string; shortCode?: string } | null): Promise<ScrapedResult> {
  let title = "TikTok Video";
  let author = details?.username ? `@${details.username}` : "TikTok Creator";
  let videoId = details?.videoId || "";
  let thumbnailUrl = "";
  let rawCaption = "";

  console.log(`[TikTok] Fetching metadata for URL: ${targetUrl}`);

  // 1. TikTok official oEmbed API
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
    const oembedRes = await fetch(oembedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (oembedRes.ok) {
      const oembedData: any = await oembedRes.json();
      if (oembedData.title) {
        title = oembedData.title;
        rawCaption = oembedData.title;
      }
      if (oembedData.author_name) {
        author = oembedData.author_unique_id ? `@${oembedData.author_unique_id}` : (oembedData.author_name.startsWith("@") ? oembedData.author_name : `@${oembedData.author_name}`);
      }
      if (oembedData.thumbnail_url) {
        thumbnailUrl = oembedData.thumbnail_url;
      }
    }
  } catch (oembedErr) {
    console.warn("[TikTok] oEmbed fetch notice:", oembedErr);
  }

  // 2. Direct page fetch or Jina Reader fallback for transcripts, sounds, hashtags
  try {
    const proxyUrl = `https://r.jina.ai/${targetUrl}`;
    const proxyRes = await fetch(proxyUrl, {
      headers: { "Accept": "text/plain" },
      signal: AbortSignal.timeout(10000),
    });
    if (proxyRes.ok) {
      const proxyText = await proxyRes.text();
      if (proxyText && proxyText.length > 50) {
        if (!rawCaption || rawCaption.length < proxyText.length) {
          rawCaption = proxyText.slice(0, 35000);
        }
      }
    }
  } catch (proxyErr) {
    console.warn("[TikTok] Reader proxy notice:", proxyErr);
  }

  const contentBlock = rawCaption
    ? `[TikTok Video Metadata]:\nVideo ID: ${videoId || "N/A"}\nCreator: ${author}\nOriginal URL: ${targetUrl}\n\n[TikTok Video Caption, Sound, Audio & Transcript]:\n${rawCaption}`
    : `[TikTok Video Metadata]:\nVideo ID: ${videoId || "N/A"}\nCreator: ${author}\nOriginal URL: ${targetUrl}\n\n[Note]: Provide a structured, engaging Hugo tech blog post explaining the core concept covered in this TikTok video.`;

  return {
    title: title !== "TikTok Video" ? title : `${author} on TikTok`,
    metaDescription: rawCaption ? rawCaption.slice(0, 280) : `TikTok video summary by ${author}`,
    scrapedContent: contentBlock.slice(0, 35000),
    url: targetUrl,
    mediaType: "tiktok",
    isTikTok: true,
    tiktokVideoId: videoId,
    tiktokUsername: details?.username || author.replace(/^@/, ""),
    thumbnailUrl: thumbnailUrl || "https://sf16-website-login.neutral.ttwstatic.com/obj/tiktok_web_login_static/tiktok/webapp/main/webapp-desktop/8583d42341103d164ec6.png",
    author,
    rawTranscript: rawCaption || "",
  };
}

// Extract YouTube transcript, oEmbed details, and metadata
async function scrapeAndTranscribeYouTube(targetUrl: string, videoId: string): Promise<ScrapedResult> {
  let title = "YouTube Video";
  let author = "YouTube Creator";
  let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  let transcriptText = "";
  let description = "";

  console.log(`[YouTube] Fetching metadata and transcript for video ID: ${videoId}`);

  // 1. Fetch official oEmbed metadata
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const oembedRes = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
    if (oembedRes.ok) {
      const oembedData: any = await oembedRes.json();
      if (oembedData.title) title = oembedData.title;
      if (oembedData.author_name) author = oembedData.author_name;
      if (oembedData.thumbnail_url) thumbnailUrl = oembedData.thumbnail_url;
    }
  } catch (err) {
    console.warn(`[YouTube] oEmbed fetch notice:`, err);
  }

  // 2. Fetch video page HTML to extract caption tracks
  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(videoPageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const $ = cheerio.load(html);
      const metaDesc = $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content") || "";
      if (metaDesc) description = metaDesc;

      const playerMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s) ||
                          html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;/s) ||
                          html.match(/"captionTracks":\s*(\[.+?\])/s);

      let captionTracks: any[] = [];

      if (playerMatch) {
        try {
          if (playerMatch[1].startsWith("[")) {
            captionTracks = JSON.parse(playerMatch[1]);
          } else {
            const playerResponse = JSON.parse(playerMatch[1]);
            if (playerResponse?.videoDetails?.title && title === "YouTube Video") {
              title = playerResponse.videoDetails.title;
            }
            if (playerResponse?.videoDetails?.author && author === "YouTube Creator") {
              author = playerResponse.videoDetails.author;
            }
            if (playerResponse?.videoDetails?.shortDescription && !description) {
              description = playerResponse.videoDetails.shortDescription;
            }
            captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
          }
        } catch (parseErr) {
          console.warn("[YouTube] Error parsing playerResponse:", parseErr);
        }
      }

      if (captionTracks && captionTracks.length > 0) {
        const selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith("en") || t.vssId?.includes(".en")) || captionTracks[0];

        if (selectedTrack?.baseUrl) {
          try {
            console.log(`[YouTube] Fetching caption track: ${selectedTrack.languageCode || "auto"}...`);
            const captionsRes = await fetch(selectedTrack.baseUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              signal: AbortSignal.timeout(8000),
            });

            if (captionsRes.ok) {
              const captionData = await captionsRes.text();
              if (captionData.includes("<text") || captionData.includes("<transcript>")) {
                const $c = cheerio.load(captionData, { xmlMode: true });
                const segments: Array<{ text: string; start: number }> = [];

                $c("text").each((_, el) => {
                  const $el = $c(el);
                  const start = parseFloat($el.attr("start") || "0");
                  const raw = $el.text();
                  const cleaned = decodeHtmlEntities(raw);
                  if (cleaned) {
                    segments.push({ text: cleaned, start });
                  }
                });

                if (segments.length > 0) {
                  transcriptText = formatTranscriptSegments(segments, 30);
                  console.log(`[YouTube] Successfully extracted ${segments.length} caption chunks.`);
                }
              }
            }
          } catch (captionFetchErr) {
            console.warn("[YouTube] Failed to fetch caption track baseUrl:", captionFetchErr);
          }
        }
      }
    }
  } catch (pageErr) {
    console.warn("[YouTube] Error fetching video page:", pageErr);
  }

  // 3. Fallback: Jina Reader Proxy (handles YouTube videos, chapters, and transcripts)
  if (!transcriptText || transcriptText.length < 60) {
    try {
      console.log(`[YouTube] Trying Jina Reader proxy for YouTube transcript: ${videoId}`);
      const proxyUrl = `https://r.jina.ai/https://www.youtube.com/watch?v=${videoId}`;
      const proxyRes = await fetch(proxyUrl, {
        headers: { "Accept": "text/plain" },
        signal: AbortSignal.timeout(10000),
      });
      if (proxyRes.ok) {
        const proxyText = await proxyRes.text();
        if (proxyText && proxyText.length > 100) {
          transcriptText = proxyText.slice(0, 35000);
          console.log(`[YouTube] Successfully extracted transcript via Reader Proxy.`);
        }
      }
    } catch (proxyErr) {
      console.warn("[YouTube] Reader proxy fallback notice:", proxyErr);
    }
  }

  let contentBlock = "";
  if (transcriptText) {
    contentBlock = `[YouTube Video Transcript with Timestamps]:\n${transcriptText}`;
  } else if (description) {
    contentBlock = `[YouTube Video Description & Overview]:\n${description}`;
  } else {
    contentBlock = `[YouTube Video ID]: ${videoId}\n[Video Title]: ${title}\n[Channel]: ${author}\n[Note]: Video captions were private or unavailable; provide a structured, in-depth tutorial and concept breakdown for this topic.`;
  }

  return {
    title: `${title}`,
    metaDescription: description ? description.slice(0, 300) : `YouTube Video summary and transcript by ${author}`,
    scrapedContent: contentBlock.slice(0, 35000),
    url: targetUrl,
    isYouTube: true,
    videoId,
    thumbnailUrl,
    author,
    rawTranscript: transcriptText || description || "",
  };
}

// Scrape URL and extract content with fallback remote capabilities
async function scrapeUrl(targetUrl: string, remoteCapability: string = "google-free"): Promise<ScrapedResult> {
  let formattedUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  // Basic URL validation
  try {
    new URL(formattedUrl);
  } catch (err) {
    throw new Error("Invalid URL format. Please paste a valid web address.");
  }

  // Check if YouTube URL
  if (isYouTubeUrl(formattedUrl)) {
    const videoId = extractYouTubeVideoId(formattedUrl);
    if (videoId) {
      return await scrapeAndTranscribeYouTube(formattedUrl, videoId);
    }
  }

  // Check if Instagram Reel or Video URL
  if (isInstagramUrl(formattedUrl)) {
    const igDetails = extractInstagramCode(formattedUrl);
    if (igDetails) {
      return await scrapeAndSummarizeInstagram(formattedUrl, igDetails.code, igDetails.type);
    }
  }

  // Check if TikTok Video URL
  if (isTikTokUrl(formattedUrl)) {
    const ttDetails = extractTikTokDetails(formattedUrl);
    return await scrapeAndSummarizeTikTok(formattedUrl, ttDetails);
  }

  // Helper to extract via Cheerio
  const parseHtmlWithCheerio = (html: string): ScrapedResult => {
    const $ = cheerio.load(html);

    // Get metadata
    const pageTitle = $("title").text().trim() || $("h1").first().text().trim() || "Untitled Scraped Page";
    const metaDescription = 
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      "";

    // Strip unnecessary elements
    $("script, style, svg, iframe, noscript, nav, footer, header, aside, link, .header, .footer, .nav, .sidebar, .comments").remove();

    // Extract main content areas
    let contentContainer = $("article");
    if (contentContainer.length === 0) {
      contentContainer = $("[class*='article'], [class*='post'], [class*='content'], [id*='article'], [id*='post'], [id*='content']");
    }
    if (contentContainer.length === 0) {
      contentContainer = $("main");
    }
    if (contentContainer.length === 0) {
      contentContainer = $("body");
    }

    // Capture main paragraphs, lists, tables, and headings
    const scrapedElements: string[] = [];
    
    if (metaDescription) {
      scrapedElements.push(`[Meta Description]: ${metaDescription}`);
    }

    contentContainer.find("h1, h2, h3, h4, p, li, table, pre, code").each((_, element) => {
      const el = $(element);
      const tagName = element.tagName.toLowerCase();
      const text = el.text().replace(/\s+/g, " ").trim();
      
      if (text.length > 3) {
        if (tagName.startsWith("h")) {
          scrapedElements.push(`[Header ${tagName}]: ${text}`);
        } else if (tagName === "li") {
          scrapedElements.push(`[List Item]: ${text}`);
        } else if (tagName === "pre" || tagName === "code") {
          scrapedElements.push(`[Code/Snippet]: ${text}`);
        } else if (tagName === "table") {
          scrapedElements.push(`[TableData]: ${text}`);
        } else {
          scrapedElements.push(text);
        }
      }
    });

    const fullText = scrapedElements.join("\n\n");
    return {
      title: pageTitle,
      metaDescription,
      scrapedContent: fullText.slice(0, 35000),
      url: formattedUrl,
      isYouTube: false,
      videoId: undefined,
      thumbnailUrl: undefined,
      author: undefined,
      rawTranscript: undefined
    };
  };

  try {
    console.log(`[Scraper] Fetching: ${formattedUrl} using mode: ${remoteCapability}`);

    let fetchSuccess = false;
    let htmlContent = "";

    // If reader proxy is forced or default fallback
    if (remoteCapability === "reader-proxy") {
      try {
        const proxyUrl = `https://r.jina.ai/${formattedUrl}`;
        const proxyRes = await fetch(proxyUrl, {
          headers: {
            "Accept": "text/plain",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          }
        });
        if (proxyRes.ok) {
          const proxyText = await proxyRes.text();
          if (proxyText && proxyText.length > 100) {
            return {
              title: formattedUrl,
              metaDescription: "Extracted via Remote Reader Proxy",
              scrapedContent: proxyText.slice(0, 35000),
              url: formattedUrl,
              isYouTube: false,
              videoId: undefined,
              thumbnailUrl: undefined,
              author: undefined,
              rawTranscript: undefined
            };
          }
        }
      } catch (proxyErr) {
        console.warn("[Scraper] Reader proxy attempt failed, falling back to direct fetch", proxyErr);
      }
    }

    // Direct fetch with browser-like headers
    try {
      const response = await fetch(formattedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        },
        redirect: "follow",
        signal: AbortSignal.timeout(12000)
      });

      if (response.ok) {
        htmlContent = await response.text();
        fetchSuccess = true;
      } else {
        console.warn(`[Scraper] Direct fetch returned status ${response.status}`);
      }
    } catch (directErr: any) {
      console.warn(`[Scraper] Direct fetch error: ${directErr.message}`);
    }

    // If direct fetch didn't yield usable HTML or failed, attempt remote reader proxy fallback
    if (!fetchSuccess || htmlContent.length < 200) {
      console.log(`[Scraper] Attempting remote proxy extraction for: ${formattedUrl}`);
      try {
        const proxyUrl = `https://r.jina.ai/${formattedUrl}`;
        const proxyRes = await fetch(proxyUrl, {
          headers: { "Accept": "text/plain" },
          signal: AbortSignal.timeout(10000)
        });
        if (proxyRes.ok) {
          const proxyText = await proxyRes.text();
          if (proxyText && proxyText.length > 50) {
            return {
              title: formattedUrl,
              metaDescription: "Extracted via Remote Reader fallback",
              scrapedContent: proxyText.slice(0, 35000),
              url: formattedUrl,
              isYouTube: false,
              videoId: undefined,
              thumbnailUrl: undefined,
              author: undefined,
              rawTranscript: undefined
            };
          }
        }
      } catch (proxyFallbackErr) {
        console.warn("[Scraper] Remote proxy fallback also failed", proxyFallbackErr);
      }
    }

    if (!htmlContent) {
      throw new Error(`Unable to fetch content from ${formattedUrl}. The remote server may be blocking scrapers or unreachable.`);
    }

    const parsed = parseHtmlWithCheerio(htmlContent);
    if (!parsed.scrapedContent || parsed.scrapedContent.trim().length === 0) {
      throw new Error("Page was fetched, but no readable body text could be extracted.");
    }

    return parsed;
  } catch (error: any) {
    console.error("Scraping error:", error);
    throw new Error(error.message || "Failed to access or scrape the URL. Please ensure it is public and accessible.");
  }
}

// Helper to extract and parse JSON from text responses robustly
function extractJsonFromText(rawText: string): any {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty model response received.");
  }

  const trimmed = rawText.trim();

  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to extractors
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

// Groq Free Models Generator (OpenAI compatible LPU endpoint)
async function generateWithGroq(params: {
  systemInstruction: string;
  userPrompt: string;
  model: string;
  apiKey?: string;
}): Promise<{ resultJson: any; modelUsed: string }> {
  const { systemInstruction, userPrompt, model, apiKey } = params;
  const effectiveApiKey = apiKey || process.env.GROQ_API_KEY;

  if (!effectiveApiKey || effectiveApiKey === "MY_GROQ_API_KEY") {
    throw new Error(
      "GROQ_API_KEY is not configured. Please supply your free Groq API key in the Groq settings or configure GROQ_API_KEY in the environment (https://console.groq.com/keys)."
    );
  }

  const targetModel = model || "llama-3.3-70b-versatile";
  console.log(`[Groq] Calling Groq model ${targetModel}...`);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${effectiveApiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "aistudio-hugo-builder"
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        {
          role: "system",
          content: `${systemInstruction}\n\nCRITICAL INSTRUCTION: You MUST reply with a single, valid JSON object containing exactly these keys: title, description, suggestedSlug, categories, tags, hugoFrontMatter, markdownContent, summary. Do not output any preamble or commentary outside the JSON.`
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4096
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr: any = null;
    try {
      parsedErr = JSON.parse(errText);
    } catch {}
    const message = parsedErr?.error?.message || errText || `Groq API returned status ${response.status}`;
    throw new Error(`Groq API error (${response.status}): ${message}`);
  }

  const resData: any = await response.json();
  const rawContent = resData.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Groq API returned an empty completion content.");
  }

  const parsedJson = extractJsonFromText(rawContent);
  return { resultJson: parsedJson, modelUsed: targetModel };
}

// Ollama Free Local Models Generator (Local / Self-hosted Daemon)
async function generateWithOllama(params: {
  systemInstruction: string;
  userPrompt: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<{ resultJson: any; modelUsed: string }> {
  const { systemInstruction, userPrompt, model, baseUrl, apiKey } = params;
  let targetBaseUrl = (baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434").trim();
  targetBaseUrl = targetBaseUrl.replace(/\/+$/, "");

  const effectiveApiKey = (apiKey || process.env.OLLAMA_API_KEY || "").trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (effectiveApiKey) {
    headers["Authorization"] = `Bearer ${effectiveApiKey}`;
  }

  const targetModel = model || "llama3.2";
  console.log(`[Ollama] Calling Ollama model ${targetModel} at ${targetBaseUrl}...`);

  // 1. Try native Ollama /api/chat with format: "json"
  try {
    const chatResponse = await fetch(`${targetBaseUrl}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: targetModel,
        messages: [
          {
            role: "system",
            content: `${systemInstruction}\n\nCRITICAL INSTRUCTION: You MUST output a single, raw, valid JSON object containing title, description, suggestedSlug, categories, tags, hugoFrontMatter, markdownContent, and summary. No conversational preambles.`
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        format: "json",
        stream: false,
        options: {
          temperature: 0.2
        }
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (chatResponse.ok) {
      const resData: any = await chatResponse.json();
      const rawContent = resData.message?.content || resData.response;
      if (rawContent) {
        const parsedJson = extractJsonFromText(rawContent);
        return { resultJson: parsedJson, modelUsed: targetModel };
      }
    }
  } catch (chatErr: any) {
    console.warn(`[Ollama] /api/chat attempt notice: ${chatErr.message}`);
  }

  // 2. Fallback to /api/generate
  try {
    const fullPrompt = `${systemInstruction}\n\n${userPrompt}\n\nCRITICAL: Respond with a single JSON object containing title, description, suggestedSlug, categories, tags, hugoFrontMatter, markdownContent, summary.`;
    const genResponse = await fetch(`${targetBaseUrl}/api/generate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: targetModel,
        prompt: fullPrompt,
        format: "json",
        stream: false,
        options: {
          temperature: 0.2
        }
      }),
      signal: AbortSignal.timeout(60000)
    });

    if (genResponse.ok) {
      const resData: any = await genResponse.json();
      if (resData.response) {
        const parsedJson = extractJsonFromText(resData.response);
        return { resultJson: parsedJson, modelUsed: targetModel };
      }
    } else {
      const errText = await genResponse.text();
      throw new Error(`Ollama returned status ${genResponse.status}: ${errText}`);
    }
  } catch (genErr: any) {
    throw new Error(
      `Unable to connect to Ollama at ${targetBaseUrl}. Please verify that Ollama is running ('ollama serve') and that the model '${targetModel}' is downloaded ('ollama pull ${targetModel}'). Error: ${genErr.message}`
    );
  }

  throw new Error(`Ollama did not return a valid response for model '${targetModel}'.`);
}

// LiteLLM Proxy Generator (OpenAI-compatible proxy at 192.168.1.17:4100 or custom host)
async function generateWithLiteLLM(params: {
  systemInstruction: string;
  userPrompt: string;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<{ resultJson: any; modelUsed: string }> {
  const { systemInstruction, userPrompt, model, baseUrl, apiKey } = params;
  let targetBaseUrl = (baseUrl || process.env.LITELLM_BASE_URL || "http://192.168.1.17:4100").trim();
  targetBaseUrl = targetBaseUrl.replace(/\/+$/, "");

  const effectiveApiKey = (apiKey || process.env.LITELLM_API_KEY || "").trim();
  const targetModel = model || "gpt-4o-mini";
  console.log(`[LiteLLM] Calling LiteLLM Proxy model '${targetModel}' at ${targetBaseUrl}...`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "aistudio-hugo-builder"
  };
  if (effectiveApiKey) {
    headers["Authorization"] = `Bearer ${effectiveApiKey}`;
  }

  const endpointCandidates = targetBaseUrl.endsWith("/v1")
    ? [`${targetBaseUrl}/chat/completions`]
    : [`${targetBaseUrl}/v1/chat/completions`, `${targetBaseUrl}/chat/completions`];

  const payloadWithFormat = {
    model: targetModel,
    messages: [
      {
        role: "system",
        content: `${systemInstruction}\n\nCRITICAL INSTRUCTION: You MUST reply with a single, valid JSON object containing exactly these keys: title, description, suggestedSlug, categories, tags, hugoFrontMatter, markdownContent, summary. Do not output any preamble or commentary outside the JSON.`
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 4096
  };

  let lastError: any = null;

  for (const endpoint of endpointCandidates) {
    try {
      // 1. Try with response_format json_object
      let response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payloadWithFormat),
        signal: AbortSignal.timeout(45000)
      });

      // 2. If 400 with response_format unsupported, retry without response_format
      if (!response.ok && response.status === 400) {
        const errBody = await response.clone().text();
        if (errBody.includes("response_format") || errBody.includes("json_object") || errBody.includes("schema")) {
          const { response_format, ...payloadWithoutFormat } = payloadWithFormat;
          response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(payloadWithoutFormat),
            signal: AbortSignal.timeout(45000)
          });
        }
      }

      if (response.ok) {
        const resData: any = await response.json();
        const rawContent = resData.choices?.[0]?.message?.content;
        if (!rawContent) {
          throw new Error("LiteLLM Proxy returned an empty message completion.");
        }
        const parsedJson = extractJsonFromText(rawContent);
        return { resultJson: parsedJson, modelUsed: targetModel };
      } else {
        const errText = await response.text();
        let parsedErr: any = null;
        try {
          parsedErr = JSON.parse(errText);
        } catch {}
        const message = parsedErr?.error?.message || errText || `LiteLLM Proxy returned status ${response.status}`;
        lastError = new Error(`LiteLLM Proxy error (${response.status}) at ${endpoint}: ${message}`);
      }
    } catch (fetchErr: any) {
      lastError = fetchErr;
      console.warn(`[LiteLLM] Connection to ${endpoint} failed: ${fetchErr.message}`);
    }
  }

  throw (
    lastError ||
    new Error(
      `Failed to connect to LiteLLM Proxy at ${targetBaseUrl}. Please ensure the proxy is running and accessible from this container, and verify the API key.`
    )
  );
}

// Helper to save Hugo markdown file to /app/generated and local generated directories
export function saveHugoPostToFile(suggestedSlug: string, hugoFullFile: string): { paths: string[]; primaryPath: string } {
  const cleanSlug = (suggestedSlug || "hugo-post")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "hugo-post";
  const fileName = `${cleanSlug}.md`;
  const savedPaths: string[] = [];

  const targetDirs = new Set<string>();

  // 1. Explicit /app/generated directory (mounted volume or root app directory)
  targetDirs.add("/app/generated");

  // 2. Custom environment override if provided
  if (process.env.GENERATED_DIR) {
    targetDirs.add(process.env.GENERATED_DIR);
  }

  // 3. Current working directory /generated
  targetDirs.add(path.join(process.cwd(), "generated"));

  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const destPath = path.join(dir, fileName);
      fs.writeFileSync(destPath, hugoFullFile, "utf8");
      savedPaths.push(destPath);
      console.log(`[Storage] Successfully saved Hugo post file to: ${destPath}`);
    } catch (fsErr: any) {
      console.warn(`[Storage] Note: Could not write to ${dir}: ${fsErr.message}`);
    }
  }

  const primaryPath = savedPaths.find((p) => p.startsWith("/app/generated")) || savedPaths[0] || `generated/${fileName}`;
  return { paths: savedPaths, primaryPath };
}

// Helper to save OG Social Media Image SVG to /app/generated/images and local generated/images
export function saveOgImageToFile(suggestedSlug: string, svgContent: string): { paths: string[]; relativePath: string } {
  const cleanSlug = (suggestedSlug || "hugo-post")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "hugo-post";
  const fileName = `og-${cleanSlug}.svg`;
  const relativePath = `images/${fileName}`;
  const savedPaths: string[] = [];

  const targetDirs = new Set<string>();
  targetDirs.add("/app/generated/images");
  if (process.env.GENERATED_DIR) {
    targetDirs.add(path.join(process.env.GENERATED_DIR, "images"));
  }
  targetDirs.add(path.join(process.cwd(), "generated", "images"));

  for (const dir of targetDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const destPath = path.join(dir, fileName);
      fs.writeFileSync(destPath, svgContent, "utf8");
      savedPaths.push(destPath);
      console.log(`[Storage] Successfully saved OG image to: ${destPath}`);
    } catch (fsErr: any) {
      console.warn(`[Storage] Note: Could not write OG image to ${dir}: ${fsErr.message}`);
    }
  }

  return { paths: savedPaths, relativePath };
}

// Compute reading time metrics based on 200 WPM standard
export function computeReadingMetrics(markdown: string): { words: number; readingTime: string } {
  const cleanText = (markdown || "")
    .replace(/{{<[^>]*>}}/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~`>+=|\\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleanText ? cleanText.split(/\s+/).filter((w) => w.length > 0).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  const readingTime = `${minutes} min read`;
  return { words, readingTime };
}

function getLanguagePromptRules(language: string = "both"): string {
  const langLower = (language || "").toLowerCase().trim();
  if (langLower === "both" || langLower.includes("both") || langLower.includes("biling") || !language) {
    return `- PRIMARY LANGUAGE FORMAT: BILINGUAL (French & English / Bilingue).
- Front Matter:
  * title: Bilingual title format (e.g., "Titre en Français / English Title").
  * description: 1-2 sentence bilingual summary in both French and English.
- Markdown Content:
  * Structure the post clearly into two parallel, complete, and fluent language editions:
    1. First: "## 🇫🇷 Version Française" (Full, authoritative, engaging technical post in French with takeaways, insights, code snippets, and shortcodes).
    2. Second: "## 🇬🇧 English Version" (Full, authoritative, engaging technical post in English with takeaways, insights, code snippets, and shortcodes).
  * Shortcodes (YouTube, Instagram, TikTok) and code snippets must be cleanly formatted and integrated in both versions.
- Summary: 1-2 sentences summarizing the article in French and English.`;
  } else if (langLower === "french" || langLower === "français" || langLower === "fr") {
    return `- PRIMARY LANGUAGE FORMAT: FRENCH (Français).
- Format all content (title, description, headings, body text, takeaways, summary) strictly in natural, professional, fluent French.`;
  } else {
    return `- PRIMARY LANGUAGE FORMAT: ENGLISH.
- Format all content (title, description, headings, body text, takeaways, summary) strictly in high-quality, engaging English.`;
  }
}

// Universal AI Execution Helper
async function executeModelCompletion(params: {
  systemInstruction: string;
  userPrompt: string;
  provider?: "gemini" | "groq" | "ollama" | "litellm";
  model?: string;
  ollamaBaseUrl?: string;
  ollamaApiKey?: string;
  groqApiKey?: string;
  litellmBaseUrl?: string;
  litellmApiKey?: string;
}): Promise<{ generatedJson: any; actualModelUsed: string; effectiveProvider: "gemini" | "groq" | "ollama" | "litellm" }> {
  const {
    systemInstruction,
    userPrompt,
    provider,
    model = "gemini-3.7-flash",
    ollamaBaseUrl,
    ollamaApiKey,
    groqApiKey,
    litellmBaseUrl,
    litellmApiKey
  } = params;

  let effectiveProvider: "gemini" | "groq" | "ollama" | "litellm" = provider || "gemini";
  const modelIdLower = (model || "").toLowerCase();
  if (!provider) {
    if (
      modelIdLower.startsWith("litellm") ||
      modelIdLower.startsWith("gpt-") ||
      modelIdLower.startsWith("claude-") ||
      modelIdLower.includes("deepseek/")
    ) {
      effectiveProvider = "litellm";
    } else if (
      modelIdLower.includes("llama-3") ||
      modelIdLower.includes("mixtral") ||
      modelIdLower.includes("gemma2-9b-it") ||
      modelIdLower.includes("deepseek-r1-distill")
    ) {
      effectiveProvider = "groq";
    } else if (
      modelIdLower.startsWith("ollama") ||
      modelIdLower === "llama3.2" ||
      modelIdLower === "llama3.1" ||
      modelIdLower === "mistral" ||
      modelIdLower === "deepseek-r1" ||
      modelIdLower === "phi4" ||
      modelIdLower === "qwen2.5-coder" ||
      modelIdLower === "gemma2"
    ) {
      effectiveProvider = "ollama";
    }
  }

  let generatedJson: any = null;
  let actualModelUsed = model;

  if (effectiveProvider === "litellm") {
    const litellmRes = await generateWithLiteLLM({
      systemInstruction,
      userPrompt,
      model,
      baseUrl: litellmBaseUrl,
      apiKey: litellmApiKey
    });
    generatedJson = litellmRes.resultJson;
    actualModelUsed = litellmRes.modelUsed;
  } else if (effectiveProvider === "groq") {
    const groqRes = await generateWithGroq({
      systemInstruction,
      userPrompt,
      model,
      apiKey: groqApiKey
    });
    generatedJson = groqRes.resultJson;
    actualModelUsed = groqRes.modelUsed;
  } else if (effectiveProvider === "ollama") {
    const ollamaRes = await generateWithOllama({
      systemInstruction,
      userPrompt,
      model,
      baseUrl: ollamaBaseUrl,
      apiKey: ollamaApiKey
    });
    generatedJson = ollamaRes.resultJson;
    actualModelUsed = ollamaRes.modelUsed;
  } else {
    // Gemini with fallback
    const ai = getAiClient();
    const validModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    const targetModel = validModels.includes(model) ? model : "gemini-3.7-flash";

    const generateConfig = {
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "A catchy, SEO-friendly, refined title for the Hugo blog post."
            },
            description: {
              type: Type.STRING,
              description: "An engaging 1-2 sentence summary of the article for Hugo front matter."
            },
            suggestedSlug: {
              type: Type.STRING,
              description: "A URL-friendly, clean, lowercased, and hyphenated slug based on the title."
            },
            categories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 1-2 categories appropriate for a personal blog."
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "An array of 3-5 relevant SEO tags."
            },
            hugoFrontMatter: {
              type: Type.STRING,
              description: "The complete, valid YAML front matter block starting and ending with '---'."
            },
            markdownContent: {
              type: Type.STRING,
              description: "The complete beautifully formatted Hugo Markdown article body. Headers should be H2/H3 (using ## or ###) - DO NOT include H1 (#)."
            },
            summary: {
              type: Type.STRING,
              description: "A short, friendly 1-2 sentence overview explaining the article and formatting."
            }
          },
          required: ["title", "description", "suggestedSlug", "categories", "tags", "hugoFrontMatter", "markdownContent", "summary"]
        }
      }
    };

    const candidateModels = [
      targetModel,
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-3.1-flash-lite"
    ].filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

    let resultText = "";
    let lastError: any = null;

    for (const currentModel of candidateModels) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`[Gemini] Calling ${currentModel} (attempt ${attempt})...`);
          const response = await ai.models.generateContent({
            ...generateConfig,
            model: currentModel
          });
          const text = response.text;
          if (text && text.trim().length > 0) {
            resultText = text;
            actualModelUsed = currentModel;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || JSON.stringify(err);
          console.warn(`[Gemini] Model ${currentModel} attempt ${attempt} encountered error: ${errMsg}`);

          const isTransient =
            err?.status === 503 ||
            err?.status === 429 ||
            err?.code === 503 ||
            err?.code === 429 ||
            errMsg.includes("503") ||
            errMsg.includes("429") ||
            errMsg.includes("high demand") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("ResourceExhausted") ||
            errMsg.includes("overloaded");

          if (!isTransient) {
            break;
          }

          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }

      if (resultText) {
        break;
      }
    }

    if (!resultText) {
      throw lastError || new Error("Gemini is currently experiencing high demand. Please try again or switch to Groq / Ollama / LiteLLM.");
    }

    generatedJson = extractJsonFromText(resultText);
  }

  return {
    generatedJson,
    actualModelUsed,
    effectiveProvider
  };
}

// Common generation function for POST and GET
async function handleScrapeAndGenerate(params: {
  url: string;
  author?: string;
  tone?: string;
  language?: string;
  customCategories?: string;
  customTags?: string;
  provider?: "gemini" | "groq" | "ollama" | "litellm";
  model?: string;
  remoteCapability?: string;
  includeTranscript?: boolean;
  ollamaBaseUrl?: string;
  ollamaApiKey?: string;
  groqApiKey?: string;
  litellmBaseUrl?: string;
  litellmApiKey?: string;
}) {
  const { 
    url, 
    author = "Personal Blog", 
    tone = "informative", 
    language = "both", 
    customCategories, 
    customTags,
    provider,
    model = "gemini-3.7-flash",
    remoteCapability = "google-free",
    includeTranscript = false,
    ollamaBaseUrl,
    ollamaApiKey,
    groqApiKey,
    litellmBaseUrl,
    litellmApiKey
  } = params;

  if (!url) {
    throw new Error("URL parameter is required");
  }

  // 1. Scrape the URL using chosen remote capability
  const scrapedData = await scrapeUrl(url, remoteCapability);
  const currentDate = new Date().toISOString();
  const effectiveAuthor = author && author !== "Personal Blog" ? author : (scrapedData.author || author || "Personal Blog");
  const langRule = getLanguagePromptRules(language);

  // 2. Formulate prompt based on content type (Article, YouTube Video, Instagram Reel, TikTok)
  let systemInstruction = "";
  let userPrompt = "";

  if (scrapedData.isYouTube && scrapedData.videoId) {
    systemInstruction = `You are an elite developer, tech educator, and expert in Hugo static site generation. 
Your task is to take a YouTube video transcript with timestamps, metadata, and speaker details, and transform it into a comprehensive, authoritative Hugo blog post in Markdown format.

Follow these strict rules:
${langRule}
- The writing style and tone must be: "${tone}".
- Draft a high-value, deeply informative, and engaging blog post that thoroughly summarizes and explains the video.
- In the markdownContent, you MUST embed the Hugo YouTube shortcode right after a brief 1-2 paragraph introduction: \`{{< youtube ${scrapedData.videoId} >}}\`.
- Structure the markdownContent with intuitive sections:
  1. Executive Summary & Key Takeaways (bullet points highlighting main lessons).
  2. Timestamped Chapter Breakdown / Key Moments (Chronologie des moments forts): map topics to clickable Markdown timestamp links pointing directly to that second in the video using \`[MM:SS](https://www.youtube.com/watch?v=${scrapedData.videoId}&t=SECONDSs)\` (e.g. \`[00:00](https://www.youtube.com/watch?v=${scrapedData.videoId}&t=0s)\`, \`[02:30](https://www.youtube.com/watch?v=${scrapedData.videoId}&t=150s)\`).
  3. Detailed Topic Deep-Dive: Expand on the core concepts, architecture diagrams (as ascii or markdown tables), and step-by-step technical explanations.
  4. Code Snippets & Examples: If code or terminal commands are discussed in the video, recreate clean, syntax-highlighted code fences (e.g., \`\`\`typescript, \`\`\`bash, etc.).
  5. Key Quotes & Speaker Insights from ${effectiveAuthor}.
  6. Conclusion & Related Resources.
- The output MUST include the exact Hugo YAML front matter format (block starting with '---' and ending with '---').
- Ensure the front matter contains:
  - title (a clean, capitalized, engaging version)
  - date: "${currentDate}"
  - draft: false
  - author: "${effectiveAuthor}"
  - description: (a compelling, 1-2 sentence excerpt of what the video covers)
  - categories: (an array of relevant tech categories. If custom categories "${customCategories || ""}" were provided, prioritize them)
  - tags: (an array of 3-5 relevant SEO tags. If custom tags "${customTags || ""}" were provided, prioritize them)
  - originalUrl: "${scrapedData.url}"
  - youtube_id: "${scrapedData.videoId}"
- Ensure headers in markdownContent are H2/H3 (using ## or ###) - DO NOT include H1 (#) as the title is handled by the Hugo template.
- The response must be a single, JSON object conforming strictly to the requested schema.`;

    userPrompt = `Please analyze the following YouTube video transcript and convert it into an authoritative Hugo blog post with the {{< youtube ${scrapedData.videoId} >}} shortcode and timestamped takeaways:

Video Title: ${scrapedData.title}
Channel/Presenter: ${scrapedData.author || effectiveAuthor}
Video URL: ${scrapedData.url}
Video ID: ${scrapedData.videoId}
Thumbnail: ${scrapedData.thumbnailUrl}

${scrapedData.scrapedContent}
`;
  } else if (scrapedData.isInstagram && scrapedData.instagramShortcode) {
    systemInstruction = `You are an elite developer, tech educator, and expert in Hugo static site generation. 
Your task is to take an Instagram Reel / Video post (including caption, creator metadata, code snippets, hashtags, and visual demonstration context) and transform it into a comprehensive, authoritative Hugo blog post in Markdown format.

Follow these strict rules:
${langRule}
- The writing style and tone must be: "${tone}".
- In the markdownContent, you MUST embed the Hugo Instagram shortcode right after a concise 1-2 paragraph introduction: \`{{< instagram ${scrapedData.instagramShortcode} >}}\`.
- Structure the markdownContent with intuitive sections:
  1. Executive Summary & Video Hook (bullet points explaining what problem the Reel solves).
  2. Step-by-Step Practical Guide & Concepts (elaborating on the practical technique or code shown).
  3. Code Snippets & Terminal Commands: If code or terminal snippets are mentioned, recreate clean, syntax-highlighted code fences (e.g. \`\`\`typescript, \`\`\`bash, etc.).
  4. Creator Insights & Best Practices from ${effectiveAuthor}.
  5. Relevant Tags & Community Discussion.
  6. Key Actionable Takeaways.
- The output MUST include the exact Hugo YAML front matter format (block starting with '---' and ending with '---').
- Ensure the front matter contains:
  - title (a clean, capitalized, engaging version)
  - date: "${currentDate}"
  - draft: false
  - author: "${effectiveAuthor}"
  - description: (a compelling, 1-2 sentence excerpt of what the Reel covers)
  - categories: (an array of relevant tech categories. If custom categories "${customCategories || ""}" were provided, prioritize them)
  - tags: (an array of 3-5 relevant SEO tags. If custom tags "${customTags || ""}" were provided, prioritize them)
  - originalUrl: "${scrapedData.url}"
  - instagram_id: "${scrapedData.instagramShortcode}"
  - media_type: "instagram_reel"
- Ensure headers in markdownContent are H2/H3 (using ## or ###) - DO NOT include H1 (#).
- The response must be a single, JSON object conforming strictly to the requested schema.`;

    userPrompt = `Please analyze the following Instagram Reel/Post and convert it into an authoritative Hugo blog post with the {{< instagram ${scrapedData.instagramShortcode} >}} shortcode:

Title/Hook: ${scrapedData.title}
Creator: ${scrapedData.author || effectiveAuthor}
Shortcode: ${scrapedData.instagramShortcode}
URL: ${scrapedData.url}

${scrapedData.scrapedContent}
`;
  } else if (scrapedData.isTikTok) {
    const tiktokShortcode = scrapedData.tiktokVideoId 
      ? `{{< tiktok ${scrapedData.tiktokVideoId} >}}` 
      : (scrapedData.tiktokUsername ? `{{< tiktok user="${scrapedData.tiktokUsername}" >}}` : `{{< tiktok url="${scrapedData.url}" >}}`);

    systemInstruction = `You are an elite developer, tech educator, and expert in Hugo static site generation. 
Your task is to take a TikTok video (including audio transcript, hook, description, and hashtags) and transform it into a comprehensive, authoritative Hugo blog post in Markdown format.

Follow these strict rules:
${langRule}
- The writing style and tone must be: "${tone}".
- In the markdownContent, you MUST embed the Hugo TikTok shortcode right after a concise 1-2 paragraph introduction: \`${tiktokShortcode}\`.
- Structure the markdownContent with intuitive sections:
  1. Video Hook & Executive Summary (the main takeaway or quick tip).
  2. Spoken Breakdown / Voiceover Insights (summarizing the spoken points).
  3. Step-by-Step Technical Implementation & Code Blocks (clean syntax-highlighted code fences \`\`\`typescript, \`\`\`bash, etc.).
  4. Best Practices & Key Considerations.
  5. Sound, Creator Credit & Context for ${effectiveAuthor}.
  6. Key Actionable Takeaways.
- The output MUST include the exact Hugo YAML front matter format (block starting with '---' and ending with '---').
- Ensure the front matter contains:
  - title (a clean, capitalized, engaging version)
  - date: "${currentDate}"
  - draft: false
  - author: "${effectiveAuthor}"
  - description: (a compelling, 1-2 sentence excerpt of what the video demonstrates)
  - categories: (an array of relevant tech categories. If custom categories "${customCategories || ""}" were provided, prioritize them)
  - tags: (an array of 3-5 relevant SEO tags. If custom tags "${customTags || ""}" were provided, prioritize them)
  - originalUrl: "${scrapedData.url}"
  - tiktok_id: "${scrapedData.tiktokVideoId || ""}"
  - media_type: "tiktok_video"
- Ensure headers in markdownContent are H2/H3 (using ## or ###) - DO NOT include H1 (#).
- The response must be a single, JSON object conforming strictly to the requested schema.`;

    userPrompt = `Please analyze the following TikTok video details and convert it into an authoritative Hugo blog post with the ${tiktokShortcode} shortcode:

Video Title: ${scrapedData.title}
Creator: ${scrapedData.author || effectiveAuthor}
Video URL: ${scrapedData.url}
Video ID: ${scrapedData.tiktokVideoId || "N/A"}

${scrapedData.scrapedContent}
`;
  } else {
    systemInstruction = `You are an elite developer, tech blogger, and expert in Hugo static site generation. 
Your task is to take the scraped raw text from a website and turn it into a beautiful, fully formatted, and authoritative Hugo blog post in Markdown format.

Follow these strict rules:
${langRule}
- The writing style and tone must be: "${tone}".
- Draft a highly engaging, complete, and well-structured blog post. 
- Automatically organize the scraped information into intuitive sections with clear Markdown headers (e.g., H2, H3), lists, quotes, tables, and highlights.
- If the original page has code/commands/scripts, clean them up and wrap them in elegant, syntax-highlighted code fences (e.g., \`\`\`typescript, \`\`\`bash, etc.).
- The output MUST include the exact Hugo YAML front matter format (block starting with '---' and ending with '---').
- Ensure the front matter contains:
  - title (a clean, capitalized, engaging version)
  - date: "${currentDate}"
  - draft: false
  - author: "${effectiveAuthor}"
  - description: (a compelling, 1-2 sentence excerpt of what the post covers)
  - categories: (an array of relevant tech categories. If the user provided custom categories "${customCategories || ""}", prioritize those, otherwise generate 1-2 generic categories)
  - tags: (an array of relevant SEO tags. If the user provided custom tags "${customTags || ""}", prioritize those, otherwise generate 3-5 relevant tags)
  - originalUrl: "${scrapedData.url}"
- Make sure the body of the markdown is high quality, cohesive, and reads like a native article rather than just a dry summary.
- The response must be a single, JSON object conforming strictly to the requested schema.`;

    userPrompt = `Please analyze the following scraped web page content and convert it into a beautiful Hugo blog post:

URL: ${scrapedData.url}
Scraped Page Title: ${scrapedData.title}
Scraped Page Meta Description: ${scrapedData.metaDescription}

Scraped Content Block:
"""
${scrapedData.scrapedContent}
"""`;
  }

  // Execute AI model
  const execution = await executeModelCompletion({
    systemInstruction,
    userPrompt,
    provider,
    model,
    ollamaBaseUrl,
    ollamaApiKey,
    groqApiKey,
    litellmBaseUrl,
    litellmApiKey
  });

  const generatedJson = execution.generatedJson;
  const actualModelUsed = execution.actualModelUsed;
  const effectiveProvider = execution.effectiveProvider;

  // Ensure all required fields exist with fallbacks
  const title = generatedJson.title || scrapedData.title || "Untitled Hugo Post";
  const suggestedSlug = (generatedJson.suggestedSlug || title)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const categories = Array.isArray(generatedJson.categories) ? generatedJson.categories : ["Technology"];
  
  // Ensure tags array exists AND contains the model name tag
  let tags: string[] = Array.isArray(generatedJson.tags) ? [...generatedJson.tags] : ["tech", "blog", "guide"];
  const cleanModelTag = actualModelUsed
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, "-")
    .replace(/-+/g, "-");
  if (cleanModelTag && !tags.some((t) => t.toLowerCase() === cleanModelTag)) {
    tags.push(cleanModelTag);
  }

  const description = generatedJson.description || scrapedData.metaDescription || `Article summary on ${title}`;
  let markdownContent = generatedJson.markdownContent || `# ${title}\n\n${scrapedData.scrapedContent}`;

  // Ensure all timestamps in YouTube posts link directly to the video timestamp
  if (scrapedData.isYouTube && scrapedData.videoId) {
    markdownContent = linkifyYouTubeTimestampsInMarkdown(markdownContent, scrapedData.videoId);
  }

  // Clean raw transcript (without redundant internal prompt header)
  const cleanRawTranscript = (
    scrapedData.rawTranscript ||
    (scrapedData.isYouTube ? scrapedData.scrapedContent : "") ||
    ""
  )
    .replace(/^\[YouTube Video Transcript with Timestamps\]:\s*/i, "")
    .trim();

  // Optionally append the complete transcript section when requested
  if (includeTranscript && cleanRawTranscript) {
    const transcriptSection = formatFullTranscriptSection(cleanRawTranscript, {
      language,
      youtubeVideoId: scrapedData.isYouTube ? scrapedData.videoId : undefined,
    });
    if (
      transcriptSection &&
      !markdownContent.includes("## Transcription complète") &&
      !markdownContent.includes("## Full Video Transcript")
    ) {
      markdownContent = `${markdownContent.trim()}\n\n${transcriptSection}`;
    }
  }

  const readingMetrics = computeReadingMetrics(markdownContent);
  
  // Generate Open Graph (OG) Social Media Image SVG & save to disk
  const ogImagePath = `images/og-${suggestedSlug}.svg`;
  try {
    const ogSvg = generateOgImageSvg({
      title,
      description,
      author: effectiveAuthor,
      date: currentDate,
      readingTime: readingMetrics.readingTime,
      wordCount: readingMetrics.words,
      tags,
      categories,
      slug: suggestedSlug,
    });
    saveOgImageToFile(suggestedSlug, ogSvg);
  } catch (ogErr: any) {
    console.warn(`[OG Image] Failed to generate OG image for ${suggestedSlug}:`, ogErr.message);
  }

  const imagesYaml = `\nimages:\n  - "${ogImagePath}"\nimage: "${ogImagePath}"`;

  let hugoFrontMatter = generatedJson.hugoFrontMatter;
  if (!hugoFrontMatter || !hugoFrontMatter.includes("---")) {
    const catsYaml = categories.length > 0 ? `\ncategories:\n${categories.map((c: string) => `  - "${c.replace(/"/g, '\\"')}"`).join("\n")}` : "\ncategories: []";
    const tagsYaml = tags.length > 0 ? `\ntags:\n${tags.map((t: string) => `  - "${t.replace(/"/g, '\\"')}"`).join("\n")}` : "\ntags: []";
    hugoFrontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${currentDate}
draft: false
author: "${effectiveAuthor.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"${catsYaml}${tagsYaml}${imagesYaml}
model_used: "${actualModelUsed}"
provider_used: "${effectiveProvider}"
language: "${language}"
reading_time: "${readingMetrics.readingTime}"
word_count: ${readingMetrics.words}
originalUrl: "${scrapedData.url}"
---`;
  } else {
    // Ensure OG image paths, model_used, reading_time and language are present in YAML front matter
    if (!hugoFrontMatter.includes("images:") && !hugoFrontMatter.includes("image:")) {
      hugoFrontMatter = hugoFrontMatter.replace(/---\s*$/, `images:\n  - "${ogImagePath}"\nimage: "${ogImagePath}"\n---`);
    }
    if (!hugoFrontMatter.includes("reading_time:")) {
      hugoFrontMatter = hugoFrontMatter.replace(/---\s*$/, `reading_time: "${readingMetrics.readingTime}"\nword_count: ${readingMetrics.words}\n---`);
    }
    if (!hugoFrontMatter.includes("model_used:")) {
      hugoFrontMatter = hugoFrontMatter.replace(/---\s*$/, `model_used: "${actualModelUsed}"\nprovider_used: "${effectiveProvider}"\nlanguage: "${language}"\n---`);
    }
  }

  const summary = generatedJson.summary || `Extracted and compiled using ${effectiveProvider.toUpperCase()} (${actualModelUsed}).`;

  const hugoFullFile = `${hugoFrontMatter.trim()}\n\n${markdownContent.trim()}\n`;

  // Save Hugo markdown file to /app/generated and local volumes
  const { paths, primaryPath } = saveHugoPostToFile(suggestedSlug, hugoFullFile);

  return {
    title,
    description,
    suggestedSlug,
    categories,
    tags,
    hugoFrontMatter,
    markdownContent,
    summary,
    hugoFullFile,
    savedFilePath: primaryPath,
    savedPaths: paths,
    ogImage: ogImagePath,
    images: [ogImagePath],
    readingTime: readingMetrics.readingTime,
    wordCount: readingMetrics.words,
    language,
    originalUrl: scrapedData.url,
    scrapedTitle: scrapedData.title,
    date: currentDate,
    author: effectiveAuthor,
    modelUsed: actualModelUsed,
    providerUsed: effectiveProvider,
    mediaType: scrapedData.mediaType || (scrapedData.isYouTube ? "youtube" : scrapedData.isInstagram ? "instagram" : scrapedData.isTikTok ? "tiktok" : "article"),
    isYouTube: Boolean(scrapedData.isYouTube),
    youtubeVideoId: scrapedData.videoId,
    youtubeThumbnail: scrapedData.thumbnailUrl,
    isInstagram: Boolean(scrapedData.isInstagram),
    instagramShortcode: scrapedData.instagramShortcode,
    instagramType: scrapedData.instagramType,
    instagramThumbnail: scrapedData.thumbnailUrl,
    isTikTok: Boolean(scrapedData.isTikTok),
    tiktokVideoId: scrapedData.tiktokVideoId,
    tiktokUsername: scrapedData.tiktokUsername,
    tiktokThumbnail: scrapedData.thumbnailUrl,
    rawTranscript: cleanRawTranscript || undefined
  };
}

// On-demand Translation function for existing generated posts
async function handleTranslatePost(params: {
  post: any;
  targetLanguage: "french" | "english" | "both";
  provider?: "gemini" | "groq" | "ollama" | "litellm";
  model?: string;
  ollamaBaseUrl?: string;
  ollamaApiKey?: string;
  groqApiKey?: string;
  litellmBaseUrl?: string;
  litellmApiKey?: string;
}) {
  const {
    post,
    targetLanguage = "both",
    provider,
    model,
    ollamaBaseUrl,
    ollamaApiKey,
    groqApiKey,
    litellmBaseUrl,
    litellmApiKey
  } = params;

  if (!post || (!post.markdownContent && !post.hugoFullFile)) {
    throw new Error("Valid Hugo post object is required for translation.");
  }

  const langRule = getLanguagePromptRules(targetLanguage);

  const systemInstruction = `You are an elite bilingual technical editor, translator, and Hugo static site author.
Your task is to translate and adapt an existing Hugo blog post into the target language format: "${targetLanguage}".

${langRule}

Strict Translation Rules:
- Accurately translate the title, description, markdown body, and summary while maintaining the original tone, depth, code snippets, and technical precision.
- CRITICAL: PRESERVE ALL HUGO SHORTCODES EXACTLY AS-IS without altering their syntax (e.g. \`{{< youtube ID >}}\`, \`{{< instagram CODE >}}\`, \`{{< tiktok ID >}}\`).
- PRESERVE all code fences (\`\`\`typescript, \`\`\`bash, etc.), command line parameters, tables, and hyperlinks.
- Ensure the Hugo front matter YAML contains: title, date, author, description, categories, tags (keep existing tags and translate if needed), and originalUrl.
- Keep the used AI model tag in the tags array.
- Headers should be H2/H3 (## or ###) - do NOT use H1 (#).
- The response MUST be a single, valid JSON object conforming to the requested schema.`;

  const userPrompt = `Please translate the following Hugo blog post into target language "${targetLanguage}":

Original Title: ${post.title}
Original Description: ${post.description}
Original Author: ${post.author || "Personal Blog"}
Original Categories: ${JSON.stringify(post.categories || [])}
Original Tags: ${JSON.stringify(post.tags || [])}

Markdown Content:
"""
${post.markdownContent || post.hugoFullFile}
"""`;

  const execution = await executeModelCompletion({
    systemInstruction,
    userPrompt,
    provider: provider || post.providerUsed,
    model: model || post.modelUsed || "gemini-3.7-flash",
    ollamaBaseUrl,
    ollamaApiKey,
    groqApiKey,
    litellmBaseUrl,
    litellmApiKey
  });

  const generatedJson = execution.generatedJson;
  const actualModelUsed = execution.actualModelUsed;
  const effectiveProvider = execution.effectiveProvider;

  const title = generatedJson.title || post.title;
  const langSuffix = targetLanguage === "french" ? "-fr" : targetLanguage === "english" ? "-en" : "-bilingual";
  const baseSlug = (post.suggestedSlug || "hugo-post").replace(/-(fr|en|bilingual)$/, "");
  const suggestedSlug = `${baseSlug}${langSuffix}`;

  const categories = Array.isArray(generatedJson.categories) ? generatedJson.categories : (post.categories || ["Technology"]);
  let tags: string[] = Array.isArray(generatedJson.tags) ? [...generatedJson.tags] : (post.tags || ["tech", "blog"]);

  const cleanModelTag = actualModelUsed.toLowerCase().replace(/[^a-z0-9_.:-]/g, "-").replace(/-+/g, "-");
  if (cleanModelTag && !tags.some((t) => t.toLowerCase() === cleanModelTag)) {
    tags.push(cleanModelTag);
  }

  const description = generatedJson.description || post.description || `Article summary on ${title}`;
  const currentDate = post.date || new Date().toISOString();
  const effectiveAuthor = post.author || "Personal Blog";
  let markdownContent = generatedJson.markdownContent || post.markdownContent;
  if (post.isYouTube && post.youtubeVideoId) {
    markdownContent = linkifyYouTubeTimestampsInMarkdown(markdownContent, post.youtubeVideoId);
  }
  const readingMetrics = computeReadingMetrics(markdownContent);

  // Generate & save translated OG Image
  const ogImagePath = `images/og-${suggestedSlug}.svg`;
  try {
    const ogSvg = generateOgImageSvg({
      title,
      description,
      author: effectiveAuthor,
      date: currentDate,
      readingTime: readingMetrics.readingTime,
      wordCount: readingMetrics.words,
      tags,
      categories,
      slug: suggestedSlug,
    });
    saveOgImageToFile(suggestedSlug, ogSvg);
  } catch (ogErr: any) {
    console.warn(`[OG Image] Failed to generate OG image for translated ${suggestedSlug}:`, ogErr.message);
  }

  const imagesYaml = `\nimages:\n  - "${ogImagePath}"\nimage: "${ogImagePath}"`;

  let hugoFrontMatter = generatedJson.hugoFrontMatter;
  if (!hugoFrontMatter || !hugoFrontMatter.includes("---")) {
    const catsYaml = categories.length > 0 ? `\ncategories:\n${categories.map((c: string) => `  - "${c.replace(/"/g, '\\"')}"`).join("\n")}` : "\ncategories: []";
    const tagsYaml = tags.length > 0 ? `\ntags:\n${tags.map((t: string) => `  - "${t.replace(/"/g, '\\"')}"`).join("\n")}` : "\ntags: []";
    hugoFrontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${currentDate}
draft: false
author: "${effectiveAuthor.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"${catsYaml}${tagsYaml}${imagesYaml}
model_used: "${actualModelUsed}"
provider_used: "${effectiveProvider}"
language: "${targetLanguage}"
reading_time: "${readingMetrics.readingTime}"
word_count: ${readingMetrics.words}
originalUrl: "${post.originalUrl || ""}"
---`;
  } else {
    if (!hugoFrontMatter.includes("images:") && !hugoFrontMatter.includes("image:")) {
      hugoFrontMatter = hugoFrontMatter.replace(/---\s*$/, `images:\n  - "${ogImagePath}"\nimage: "${ogImagePath}"\n---`);
    }
    if (!hugoFrontMatter.includes("reading_time:")) {
      hugoFrontMatter = hugoFrontMatter.replace(/---\s*$/, `reading_time: "${readingMetrics.readingTime}"\nword_count: ${readingMetrics.words}\n---`);
    }
  }

  const summary = generatedJson.summary || `Translated to ${targetLanguage.toUpperCase()} using ${effectiveProvider.toUpperCase()} (${actualModelUsed}).`;
  const hugoFullFile = `${hugoFrontMatter.trim()}\n\n${markdownContent.trim()}\n`;

  // Save to /app/generated
  const { paths, primaryPath } = saveHugoPostToFile(suggestedSlug, hugoFullFile);

  return {
    ...post,
    title,
    description,
    suggestedSlug,
    categories,
    tags,
    hugoFrontMatter,
    markdownContent,
    summary,
    hugoFullFile,
    savedFilePath: primaryPath,
    savedPaths: paths,
    ogImage: ogImagePath,
    images: [ogImagePath],
    readingTime: readingMetrics.readingTime,
    wordCount: readingMetrics.words,
    language: targetLanguage,
    modelUsed: actualModelUsed,
    providerUsed: effectiveProvider
  };
}

// Endpoint to retrieve or render Open Graph (OG) Social Media Image SVG
app.get("/api/og-image/:slug", (req, res) => {
  const cleanSlug = (req.params.slug || "post")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "post";
  const fileName = `og-${cleanSlug}.svg`;

  const candidates = [
    path.join("/app/generated/images", fileName),
    path.join(process.cwd(), "generated", "images", fileName),
  ];

  for (const candidatePath of candidates) {
    if (fs.existsSync(candidatePath)) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=3600");
      return res.sendFile(candidatePath);
    }
  }

  // Dynamic fallback: generate on the fly
  const title = (req.query.title as string) || cleanSlug.replace(/-/g, " ");
  const description = (req.query.description as string) || "";
  const author = (req.query.author as string) || "Personal Blog";
  const readingTime = (req.query.readingTime as string) || "3 min read";
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const svg = generateOgImageSvg({
    title,
    description,
    author,
    readingTime,
    date,
    slug: cleanSlug,
  });

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(svg);
});

// Check Ollama status and fetch installed models
app.get("/api/ollama/status", async (req, res) => {
  const endpoint = ((req.query.endpoint as string) || process.env.OLLAMA_BASE_URL || "http://localhost:11434").trim().replace(/\/+$/, "");
  const apiKey = ((req.query.apiKey as string) || process.env.OLLAMA_API_KEY || "").trim();
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const tagsRes = await fetch(`${endpoint}/api/tags`, {
      headers,
      signal: AbortSignal.timeout(4000)
    });
    if (tagsRes.ok) {
      const data: any = await tagsRes.json();
      const models = Array.isArray(data.models) ? data.models.map((m: any) => m.name) : [];
      return res.json({
        success: true,
        reachable: true,
        endpoint,
        hasProvidedKey: Boolean(apiKey),
        modelsCount: models.length,
        models
      });
    }
    return res.json({
      success: true,
      reachable: false,
      endpoint,
      hasProvidedKey: Boolean(apiKey),
      error: `Ollama returned status ${tagsRes.status}`
    });
  } catch (err: any) {
    return res.json({
      success: true,
      reachable: false,
      endpoint,
      hasProvidedKey: Boolean(apiKey),
      error: err.message || "Connection refused"
    });
  }
});

// Check LiteLLM Proxy status and fetch configured models / routes
app.get("/api/litellm/status", async (req, res) => {
  let endpoint = ((req.query.endpoint as string) || process.env.LITELLM_BASE_URL || "http://192.168.1.17:4100").trim().replace(/\/+$/, "");
  const apiKey = ((req.query.apiKey as string) || process.env.LITELLM_API_KEY || "").trim();
  const hasServerKey = Boolean(process.env.LITELLM_API_KEY && process.env.LITELLM_API_KEY !== "MY_LITELLM_API_KEY");
  
  const headers: Record<string, string> = {
    "User-Agent": "aistudio-hugo-builder"
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const modelsUrl = endpoint.endsWith("/v1") ? `${endpoint}/models` : `${endpoint}/v1/models`;
  const fallbackModelsUrl = endpoint.endsWith("/v1") ? `${endpoint.replace(/\/v1$/, "")}/models` : `${endpoint}/models`;

  try {
    let modelsRes = await fetch(modelsUrl, {
      headers,
      signal: AbortSignal.timeout(4000)
    });

    if (!modelsRes.ok && modelsRes.status === 404) {
      modelsRes = await fetch(fallbackModelsUrl, {
        headers,
        signal: AbortSignal.timeout(4000)
      });
    }

    if (modelsRes.ok) {
      const data: any = await modelsRes.json();
      let models: string[] = [];
      if (Array.isArray(data.data)) {
        models = data.data.map((m: any) => m.id || m.name || m.model || String(m)).filter(Boolean);
      } else if (Array.isArray(data.models)) {
        models = data.models.map((m: any) => m.id || m.name || m.model || String(m)).filter(Boolean);
      } else if (Array.isArray(data)) {
        models = data.map((m: any) => m.id || m.name || String(m)).filter(Boolean);
      }

      return res.json({
        success: true,
        reachable: true,
        endpoint,
        hasServerKey,
        hasProvidedKey: Boolean(apiKey),
        modelsCount: models.length,
        models
      });
    }

    return res.json({
      success: true,
      reachable: false,
      endpoint,
      hasServerKey,
      hasProvidedKey: Boolean(apiKey),
      error: `LiteLLM Proxy returned status ${modelsRes.status}: ${modelsRes.statusText}`
    });
  } catch (err: any) {
    return res.json({
      success: true,
      reachable: false,
      endpoint,
      hasServerKey,
      hasProvidedKey: Boolean(apiKey),
      error: err.message || "Connection refused to LiteLLM Proxy"
    });
  }
});

// Check Groq status (verify key configured on server)
app.get("/api/groq/status", (req, res) => {
  const isKeyConfigured = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "MY_GROQ_API_KEY");
  res.json({
    success: true,
    hasServerKey: isKeyConfigured
  });
});

// REST API endpoint to list all generated posts stored in the volume
app.get("/api/generated-files", (req, res) => {
  try {
    const searchDirs = new Set<string>();
    searchDirs.add("/app/generated");
    if (process.env.GENERATED_DIR) {
      searchDirs.add(process.env.GENERATED_DIR);
    }
    searchDirs.add(path.join(process.cwd(), "generated"));

    const foundFilesMap = new Map<string, any>();

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
          for (const fileName of files) {
            const fullPath = path.join(dir, fileName);
            const stats = fs.statSync(fullPath);
            if (!foundFilesMap.has(fileName)) {
              foundFilesMap.set(fileName, {
                fileName,
                path: fullPath,
                relativePath: `generated/${fileName}`,
                sizeBytes: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
              });
            }
          }
        } catch (readErr) {
          console.warn(`[Storage] Could not list ${dir}:`, readErr);
        }
      }
    }

    const files = Array.from(foundFilesMap.values()).sort(
      (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );

    res.json({ success: true, count: files.length, files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// REST API POST endpoint to translate an existing generated Hugo post
app.post("/api/translate-post", async (req, res) => {
  try {
    const data = await handleTranslatePost(req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("Translation endpoint error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An error occurred while translating the post."
    });
  }
});

// REST API POST endpoint
app.post("/api/scrape-and-generate", async (req, res) => {
  try {
    const data = await handleScrapeAndGenerate(req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("POST endpoint generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred during content fetching or blog post generation."
    });
  }
});

// REST API GET endpoint for automation / direct caller
app.get("/api/scrape-and-generate", async (req, res) => {
  const url = req.query.url as string;
  if (!url) {
    return res.status(400).json({ success: false, error: "Missing ?url= query parameter" });
  }

  try {
    const data = await handleScrapeAndGenerate({
      url,
      author: req.query.author as string,
      tone: req.query.tone as string,
      language: req.query.language as string,
      customCategories: req.query.categories as string,
      customTags: req.query.tags as string,
      provider: req.query.provider as any,
      model: req.query.model as string,
      remoteCapability: req.query.remoteCapability as string,
      includeTranscript: req.query.includeTranscript === "true" || req.query.includeTranscript === "1",
      ollamaBaseUrl: req.query.ollamaBaseUrl as string,
      ollamaApiKey: (req.query.ollamaApiKey || req.query.ollamaKey) as string,
      groqApiKey: (req.query.groqApiKey || req.query.groqKey) as string,
      litellmBaseUrl: (req.query.litellmBaseUrl || req.query.litellmUrl) as string,
      litellmApiKey: (req.query.litellmApiKey || req.query.litellmKey) as string,
    });
    res.json({ success: true, data });
  } catch (error: any) {
    console.error("GET endpoint generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "An unexpected error occurred."
    });
  }
});

// API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend application and support Vite dev environment
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving production build static assets.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is booted and listening on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
