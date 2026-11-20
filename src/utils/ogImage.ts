/**
 * Open Graph (OG) Social Media Image Generator for Hugo Posts
 * Generates standards-compliant, beautiful 1200x630 SVG social preview cards.
 */

export interface OgImageOptions {
  title: string;
  description?: string;
  author?: string;
  date?: string;
  readingTime?: string;
  wordCount?: number;
  tags?: string[];
  categories?: string[];
  slug?: string;
  siteName?: string;
}

/**
 * Escapes XML special characters for safe SVG embedding.
 */
export function escapeXml(unsafe: string = ""): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Wraps text into an array of lines based on character limit.
 */
export function wrapText(text: string, maxCharsPerLine: number = 40, maxLines: number = 3): string[] {
  if (!text || !text.trim()) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
      if (lines.length === maxLines - 1) {
        // Last allowed line: append remaining words if possible or trim with ellipsis
        break;
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  const allWordsCount = words.length;
  const includedWordsCount = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (includedWordsCount < allWordsCount && lines.length > 0) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:!?]?$/, "...");
  }

  return lines;
}

/**
 * Generates the standard Hugo relative path for an OG social image.
 */
export function generateOgImagePath(slug: string): string {
  const cleanSlug = (slug || "post")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "post";
  return `images/og-${cleanSlug}.svg`;
}

/**
 * Generates an SVG string representation of an Open Graph social preview card.
 * Dimensions: 1200 x 630 (1.91:1 ratio standard for Twitter / Facebook / LinkedIn).
 */
