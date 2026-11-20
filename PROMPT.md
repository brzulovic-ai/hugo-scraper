# URL to Hugo Post Generator - System Analysis & Reusable Master Prompt

This document summarizes the requirements, architecture decisions, and conversational evolutions of the **URL to Hugo Markdown Post Generator**, and provides a unified, production-ready **Reusable Master Prompt** for recreating or extending this tool.

---

## 1. Input Analysis & Architecture Synthesis

### A. Core Objectives
* **Instant URL Extraction & YouTube Transcript Summarization**:
  - Transform any live technical blog, documentation page, or tutorial URL into clean, Hugo-compatible Markdown files with rich YAML front matter.
  - **YouTube Video Mode**: Automatically detect YouTube URLs (`youtube.com/watch`, `youtu.be/`, `youtube.com/shorts`), fetch metadata via oEmbed, extract and decode timed subtitle/caption tracks, and generate timestamped chapter summaries with Hugo shortcodes `{{< youtube VIDEO_ID >}}`.
* **Dual Scraping Engine**:
  1. *Direct HTML Scraping*: Scrapes clean DOM trees with Cheerio, stripping non-content elements (navbars, footers, scripts, sidebars, cookie banners).
  2. *Reader Proxy Fallback*: Automatic fallback to Jina AI Reader (`https://r.jina.ai/{url}`) for SPAs, bot-protected websites, or complex layouts.
  3. *YouTube Caption Ingestion*: Direct player transcript extraction with timestamp segmentation and HTML entity decoding.
* **Google Gemini AI Generation**:
  - Leverages Google's latest free-tier models: **`gemini-3.7-flash`** (default flagship), **`gemini-3.1-flash-lite`** (low latency), and **`gemini-flash-latest`**.
  - **High-Demand 503/429 Cascading Fallback**: Automatic retry with exponential backoff and cascading failover across candidate models when an endpoint experiences peak demand spikes.
* **Hugo Front Matter Synthesizer**:
  - Generates SEO-optimized YAML front matter (`title`, `date`, `description`, `slug`, `author`, `categories`, `tags`, `source_url`, `draft: false`).
  - Cleans and restructures technical prose, code fences with appropriate language identifiers, blockquotes, and lists.
* **GET Parameter Automation**:
  - Automatically initiates scraping and conversion via URL query parameters: `?url=<target>&proceed=1` (supporting `tone`, `author`, `lang`, `model`, `categories`, `tags`).
  - Includes a built-in Bookmarklet generator allowing 1-click conversion from any active browser tab.
* **Production & Containerization**:
  - Multi-stage `Dockerfile` (`node:22-alpine` builder and unprivileged runtime).
  - `docker-compose.yml` supporting port range `3000-3010:3000` and persistent `generated` volume (`generated:/app/generated`).
  - Auto-persistence of all generated `.md` Hugo posts into the mounted `generated/` directory with clean kebab-case filenames.
  - Comprehensive unit test suite with `Vitest`.
  - Self-documenting `Makefile` for developer workflow.

---

## 2. Reusable Master Prompt

```markdown
You are an expert full-stack developer and technical documentation specialist. Build a production-ready "URL to Hugo Markdown Post Generator" using React 18, Vite, Tailwind CSS, TypeScript, Express, and Google Gemini AI via the `@google/genai` SDK.

### Functional Requirements:

1. Scraping & Content Ingestion Engine (Server-Side):
   - Provide an Express API route `/api/generate` that accepts a URL and transformation options.
   - Implement a robust multi-strategy extractor:
     - Primary: Direct HTTP fetch with custom User-Agent and DOM parsing using `cheerio` (stripping header, nav, footer, script, style, aside, ads).
     - Fallback / Reader Proxy: Automatically fall back to `https://r.jina.ai/{url}` when direct fetching fails or encounters bot-protection.
   - Return clear error handling if the remote URL is unreachable.

2. AI Formatting & Hugo Front Matter Synthesis:
   - Use Google's `@google/genai` SDK with server-side `process.env.GEMINI_API_KEY`.
   - Default model: `gemini-3.7-flash`. Also support `gemini-3.1-flash-lite` and `gemini-flash-latest`.
   - Implement smart retry and cascading fallback: If the primary model returns 503 (high demand) or 429 (rate limit), retry with backoff and automatically cascade through backup models.
   - System prompt instructions:
     - Generate structured JSON containing: `title`, `description`, `suggestedSlug`, `categories`, `tags`, `hugoFrontMatter` (YAML), `markdownContent`, and `summary`.
     - Ensure all code blocks have correct syntax highlighting tags (`ts`, `go`, `bash`, `python`, etc.).
     - Support custom tone selection (Technical, Beginner-Friendly, Concise, In-Depth).
     - Support multilingual output (English, Spanish, French, German, Japanese, etc.).

3. Interactive Client UI:
   - Clean, modern, high-contrast dashboard with responsive desktop and mobile views.
   - URL input with 1-click sample presets (Hugo Docs, React 19, Google Cloud Run, Tailwind CSS).
   - Advanced options panel: Author, Language, Tone, Custom Categories, Custom Tags, Gemini Model Selector, Scraping Strategy.
   - Output Viewer:
     - Tabbed view: Formatted Markdown preview, Raw Hugo Post (Front Matter + Body), Front Matter Only, Extracted Source.
     - 1-click Copy to Clipboard and 1-click Download `.md` file with suggested slug filename.
   - Automation Modal:
     - GET query trigger documentation (`?url=...&proceed=1`).
     - Interactive test links.
     - Browser Bookmarklet generator with copy-to-clipboard functionality.

4. URL Query Automation:
   - On page load, parse search params `?url=...&proceed=1`.
   - If `proceed=1` (or `true`) is present with a valid URL, immediately launch the generation workflow without manual clicks.

5. Containerization & DevOps:
   - Multi-stage `Dockerfile` (build with `node:22-alpine`, run with minimal production dependencies as a non-root user).
   - `docker-compose.yml` configured with port range `3000-3010:3000` and health checks on `/api/health`.
   - `Makefile` with targets: `install`, `dev`, `build`, `start`, `test`, `lint`, `clean`, `docker-build`, `docker-run`, `compose-up`, `compose-down`, `health-check`.
   - Unit tests using `Vitest` covering slug generation, tag sanitization, YAML front matter generation, query parsing, and model fallback logic.
```

---

## 3. Key Endpoints & Query Schema

### API Endpoint: `POST /api/generate`
```json
{
  "url": "https://gohugo.io/getting-started/quick-start/",
  "tone": "technical",
  "author": "Tech Blogger",
  "language": "English",
  "customCategories": "Static Sites, Web Development",
  "customTags": "Hugo, Go, SSG",
  "model": "gemini-3.7-flash",
  "remoteCapability": "google-free"
}
```

### URL GET Automation Format
```
https://<host>/?url=https://example.com/post&proceed=1&author=MyName&lang=English&model=gemini-3.7-flash
```
