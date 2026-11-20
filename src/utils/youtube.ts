/**
 * YouTube URL detection, ID extraction, and transcript formatting utilities
 */

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  author: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  originalUrl: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration?: number;
}

/**
 * Checks if a string is a valid YouTube URL (Standard, Shortened, Shorts, Embed).
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)/i.test(trimmed)
  );
}

/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Handle youtu.be/<id>
  const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Handle youtube.com/watch?v=<id>
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Handle youtube.com/shorts/<id>
  const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // Handle youtube.com/embed/<id>
  const embedMatch = trimmed.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Handle direct 11-character ID if pasted
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Decodes HTML entities commonly found in transcript text.
 */
export function decodeHtmlEntities(str: string): string {
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

/**
 * Converts seconds into [MM:SS] or [HH:MM:SS] format.
 */
export function formatSecondsToTimestamp(seconds: number): string {
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

/**
 * Formats transcript segments into structured, readable timestamped blocks.
 */
export function formatTranscript(segments: TranscriptSegment[], intervalSeconds: number = 30): string {
  if (!segments || segments.length === 0) return "";

  const paragraphs: string[] = [];
  let currentParagraphText: string[] = [];
  let currentParagraphStart = segments[0].start;

  segments.forEach((seg, index) => {
    const cleanedText = decodeHtmlEntities(seg.text);
    if (!cleanedText) return;

    // Start a new timestamp chunk if time exceeded interval or at beginning
    if (seg.start - currentParagraphStart >= intervalSeconds && currentParagraphText.length > 0) {
      const timestamp = formatSecondsToTimestamp(currentParagraphStart);
      paragraphs.push(`${timestamp} ${currentParagraphText.join(" ")}`);
      currentParagraphText = [cleanedText];
      currentParagraphStart = seg.start;
    } else {
      currentParagraphText.push(cleanedText);
    }

    // Flush last segment
    if (index === segments.length - 1 && currentParagraphText.length > 0) {
      const timestamp = formatSecondsToTimestamp(currentParagraphStart);
      paragraphs.push(`${timestamp} ${currentParagraphText.join(" ")}`);
    }
  });

  return paragraphs.join("\n\n");
}

/**
 * Generates the Hugo YouTube embed shortcode.
 */
export function generateHugoYouTubeShortcode(videoId: string): string {
  return `{{< youtube ${videoId} >}}`;
}

/**
 * Validates whether a token is a valid MM:SS or HH:MM:SS timestamp.
 */
export function isValidTimestampToken(token: string): boolean {
  if (!token) return false;
  const cleaned = token.replace(/^\[|\]$/g, "").trim();
  if (!/^\d{1,2}:\d{2}(?::\d{2})?$/.test(cleaned)) return false;
  const parts = cleaned.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n) || n < 0)) return false;
  if (parts.length === 2) {
    return parts[1] < 60;
  }
  if (parts.length === 3) {
    return parts[1] < 60 && parts[2] < 60;
  }
  return false;
}

/**
 * Converts a timestamp string (e.g., "02:30", "[02:30]", "1:05:10") into total seconds.
 */
export function parseTimestampToSeconds(timestamp: string): number {
  const cleaned = (timestamp || "").replace(/^\[|\]$/g, "").trim();
  const parts = cleaned.split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => isNaN(n) || n < 0)) return 0;
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Builds a direct YouTube watch URL pointing to a specific timestamp.
 */
export function buildYouTubeTimestampUrl(videoId: string, timestampOrSeconds: string | number): string {
  const seconds =
    typeof timestampOrSeconds === "number"
      ? Math.max(0, Math.floor(timestampOrSeconds))
      : parseTimestampToSeconds(timestampOrSeconds);
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
}

/**
 * Converts timestamps in a plain text segment (outside links/code/URLs) into Markdown links to YouTube.
 */
function linkifyPlainSegment(segment: string, videoId: string): string {
  // 1. Convert bracketed timestamps like [02:30] -> [02:30](https://www.youtube.com/watch?v=ID&t=150s)
  let updated = segment.replace(/\[(\d{1,2}:\d{2}(?::\d{2})?)\](?!\()/g, (full, ts) => {
    if (!isValidTimestampToken(ts)) return full;
    return `[${ts}](${buildYouTubeTimestampUrl(videoId, ts)})`;
  });

  // 2. Convert standalone/bulleted/bold/parenthesized timestamps like 00:00 or - 02:30 or **02:30**
  //    avoiding already-created markdown links [02:30](...) by splitting on markdown links first
  const linkProtectedParts = updated.split(/(\[[^\]]+\]\([^)]+\))/g);
  return linkProtectedParts
    .map((part) => {
      if (/^\[[^\]]+\]\([^)]+\)$/.test(part)) {
        return part;
      }
      return part.replace(
        /(^|[\s(*\-—–])(\d{1,2}:\d{2}(?::\d{2})?)(?=$|[\s.,;:!?)*\-—–])/g,
        (full, prefix, ts) => {
          if (!isValidTimestampToken(ts)) return full;
          return `${prefix}[${ts}](${buildYouTubeTimestampUrl(videoId, ts)})`;
        }
      );
    })
    .join("");
}

/**
 * Post-processes Markdown content for YouTube posts so all timestamps (e.g. in Chronologie des moments forts)
 * become clickable Markdown links to the exact timestamp in the video, while preserving code blocks and existing links.
 */
export function linkifyYouTubeTimestampsInMarkdown(markdown: string, videoId?: string | null): string {
  if (!markdown || !videoId) return markdown;

  const lines = markdown.split("\n");
  let inCodeFence = false;

  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("```") || trimmed.startsWith("~~~")) {
      inCodeFence = !inCodeFence;
      return line;
    }
    if (inCodeFence) {
      return line;
    }

    // Protect existing markdown links, inline code, Hugo shortcodes, and raw URLs
    const protectedRegex = /(\[[^\]]*\]\([^)]*\)|`[^`]*`|\{\{<[^>]*>\}\}|https?:\/\/[^\s)]+)/g;
    const parts = line.split(protectedRegex);

    return parts
      .map((part, idx) => {
        // Odd indices are captured protected tokens
        if (idx % 2 === 1) {
          return part;
        }
        return linkifyPlainSegment(part, videoId);
      })
      .join("");
  });

  return processedLines.join("\n");
}

/**
 * Cleans and formats a raw transcript into a complete Markdown section ready to append to a Hugo post.
 */
export function formatFullTranscriptSection(
  rawTranscript: string,
  options: {
    language?: string;
    youtubeVideoId?: string | null;
  } = {}
): string {
  if (!rawTranscript || !rawTranscript.trim()) return "";

  const cleaned = rawTranscript
    .replace(/^\[YouTube Video Transcript with Timestamps\]:\s*/i, "")
    .replace(/^\[YouTube Video Description & Overview\]:\s*/i, "")
    .trim();

  if (!cleaned) return "";

  const lang = (options.language || "both").toLowerCase();
  let heading = "## Full Video Transcript / Transcription complète";
  if (lang.includes("fr") && !lang.includes("both") && !lang.includes("biling")) {
    heading = "## Transcription complète de la vidéo";
  } else if (lang.includes("en") && !lang.includes("both") && !lang.includes("biling")) {
    heading = "## Full Video Transcript";
  }

  let body = cleaned;
  if (options.youtubeVideoId) {
    body = linkifyYouTubeTimestampsInMarkdown(body, options.youtubeVideoId);
  }

  return `${heading}\n\n${body}`;
}
