/**
 * SEO & Content Analytics Utility
 * Provides reading time computation, keyword density analysis,
 * meta description suggestions, and SEO audit scoring for Hugo posts.
 */

export interface ReadingTimeResult {
  words: number;
  minutes: number;
  text: string;
  characterCount: number;
}

export interface KeywordAnalysis {
  keyword: string;
  count: number;
  density: number; // percentage, e.g. 1.8%
  status: "low" | "optimal" | "high";
  isInTitle: boolean;
  isInDescription: boolean;
  isInHeadings: boolean;
  isTagged: boolean;
}

export interface MetaDescriptionSuggestion {
  id: string;
  type: "action" | "concise" | "engaging";
  label: string;
  text: string;
  charCount: number;
}

export interface SeoCheckItem {
  id: string;
  title: string;
  description: string;
  status: "pass" | "warning" | "fail";
  score: number;
  maxScore: number;
}

export interface SeoAuditResult {
  overallScore: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D";
  readingTime: ReadingTimeResult;
  checks: SeoCheckItem[];
  metaDescriptionLength: number;
  metaDescriptionStatus: "too-short" | "optimal" | "too-long";
  suggestedMetaDescriptions: MetaDescriptionSuggestion[];
  topKeywords: KeywordAnalysis[];
  suggestedTagsToAdd: string[];
  contentStats: {
    wordCount: number;
    headingCount: number;
    paragraphCount: number;
    linkCount: number;
    imageCount: number;
    hasShortcodes: boolean;
  };
}

// Common English and French stop words to filter out during keyword extraction
const STOP_WORDS = new Set([
  // English
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
  "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
  "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
  "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
  "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
  "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
  "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
  "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's", "whom",
  "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your",
  "yours", "yourself", "yourselves", "also", "just", "like", "will", "use", "make", "get", "using", "even",
  "well", "much", "many", "way", "see", "new", "one", "two", "first", "since", "know", "take", "come",
  // French
  "le", "la", "les", "un", "une", "des", "du", "de", "d", "l", "ce", "cet", "cette", "ces", "dans", "pour",
  "sur", "avec", "par", "au", "aux", "en", "qui", "que", "quoi", "dont", "où", "est", "sont", "été", "être",
  "avoir", "fait", "faire", "plus", "moins", "très", "bien", "aussi", "comme", "mais", "ou", "et", "donc",
  "or", "ni", "car", "nous", "vous", "ils", "elles", "leur", "leurs", "mon", "ton", "son", "notre", "votre",
  "sa", "ses", "mes", "tes", "tout", "tous", "toute", "toutes", "sans", "sous", "vers", "chez", "cette",
  // Markdown/Hugo artifacts
  "http", "https", "www", "com", "org", "net", "true", "false", "null", "undefined", "title", "description",
  "slug", "date", "tags", "categories", "author", "draft"
]);

/**
 * Strips Markdown formatting, HTML tags, Hugo shortcodes, and code fences.
 * Produces clean plain text suitable for word counting and keyword extraction.
 */