export function generateOgImageSvg(options: OgImageOptions): string {
  const title = options.title || "Untitled Post";
  const description = options.description || "Read this article on our Hugo static blog.";
  const author = options.author || "Personal Blog";
  const readingTime = options.readingTime || "3 min read";
  const wordCount = options.wordCount;
  const siteName = options.siteName || "Hugo Static Blog";
  const primaryCategory = options.categories?.[0] || "Article";
  const tags = (options.tags || []).slice(0, 3);
  
  // Format date nicely
  let formattedDate = "";
  if (options.date) {
    try {
      const d = new Date(options.date);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toISOString().split("T")[0];
      }
    } catch {
      formattedDate = options.date;
    }
  }

  // Wrap title (max 3 lines) & description (max 2 lines)
  const titleFontSize = title.length > 70 ? 44 : title.length > 40 ? 50 : 56;
  const titleLineHeight = titleFontSize * 1.25;
  const titleLines = wrapText(title, titleFontSize > 50 ? 34 : 42, 3);

  const descLines = wrapText(description, 60, 2);

  const startY = 220;

  // Build title <tspan> elements
  const titleSpans = titleLines
    .map((line, idx) => {
      const y = startY + idx * titleLineHeight;
      return `<tspan x="80" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("\n      ");

  // Build description <tspan> elements
  const descStartY = startY + titleLines.length * titleLineHeight + 20;
  const descSpans = descLines
    .map((line, idx) => {
      const y = descStartY + idx * 32;
      return `<tspan x="80" y="${y}">${escapeXml(line)}</tspan>`;
    })
    .join("\n      ");

  // Build tags chips
  let tagX = 80;
  const tagChips = tags.map((t) => {
    const cleanTag = `#${escapeXml(t)}`;
    const approxWidth = Math.max(65, cleanTag.length * 9.5 + 20);
    const chip = `
      <g transform="translate(${tagX}, 530)">
        <rect width="${approxWidth}" height="32" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1" />
        <text x="${approxWidth / 2}" y="21" text-anchor="middle" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600">${cleanTag}</text>
      </g>`;
    tagX += approxWidth + 12;
    return chip;
  }).join("");

  const readingTimeText = wordCount
    ? `${readingTime} • ${wordCount.toLocaleString()} words`
    : readingTime;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="50%" stop-color="#111827" />
      <stop offset="100%" stop-color="#1e1b4b" />
    </linearGradient>

    <!-- Top Right Indigo Ambient Glow -->
    <radialGradient id="indigoGlow" cx="90%" cy="10%" r="60%">
      <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
    </radialGradient>

    <!-- Bottom Left Cyan Glow -->
    <radialGradient id="cyanGlow" cx="15%" cy="90%" r="55%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
    </radialGradient>

    <!-- Brand Accent Gradient -->
    <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>

    <!-- Soft Glow Filter -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <style>
    .brand-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .post-title { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .post-meta { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>

  <!-- Background Canvas -->
  <rect width="1200" height="630" fill="url(#bgGradient)" />

  <!-- Ambient Glow Effects -->
  <rect width="1200" height="630" fill="url(#indigoGlow)" />
  <rect width="1200" height="630" fill="url(#cyanGlow)" />

  <!-- Decorative Outer Border Card -->
  <rect x="36" y="36" width="1128" height="558" rx="24" fill="none" stroke="#334155" stroke-opacity="0.6" stroke-width="1.5" />
  <rect x="38" y="38" width="1124" height="554" rx="22" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1" />

  <!-- Top Header Row -->
  <g transform="translate(80, 84)">
    <!-- Brand Badge -->
    <rect width="132" height="34" rx="17" fill="url(#brandGradient)" />
    <!-- Hugo Hexagon Icon -->
    <polygon points="18,10 27,15 27,25 18,30 9,25 9,15" fill="#ffffff" opacity="0.9" />
    <text x="76" y="22" text-anchor="middle" fill="#ffffff" class="brand-title" font-size="12" font-weight="800" letter-spacing="0.5">HUGO POST</text>

    <!-- Category Pill -->
    <rect x="144" y="0" width="${Math.max(80, primaryCategory.length * 8 + 24)}" height="34" rx="17" fill="#1e293b" stroke="#475569" stroke-width="1" />
    <text x="${144 + Math.max(80, primaryCategory.length * 8 + 24) / 2}" y="22" text-anchor="middle" fill="#e2e8f0" class="brand-title" font-size="12" font-weight="700">${escapeXml(primaryCategory)}</text>

    <!-- Site Name & Date Right-aligned -->
    <g transform="translate(1040, 22)">
      <text x="0" y="0" text-anchor="end" fill="#94a3b8" class="post-meta" font-size="14" font-weight="600">${escapeXml(siteName)}${formattedDate ? ` • ${formattedDate}` : ""}</text>
    </g>
  </g>

  <!-- Accent Top Line -->
  <rect x="80" y="142" width="120" height="3" rx="1.5" fill="url(#brandGradient)" />

  <!-- Main Article Title -->
  <text class="post-title" fill="#f8fafc" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.5">
    ${titleSpans}
  </text>

  <!-- Article Description / Excerpt -->
  ${descLines.length > 0 ? `
  <text class="post-meta" fill="#94a3b8" font-size="20" font-weight="400" line-height="1.5">
    ${descSpans}
  </text>` : ""}

  <!-- Bottom Metadata Bar -->
  <g transform="translate(80, 480)">
    <!-- Author Avatar Glyph -->
    <circle cx="20" cy="20" r="18" fill="#312e81" stroke="#6366f1" stroke-width="1.5" />
    <text x="20" y="26" text-anchor="middle" fill="#e0e7ff" class="post-meta" font-size="14" font-weight="700">${escapeXml(author.charAt(0).toUpperCase())}</text>
    
    <!-- Author Name -->
    <text x="50" y="26" fill="#f1f5f9" class="post-meta" font-size="16" font-weight="700">${escapeXml(author)}</text>

    <!-- Reading Time Badge -->
    <g transform="translate(280, 5)">
      <rect width="${Math.max(140, readingTimeText.length * 7.5 + 40)}" height="30" rx="15" fill="#0f172a" stroke="#334155" stroke-width="1" />
      <text x="14" y="20" fill="#818cf8" font-size="13">⏱</text>
      <text x="32" y="20" fill="#cbd5e1" class="post-meta" font-size="13" font-weight="600">${escapeXml(readingTimeText)}</text>
    </g>
  </g>

  <!-- Tag Chips -->
  ${tagChips}

  <!-- Watermark / Footer Logo -->
  <g transform="translate(1040, 545)">
    <text x="0" y="0" text-anchor="end" fill="#475569" class="brand-title" font-size="12" font-weight="600" letter-spacing="1">GENERATED WITH AI STUDIO</text>
  </g>
</svg>`;
}

/**
 * Converts an SVG string into a ready-to-use Data URI for <img> tags.
 */
export function svgToDataUri(svgString: string): string {
  if (!svgString) return "";
  const cleaned = svgString.replace(/\n\s*/g, " ").trim();
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
}
