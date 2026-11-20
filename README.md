# 🚀 URL to Hugo Markdown Post Generator

A modern, full-stack application that transforms any online documentation, tutorial, or blog post into clean, Hugo-compatible Markdown with structured YAML front matter using **Google Gemini AI** and smart web extraction.

---

## ✨ Features

- **🌐 Smart Scraping Engine**:
  - Direct DOM parsing via `cheerio`, stripping noise, navbars, ads, and scripts.
  - Automatic fallback to high-reliability reader proxy (`r.jina.ai`) for single-page apps (SPAs) and bot-shielded websites.
- **🎬 YouTube Video & Transcript Ingestion**:
  - Automatically identifies YouTube video URLs (`watch?v=...`, `youtu.be/...`, `shorts/...`).
  - Fetches channel and title metadata via oEmbed.
  - Extracts and decodes timestamped caption/subtitle tracks from the video player.
  - Generates Hugo YouTube shortcodes `{{< youtube VIDEO_ID >}}`, timestamped key moment breakdowns, code recreation, and an interactive video transcript viewer.
- **🧠 Google Gemini AI Synthesis**:
  - Default: **`gemini-3.7-flash`** (Google's latest free-tier flagship).
  - Alternative options: **`gemini-3.1-flash-lite`** (low-latency) and **`gemini-flash-latest`** (auto-updating).
  - **High-Demand Resiliency**: Automatic exponential backoff and cascading model fallback when encountering 503/429 spikes.
- **📝 Hugo Front Matter Automation**:
  - Automatically synthesizes SEO titles, descriptions, kebab-case slugs, categories, tags, author attribution, and source URLs.
  - Formats clean Markdown code fences with proper language identifiers (`bash`, `ts`, `go`, `python`, etc.).
- **⚡ 1-Click GET Query Automation**:
  - Instant trigger via URL query parameters: `?url=https://example.com/post&proceed=1`.
  - Built-in **Browser Bookmarklet** to scrape and convert your active browser tab with one click.
- **📦 Production-Ready Containerization**:
  - Multi-stage `Dockerfile` (`node:22-alpine`).
  - `docker-compose.yml` configured with multiple port range mappings (`3000-3010:3000`).
  - Automated health check endpoint (`/api/health`).
- **🛠️ Developer Tooling**:
  - Complete test suite powered by `Vitest`.
  - Self-documenting `Makefile`.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** 20+ or 22+
- **Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).

### 2. Installation & Setup
```bash
# Clone the repository
git clone <repo-url>
cd url-to-hugo-generator

# Copy environment template and add your API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY=your_key_here

# Install dependencies
npm install

# Start development server (port 3000)
npm run dev
```

---

## 🐳 Docker & Docker Compose

### Using Docker Compose (Multi-Port Range `3000-3010` & `generated` Volume)
The `docker-compose.yml` maps host ports `3000-3010` to container port `3000` to prevent port collisions, and mounts the `generated` volume to `/app/generated` so all created Hugo `.md` posts are persisted:

```bash
# Build and run with Docker Compose (includes 'generated' volume)
docker compose up -d --build

# View real-time logs
docker compose logs -f

# Stop the container stack
docker compose down
```

### Using Standalone Docker (with `./generated` Volume Mount)
```bash
# Build the Docker image
docker build -t url-to-hugo-generator .

# Run the container with mounted generated directory
docker run -d --rm \
  -p 3000:3000 \
  -v $(pwd)/generated:/app/generated \
  -e GEMINI_API_KEY="your_api_key_here" \
  --name url-to-hugo-generator \
  url-to-hugo-generator
```

---

## 🛠️ Makefile Commands

A self-documenting `Makefile` is included for common tasks:

| Command | Description |
|---|---|
| `make help` | Display all available targets with descriptions |
| `make install` | Install all Node.js dependencies |
| `make dev` | Start local development server on port 3000 |
| `make build` | Build production frontend and bundled backend |
| `make start` | Start the production server from `dist/server.cjs` |
| `make test` | Run the Vitest unit test suite |
| `make test-watch` | Run tests in interactive watch mode |
| `make lint` | Run TypeScript type-checker (`tsc --noEmit`) |
| `make clean` | Remove build and distribution directories |
| `make docker-build` | Build the Docker container image |
| `make docker-run` | Run the Docker container locally |
| `make docker-stop` | Stop the running Docker container |
| `make compose-up` | Build and start services via Docker Compose |
| `make compose-down` | Stop and tear down Docker Compose services |
| `make compose-logs` | Stream live Docker Compose service logs |
| `make health-check` | Verify service status on `/api/health` |

---

## 🧪 Testing

The project includes unit tests for Hugo front matter generation, slug creation, URL validation, parameter parsing, and model fallback logic:

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## ⚡ URL Query & Automation Integration

You can trigger the scraper programmatically by passing query parameters in the URL:

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `url` | string | *required* | The target URL to scrape and convert |
| `proceed` | `1` \| `true` | `false` | When set to `1` or `true`, automatically begins generation immediately |
| `tone` | string | `technical` | Content tone (`technical`, `beginner`, `concise`, `in-depth`) |
| `author` | string | `Personal Blog` | Author name for Hugo YAML front matter |
| `lang` | string | `English` | Target language for the output |
| `model` | string | `gemini-3.7-flash` | Gemini model (`gemini-3.7-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`) |
| `categories` | string | `""` | Comma-separated categories |
| `tags` | string | `""` | Comma-separated tags |

### Example Automation URL
```
http://localhost:3000/?url=https://gohugo.io/getting-started/quick-start/&proceed=1&author=HugoExpert&lang=English
```

### Browser Bookmarklet
Drag or copy this code into a browser bookmark to convert your current active tab into a Hugo post with one click:
```javascript
javascript:(function(){const u=encodeURIComponent(window.location.href);window.open('http://localhost:3000/?url='+u+'&proceed=1','_blank');})();
```

---

## 📁 Project Structure

```
├── .dockerignore            # Docker ignore file
├── .env.example             # Environment variable template
├── Dockerfile               # Production multi-stage Alpine Dockerfile
├── docker-compose.yml       # Compose configuration with 3000-3010 port mapping
├── Makefile                 # Make automation targets
├── PROMPT.md                # System analysis & reusable master prompt
├── README.md                # Project documentation
├── package.json             # Scripts & dependencies
├── server.ts                # Express backend with scraper, Gemini API & fallbacks
├── src/
│   ├── App.tsx              # Main interactive React dashboard
│   ├── components/          # Extracted UI components & modals
│   ├── types.ts             # Global TypeScript type definitions
│   └── utils/
│       └── hugo.ts          # Hugo formatting, slug & query utilities
├── tests/
│   ├── hugo.test.ts         # Unit tests for Hugo utilities & query parsing
│   └── models.test.ts       # Unit tests for Gemini model selection & fallback
└── tsconfig.json            # TypeScript configuration
```

---

## 📄 License

MIT License. Feel free to use and adapt for personal or commercial Hugo publishing workflows.