export function stripMarkdown(content: string): string {
  if (!content || typeof content !== "string") return "";

  let text = content;

  // 1. Remove YAML front matter if present
  if (text.startsWith("---")) {
    const parts = text.split("---");
    if (parts.length >= 3) {
      text = parts.slice(2).join("---");
    }
  }

  // 2. Remove Hugo shortcodes: {{< shortcode args >}} or {{% shortcode %}}
  text = text.replace(/\{\{[<%][^%}>]+[%>]}}/g, " ");

  // 3. Remove fenced code blocks (```lang ... ```)
  text = text.replace(/```[\s\S]*?```/g, " ");

  // 4. Remove inline code (`code`)
  text = text.replace(/`[^`]*`/g, " ");

  // 5. Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // 6. Convert Markdown links [text](url) to just text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 7. Remove Markdown images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, " ");

  // 8. Remove headings markers (#, ##, etc.), blockquotes (>), bold/italics (**, *, __, _)
  text = text.replace(/^[#>]+\s*/gm, " ");
  text = text.replace(/[*_~]+/g, " ");

  // 9. Remove horizontal rules
  text = text.replace(/^[-\*_]{3,}\s*$/gm, " ");

  // 10. Normalize whitespace
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Calculates estimated reading time for given content.
 * Standard average reading speed: 200 words per minute.
 */
export function calculateReadingTime(content: string = "", wpm: number = 200): ReadingTimeResult {
  const safeContent = content || "";
  const plainText = stripMarkdown(safeContent);
  const wordsArray = plainText.length > 0
    ? plainText.split(/\s+/).filter((w) => w.length > 0)
    : [];

  const wordCount = wordsArray.length;
  const characterCount = plainText.length;

  if (wordCount === 0) {
    return {
      words: 0,
      minutes: 0,
      text: "0 min read",
      characterCount: 0,
    };
  }

  const minutes = Math.max(1, Math.ceil(wordCount / wpm));
  const text = `${minutes} min read`;

  return {
    words: wordCount,
    minutes,
    text,
    characterCount,
  };
}

/**
 * Extracts top keywords and calculates their frequency and density.
 */
export function extractKeywords(
  content: string = "",
  title: string = "",
  description: string = "",
  currentTags: string[] = []
): KeywordAnalysis[] {
  const plainText = stripMarkdown(content || "");
  if (!plainText) return [];

  // Tokenize into clean words
  const rawWords = plainText
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim().replace(/^-+|-+$/g, ""))
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

  const totalWords = rawWords.length;
  if (totalWords === 0) return [];

  // Count word frequencies
  const counts: Record<string, number> = {};
  for (const word of rawWords) {
    counts[word] = (counts[word] || 0) + 1;
  }

  // Extract headings from markdown content for heading check
  const headingLines = (content || "")
    .split("\n")
    .filter((line) => line.trim().startsWith("#"))
    .map((line) => line.toLowerCase());
  const headingText = headingLines.join(" ");

  const titleLower = (title || "").toLowerCase();
  const descLower = (description || "").toLowerCase();
  const tagsLower = (currentTags || []).map((t) => (t || "").toLowerCase());

  // Convert to array and sort by frequency descending
  const sortedWords = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  return sortedWords.map(([keyword, count]) => {
    const density = Number(((count / totalWords) * 100).toFixed(1));
    let status: "low" | "optimal" | "high" = "optimal";
    if (density > 3.5) {
      status = "high"; // keyword stuffing risk
    } else if (density < 0.8 && count < 2) {
      status = "low";
    }

    return {
      keyword,
      count,
      density,
      status,
      isInTitle: titleLower.includes(keyword),
      isInDescription: descLower.includes(keyword),
      isInHeadings: headingText.includes(keyword),
      isTagged: tagsLower.includes(keyword),
    };
  });
}

/**
 * Generates improved, high-converting meta description suggestions
 * tailored to Google's 120-160 character recommendation.
 */
export function generateMetaDescriptionSuggestions(
  title: string = "",
  content: string = "",
  currentDesc: string = ""
): MetaDescriptionSuggestion[] {
  const plainText = stripMarkdown(content || "");
  const cleanTitle = (typeof title === "string" ? title : "").replace(/["\n\r]/g, "").trim() || "Article";

  // Extract first 2-3 clean sentences from markdown
  const sentences = plainText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && !s.includes("http"));

  const keySentence = sentences.length > 0 ? sentences[0] : "";
  const secondarySentence = sentences.length > 1 ? sentences[1] : "";

  // 1. Action-Oriented / Direct (Value + Call to Action)
  let actionText = `Explore ${cleanTitle}. ${keySentence ? keySentence.replace(/\.$/, "") : "Discover key insights and practical takeaways"}. Read the complete guide.`;
  if (actionText.length > 158) {
    actionText = actionText.slice(0, 155).replace(/\s\w*$/, "") + "...";
  }

  // 2. Concise & Search Snippet (Core summary under 150 chars)
  let conciseText = "";
  if (currentDesc && currentDesc.length >= 80 && currentDesc.length <= 160) {
    conciseText = currentDesc;
  } else if (keySentence) {
    conciseText = `${cleanTitle}: ${keySentence}`;
    if (conciseText.length > 155) {
      conciseText = conciseText.slice(0, 152).replace(/\s\w*$/, "") + "...";
    }
  } else {
    conciseText = `A comprehensive overview of ${cleanTitle}, breaking down core principles, practical tips, and expert recommendations.`;
  }

  // 3. Curiosity / Benefit Hook
  let engagingText = `Looking for insights on ${cleanTitle}? Here is what you need to know, from key takeaways to in-depth analysis.`;
  if (engagingText.length > 158) {
    engagingText = engagingText.slice(0, 155).replace(/\s\w*$/, "") + "...";
  }

  return [
    {
      id: "action",
      type: "action",
      label: "Action & Value Driven (High CTR)",
      text: actionText,
      charCount: actionText.length,
    },
    {
      id: "concise",
      type: "concise",
      label: "Concise & Search-Optimized",
      text: conciseText,
      charCount: conciseText.length,
    },
    {
      id: "engaging",
      type: "engaging",
      label: "Curiosity & Benefit Hook",
      text: engagingText,
      charCount: engagingText.length,
    },
  ];
}

/**
 * Conducts a comprehensive SEO audit on a Hugo post based on title,
 * meta description, tags, and current markdown content.
 */
export function performSeoAudit(
  title: string = "",
  description: string = "",
  content: string = "",
  tags: string[] = [],
  categories: string[] = []
): SeoAuditResult {
  const safeContent = content || "";
  const safeTitle = title || "";
  const safeDesc = description || "";
  const readingTime = calculateReadingTime(safeContent);
  const plainText = stripMarkdown(safeContent);
  const topKeywords = extractKeywords(safeContent, safeTitle, safeDesc, tags);

  // Content structural counts
  const headingMatches = safeContent.match(/^#{1,6}\s+.+$/gm) || [];
  const h2Count = safeContent.match(/^##\s+.+$/gm)?.length || 0;
  const linkMatches = safeContent.match(/\[([^\]]+)\]\([^)]+\)/g) || [];
  const imageMatches = safeContent.match(/!\[([^\]]*)\]\([^)]+\)/g) || [];
  const shortcodeMatches = safeContent.match(/\{\{[<%][^%}>]+[%>]}}/g) || [];

  const paragraphs = safeContent
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 30 && !p.trim().startsWith("#"));

  const contentStats = {
    wordCount: readingTime.words,
    headingCount: headingMatches.length,
    paragraphCount: paragraphs.length,
    linkCount: linkMatches.length,
    imageCount: imageMatches.length,
    hasShortcodes: shortcodeMatches.length > 0,
  };

  const checks: SeoCheckItem[] = [];

  // Check 1: Meta Description Length (120 - 160 characters ideal)
  const descLen = (description || "").trim().length;
  let metaDescriptionStatus: "too-short" | "optimal" | "too-long" = "optimal";

  if (descLen === 0) {
    metaDescriptionStatus = "too-short";
    checks.push({
      id: "meta-desc-length",
      title: "Meta Description Missing",
      description: "No meta description provided. Search engines will generate an arbitrary snippet.",
      status: "fail",
      score: 0,
      maxScore: 20,
    });
  } else if (descLen < 100) {
    metaDescriptionStatus = "too-short";
    checks.push({
      id: "meta-desc-length",
      title: "Meta Description is Too Short",
      description: `Current length is ${descLen} characters. Target 120-160 chars for maximum search click-through.`,
      status: "warning",
      score: 10,
      maxScore: 20,
    });
  } else if (descLen > 165) {
    metaDescriptionStatus = "too-long";
    checks.push({
      id: "meta-desc-length",
      title: "Meta Description May Truncate",
      description: `Current length is ${descLen} characters. Google typically truncates snippets exceeding 160 chars.`,
      status: "warning",
      score: 12,
      maxScore: 20,
    });
  } else {
    metaDescriptionStatus = "optimal";
    checks.push({
      id: "meta-desc-length",
      title: "Meta Description Length is Optimal",
      description: `Length of ${descLen} characters fits perfectly inside Google desktop & mobile snippet limits.`,
      status: "pass",
      score: 20,
      maxScore: 20,
    });
  }

  // Check 2: Title Length (40 - 65 characters optimal)
  const titleLen = (title || "").trim().length;
  if (titleLen === 0) {
    checks.push({
      id: "title-length",
      title: "Post Title Missing",
      description: "Title is empty. A descriptive title is required for SEO.",
      status: "fail",
      score: 0,
      maxScore: 20,
    });
  } else if (titleLen < 30) {
    checks.push({
      id: "title-length",
      title: "Title is Brief",
      description: `Title has ${titleLen} characters. 40-60 characters generally attracts more search clicks.`,
      status: "warning",
      score: 12,
      maxScore: 20,
    });
  } else if (titleLen > 70) {
    checks.push({
      id: "title-length",
      title: "Title May Truncate",
      description: `Title has ${titleLen} characters and may be clipped on Google SERPs (max ~60-70 chars).`,
      status: "warning",
      score: 14,
      maxScore: 20,
    });
  } else {
    checks.push({
      id: "title-length",
      title: "Title Length is Optimal",
      description: `Title length (${titleLen} chars) is well-calibrated for search results and social cards.`,
      status: "pass",
      score: 20,
      maxScore: 20,
    });
  }

  // Check 3: Content Length & Depth
  if (readingTime.words < 200) {
    checks.push({
      id: "content-depth",
      title: "Thin Content Alert",
      description: `Article has ${readingTime.words} words (< 1 min read). Search engines favor comprehensive content (300+ words).`,
      status: "warning",
      score: 8,
      maxScore: 20,
    });
  } else if (readingTime.words < 400) {
    checks.push({
      id: "content-depth",
      title: "Moderate Content Length",
      description: `Article has ${readingTime.words} words (~${readingTime.minutes} min read). Good for short updates.`,
      status: "pass",
      score: 16,
      maxScore: 20,
    });
  } else {
    checks.push({
      id: "content-depth",
      title: "Strong In-Depth Content",
      description: `Article has ${readingTime.words} words (~${readingTime.minutes} min read). Excellent depth for static site authority.`,
      status: "pass",
      score: 20,
      maxScore: 20,
    });
  }

  // Check 4: Heading Hierarchy & Scannability
  if (headingMatches.length === 0) {
    checks.push({
      id: "headings",
      title: "No Subheadings Found",
      description: "Break up text with H2 (##) and H3 (###) subheadings to improve readability and keyword context.",
      status: "warning",
      score: 5,
      maxScore: 20,
    });
  } else if (h2Count === 0) {
    checks.push({
      id: "headings",
      title: "Add Secondary Headings (H2)",
      description: "Found subheadings, but H2 section markers improve scan-reading and table-of-contents generation.",
      status: "warning",
      score: 12,
      maxScore: 20,
    });
  } else {
    checks.push({
      id: "headings",
      title: "Well-Structured Headings",
      description: `Found ${headingMatches.length} headings (including ${h2Count} H2s) dividing the content cleanly.`,
      status: "pass",
      score: 20,
      maxScore: 20,
    });
  }

  // Check 5: Keyword & Tag Optimization
  const topKeyword = topKeywords.length > 0 ? topKeywords[0] : null;
  const untaggedHighKeywords = topKeywords.filter((k) => !k.isTagged && k.count >= 2);
  const suggestedTagsToAdd = untaggedHighKeywords.slice(0, 5).map((k) => k.keyword);

  if (tags.length === 0) {
    checks.push({
      id: "tags-keywords",
      title: "No Hugo Tags Configured",
      description: "Tags enable taxonomic discovery in Hugo static sites. Add relevant topic tags.",
      status: "warning",
      score: 5,
      maxScore: 20,
    });
  } else if (topKeyword && !topKeyword.isInTitle && !topKeyword.isInDescription) {
    checks.push({
      id: "tags-keywords",
      title: "Align Key Keywords with Title & Description",
      description: `Primary content keyword "${topKeyword.keyword}" (${topKeyword.count}x) is missing from title or meta description.`,
      status: "warning",
      score: 12,
      maxScore: 20,
    });
  } else {
    checks.push({
      id: "tags-keywords",
      title: "Keyword & Tag Alignment is Strong",
      description: `${tags.length} tags defined and core terms are present across metadata and content body.`,
      status: "pass",
      score: 20,
      maxScore: 20,
    });
  }

  // Calculate overall score (sum of checks)
  const totalScore = checks.reduce((sum, c) => sum + c.score, 0);
  const maxPossible = checks.reduce((sum, c) => sum + c.maxScore, 0);
  const overallScore = Math.round((totalScore / maxPossible) * 100);

  let grade: "A+" | "A" | "B" | "C" | "D" = "A";
  if (overallScore >= 95) grade = "A+";
  else if (overallScore >= 85) grade = "A";
  else if (overallScore >= 70) grade = "B";
  else if (overallScore >= 50) grade = "C";
  else grade = "D";

  const suggestedMetaDescriptions = generateMetaDescriptionSuggestions(title, content, description);

  return {
    overallScore,
    grade,
    readingTime,
    checks,
    metaDescriptionLength: descLen,
    metaDescriptionStatus,
    suggestedMetaDescriptions,
    topKeywords,
    suggestedTagsToAdd,
    contentStats,
  };
}
