import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  FileCode, 
  Link2, 
  Copy, 
  Download, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Globe, 
  User, 
  Tag, 
  FolderOpen, 
  Eye, 
  EyeOff,
  Settings2, 
  HelpCircle,
  ClipboardPaste,
  FileText,
  ChevronDown,
  ExternalLink,
  Zap,
  Cpu,
  Layers,
  Youtube,
  Instagram,
  Video,
  Radio,
  Play,
  Music,
  Server,
  Key,
  Network,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  Languages,
  Clock,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  Share2,
  ClipboardCopy,
  Image as ImageIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { HugoPost, GenerationOptions, HistoryItem, UserSettingsProfile } from "./types";
import MarkdownPreview from "./components/MarkdownPreview";
import MetadataEditor from "./components/MetadataEditor";
import SeoAudit from "./components/SeoAudit";
import RecentPosts from "./components/RecentPosts";
import AutomationModal from "./components/AutomationModal";
import OgImageCard from "./components/OgImageCard";
import { isYouTubeUrl, isInstagramUrl, isTikTokUrl, SUPPORTED_LANGUAGES, calculateReadingTime, formatHugoFrontMatter } from "./utils/hugo";
import { SUPPORTED_MODELS, detectModelProvider, AIProvider } from "./utils/models";
import { loadSavedProfile, saveUserProfile, clearSavedProfile, applyProfileToOptions } from "./utils/userProfile";
import { generateOgImagePath } from "./utils/ogImage";
import { buildYouTubeTimestampUrl, formatFullTranscriptSection } from "./utils/youtube";

const PRESET_ARTICLES = [
  {
    name: "⭐ Select a sample article, YouTube video, Instagram Reel or TikTok...",
    url: ""
  },
  {
    name: "🎬 YouTube: Kubernetes in 100 Seconds (Fireship)",
    url: "https://www.youtube.com/watch?v=PivpCKEiQOQ"
  },
  {
    name: "🎬 YouTube: Docker in 100 Seconds (Fireship)",
    url: "https://www.youtube.com/watch?v=Gjnup-PuquQ"
  },
  {
    name: "📸 Instagram Reel: Web Dev Architecture & Tips",
    url: "https://www.instagram.com/reel/C3bL5YxO123/"
  },
  {
    name: "🎵 TikTok Video: 60-Second Python Automation",
    url: "https://www.tiktok.com/@tech_creator/video/7123456789012345678"
  },
  {
    name: "Go Hugo: Quick Start & Site Architecture Guide",
    url: "https://gohugo.io/getting-started/quick-start/"
  },
  {
    name: "Google Cloud: Serverless Architecture on Cloud Run",
    url: "https://cloud.google.com/blog/products/serverless/cloud-run-best-practices"
  },
  {
    name: "React 19: Server Components & Action Hooks",
    url: "https://react.dev/blog/2024/04/25/react-19"
  },
  {
    name: "Tailwind CSS v4.0: High-Performance Engine",
    url: "https://tailwindcss.com/blog/tailwindcss-v4"
  },
  {
    name: "Vite 6.0: Environment API & Framework Architecture",
    url: "https://vite.dev/blog/announcing-vite6"
  },
  {
    name: "Node.js 22: Native WebSocket & Require(ESM)",
    url: "https://nodejs.org/en/blog/release/v22.0.0"
  }
];

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [autoTriggeredMessage, setAutoTriggeredMessage] = useState<string | null>(null);
  
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("gemini");
  const [ollamaStatus, setOllamaStatus] = useState<{
    checked: boolean;
    reachable: boolean;
    models: string[];
    loading: boolean;
    error?: string;
  }>({
    checked: false,
    reachable: false,
    models: [],
    loading: false
  });
  const [customOllamaModel, setCustomOllamaModel] = useState("");

  const [litellmStatus, setLiteLLMStatus] = useState<{
    checked: boolean;
    reachable: boolean;
    models: string[];
    loading: boolean;
    error?: string;
  }>({
    checked: false,
    reachable: false,
    models: [],
    loading: false
  });
  const [customLiteLLMModel, setCustomLiteLLMModel] = useState("");

  const [showLiteLLMKey, setShowLiteLLMKey] = useState(false);
  const [showOllamaKey, setShowOllamaKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);

  const [groqStatus, setGroqStatus] = useState<{ checked: boolean; hasServerKey: boolean }>({
    checked: false,
    hasServerKey: false
  });

  const [options, setOptions] = useState<GenerationOptions>({
    author: "Personal Blog",
    tone: "informative",
    language: "both",
    customCategories: "",
    customTags: "",
    provider: "gemini",
    model: "gemini-3.7-flash",
    remoteCapability: "google-free",
    includeTranscript: false,
    ollamaBaseUrl: "http://localhost:11434",
    ollamaApiKey: "",
    groqApiKey: "",
    litellmBaseUrl: "http://192.168.1.17:4100",
    litellmApiKey: ""
  });

  const [activePost, setActivePost] = useState<HugoPost | null>(null);
  const [editorMarkdown, setEditorMarkdown] = useState("");
  const [editorFullFile, setEditorFullFile] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translationSuccess, setTranslationSuccess] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "frontmatter" | "transcript" | "seo" | "og">("preview");
  const [showConfig, setShowConfig] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [transcriptFilter, setTranscriptFilter] = useState("");

  // Persistent user settings profile (localStorage)
  const [savedProfile, setSavedProfile] = useState<UserSettingsProfile | null>(null);
  const [profileStatusMessage, setProfileStatusMessage] = useState<string | null>(null);

  const handleSaveProfile = useCallback(() => {
    const p = saveUserProfile(options);
    setSavedProfile(p);
    setProfileStatusMessage("Generation settings saved as default profile!");
    setTimeout(() => setProfileStatusMessage(null), 3500);
  }, [options]);

  const handleClearProfile = useCallback(() => {
    clearSavedProfile();
    setSavedProfile(null);
    setProfileStatusMessage("Saved profile cleared. Standard defaults restored.");
    setTimeout(() => setProfileStatusMessage(null), 3500);
  }, []);

  // Scan and detect local Ollama instance with optional apiKey
  const checkOllama = useCallback(async (endpointUrl?: string, apiKeyVal?: string) => {
    const endpoint = endpointUrl || options.ollamaBaseUrl || "http://localhost:11434";
    const apiKey = apiKeyVal !== undefined ? apiKeyVal : (options.ollamaApiKey || "");
    setOllamaStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/ollama/status?endpoint=${encodeURIComponent(endpoint)}&apiKey=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (data.reachable) {
        setOllamaStatus({
          checked: true,
          reachable: true,
          models: data.models || [],
          loading: false
        });
        // If models found and current model isn't in it, pick the first one if on Ollama
        if (data.models && data.models.length > 0 && selectedProvider === "ollama") {
          const currentInList = data.models.includes(options.model);
          if (!currentInList) {
            setOptions(prev => ({ ...prev, model: data.models[0] }));
          }
        }
      } else {
        setOllamaStatus({
          checked: true,
          reachable: false,
          models: [],
          loading: false,
          error: data.error || "Ollama is not running"
        });
      }
    } catch (err: any) {
      setOllamaStatus({
        checked: true,
        reachable: false,
        models: [],
        loading: false,
        error: err.message || "Failed to connect to Ollama daemon"
      });
    }
  }, [options.ollamaBaseUrl, options.ollamaApiKey, options.model, selectedProvider]);

  // Scan and detect LiteLLM Proxy endpoint and configured models
  const checkLiteLLM = useCallback(async (endpointUrl?: string, apiKeyVal?: string) => {
    const endpoint = endpointUrl || options.litellmBaseUrl || "http://192.168.1.17:4100";
    const apiKey = apiKeyVal !== undefined ? apiKeyVal : (options.litellmApiKey || "");
    setLiteLLMStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/litellm/status?endpoint=${encodeURIComponent(endpoint)}&apiKey=${encodeURIComponent(apiKey)}`);
      const data = await res.json();
      if (data.reachable) {
        setLiteLLMStatus({
          checked: true,
          reachable: true,
          models: data.models || [],
          loading: false
        });
        if (data.models && data.models.length > 0 && selectedProvider === "litellm") {
          const currentInList = data.models.includes(options.model);
          if (!currentInList) {
            setOptions(prev => ({ ...prev, model: data.models[0] }));
          }
        }
      } else {
        setLiteLLMStatus({
          checked: true,
          reachable: false,
          models: [],
          loading: false,
          error: data.error || "LiteLLM Proxy is not reachable"
        });
      }
    } catch (err: any) {
      setLiteLLMStatus({
        checked: true,
        reachable: false,
        models: [],
        loading: false,
        error: err.message || "Failed to connect to LiteLLM Proxy"
      });
    }
  }, [options.litellmBaseUrl, options.litellmApiKey, options.model, selectedProvider]);

  // Check Groq status on mount
  useEffect(() => {
    fetch("/api/groq/status")
      .then(res => res.json())
      .then(data => {
        setGroqStatus({ checked: true, hasServerKey: Boolean(data.hasServerKey) });
      })
      .catch(() => {
        setGroqStatus({ checked: true, hasServerKey: false });
      });
  }, []);

  // Core scrape & generate executor
  const executeScrape = useCallback(async (targetUrl: string, currentOptions: GenerationOptions) => {
    if (!targetUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/scrape-and-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl.trim(),
          ...currentOptions
        })
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || "An error occurred while generating the Hugo post.");
      }

      const postData: HugoPost = resJson.data;
      setActivePost(postData);

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        url: targetUrl.trim(),
        post: postData,
        options: { ...currentOptions }
      };

      setHistory(prevHistory => {
        const filtered = prevHistory.filter(item => item.url !== targetUrl.trim());
        const updated = [newHistoryItem, ...filtered].slice(0, 15);
        localStorage.setItem("hugo_generator_history", JSON.stringify(updated));
        return updated;
      });

      // Clear input URL
      setUrl("");
    } catch (err: any) {
      setError(err.message || "Failed to parse content. Please try another URL or switch scraper engine.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load history & parse GET parameters on mount
  useEffect(() => {
    const saved = localStorage.getItem("hugo_generator_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse history:", err);
      }
    }

    // Load persistent user settings profile from localStorage if present
    const profile = loadSavedProfile();
    if (profile) {
      setSavedProfile(profile);
      setOptions((prev) => applyProfileToOptions(profile, prev));
      if (profile.provider) {
        setSelectedProvider(profile.provider);
      }
    }

    // Inspect URL Search Parameters: ?url=...&proceed=1&model=...
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get("url");
      const proceedParam = params.get("proceed");
      const providerParam = (params.get("provider") as AIProvider) || undefined;
      const modelParam = params.get("model");
      const remoteParam = params.get("remoteCapability");
      const toneParam = params.get("tone");
      const authorParam = params.get("author");
      const langParam = params.get("language");
      const includeTranscriptParam = params.get("includeTranscript");
      const ollamaUrlParam = params.get("ollamaBaseUrl") || params.get("ollamaUrl");
      const ollamaKeyParam = params.get("ollamaApiKey") || params.get("ollamaKey");
      const groqKeyParam = params.get("groqApiKey") || params.get("groqKey");
      const litellmUrlParam = params.get("litellmBaseUrl") || params.get("litellmUrl");
      const litellmKeyParam = params.get("litellmApiKey") || params.get("litellmKey");

      const hasKnownParam = Boolean(
        urlParam || proceedParam || providerParam || modelParam || remoteParam ||
        toneParam || authorParam || langParam || includeTranscriptParam
      );

      if (hasKnownParam) {
        const inferredProvider = detectModelProvider(modelParam || "", providerParam || profile?.provider);
        setSelectedProvider(inferredProvider);

        const defaultModelForProvider = 
          inferredProvider === "litellm" ? "gpt-4o-mini" :
          inferredProvider === "groq" ? "llama-3.3-70b-versatile" :
          inferredProvider === "ollama" ? "llama3.2" :
          "gemini-3.7-flash";

        const initialOptions: GenerationOptions = {
          author: authorParam || profile?.author || "Personal Blog",
          tone: toneParam || profile?.tone || "informative",
          language: langParam || profile?.language || "both",
          customCategories: params.get("categories") || profile?.customCategories || "",
          customTags: params.get("tags") || profile?.customTags || "",
          provider: inferredProvider,
          model: modelParam || profile?.model || defaultModelForProvider,
          remoteCapability: remoteParam || profile?.remoteCapability || "google-free",
          includeTranscript: includeTranscriptParam !== null
            ? (includeTranscriptParam === "1" || includeTranscriptParam === "true")
            : Boolean(profile?.includeTranscript),
          ollamaBaseUrl: ollamaUrlParam || profile?.ollamaBaseUrl || "http://localhost:11434",
          ollamaApiKey: ollamaKeyParam || "",
          groqApiKey: groqKeyParam || "",
          litellmBaseUrl: litellmUrlParam || profile?.litellmBaseUrl || "http://192.168.1.17:4100",
          litellmApiKey: litellmKeyParam || ""
        };

        setOptions(initialOptions);

        if (urlParam) {
          setUrl(urlParam);

          // If proceed=1 or proceed=true, automatically launch scraping!
          if (proceedParam === "1" || proceedParam === "true") {
            setAutoTriggeredMessage(`Automated scraping initiated via GET parameter for: ${urlParam}`);
            executeScrape(urlParam, initialOptions);
          }
        }
      }
    }
  }, [executeScrape]);

  // Update editor values when active post changes
  useEffect(() => {
    if (activePost) {
      setEditorMarkdown(activePost.markdownContent);
      setEditorFullFile(activePost.hugoFullFile);
    } else {
      setEditorMarkdown("");
      setEditorFullFile("");
    }
  }, [activePost]);

  // Handle local changes to markdown editor
  const handleMarkdownEditorChange = (newMarkdown: string) => {
    setEditorMarkdown(newMarkdown);
    if (activePost) {
      const updatedFullFile = `${activePost.hugoFrontMatter.trim()}\n\n${newMarkdown.trim()}\n`;
      setEditorFullFile(updatedFullFile);
      
      const updatedPost = {
        ...activePost,
        markdownContent: newMarkdown,
        hugoFullFile: updatedFullFile
      };
      setActivePost(updatedPost);

      // Also update history item
      const updatedHistory = history.map(item => {
        if (item.post.originalUrl === activePost.originalUrl) {
          return { ...item, post: updatedPost };
        }
        return item;
      });
      setHistory(updatedHistory);
      localStorage.setItem("hugo_generator_history", JSON.stringify(updatedHistory));
    }
  };

  // Synchronize changes made by the MetadataEditor form
  const handleMetadataChange = (updatedPost: HugoPost) => {
    setActivePost(updatedPost);
    setEditorMarkdown(updatedPost.markdownContent);
    setEditorFullFile(updatedPost.hugoFullFile);

    // Update in history list
    const updatedHistory = history.map(item => {
      if (item.post.originalUrl === updatedPost.originalUrl) {
        return { ...item, post: updatedPost };
      }
      return item;
    });
    setHistory(updatedHistory);
    localStorage.setItem("hugo_generator_history", JSON.stringify(updatedHistory));
  };

  // Live computed reading time and word count for the active post markdown
  const postReadingTime = useMemo(() => {
    if (!activePost) {
      return { words: 0, minutes: 0, text: "0 min read", characterCount: 0 };
    }
    return calculateReadingTime(editorMarkdown || activePost.markdownContent);
  }, [editorMarkdown, activePost]);

  // Update meta description from SEO Audit suggestion
  const handleUpdateDescriptionFromSeo = (newDesc: string) => {
    if (!activePost) return;
    const updatedFrontMatter = formatHugoFrontMatter({
      title: activePost.title,
      date: activePost.date,
      description: newDesc,
      slug: activePost.suggestedSlug,
      author: activePost.author,
      categories: activePost.categories || [],
      tags: activePost.tags || [],
      originalUrl: activePost.originalUrl,
      modelUsed: activePost.modelUsed,
      providerUsed: activePost.providerUsed,
      readingTime: postReadingTime.text,
      wordCount: postReadingTime.words,
    });
    const updatedFullFile = `${updatedFrontMatter}\n\n${editorMarkdown.trim()}\n`;
    handleMetadataChange({
      ...activePost,
      description: newDesc,
      hugoFrontMatter: updatedFrontMatter,
      hugoFullFile: updatedFullFile,
      readingTime: postReadingTime.text,
      wordCount: postReadingTime.words,
    });
  };

  // Add tag from SEO keyword suggestions
  const handleAddTagFromSeo = (newTag: string) => {
    if (!activePost) return;
    const cleanTag = newTag.trim().toLowerCase();
    const currentTags = activePost.tags || [];
    if (currentTags.map((t) => t.toLowerCase()).includes(cleanTag)) return;

    const updatedTags = [...currentTags, cleanTag];
    const updatedFrontMatter = formatHugoFrontMatter({
      title: activePost.title,
      date: activePost.date,
      description: activePost.description,
      slug: activePost.suggestedSlug,
      author: activePost.author,
      categories: activePost.categories || [],
      tags: updatedTags,
      originalUrl: activePost.originalUrl,
      modelUsed: activePost.modelUsed,
      providerUsed: activePost.providerUsed,
      readingTime: postReadingTime.text,
      wordCount: postReadingTime.words,
    });
    const updatedFullFile = `${updatedFrontMatter}\n\n${editorMarkdown.trim()}\n`;
    handleMetadataChange({
      ...activePost,
      tags: updatedTags,
      hugoFrontMatter: updatedFrontMatter,
      hugoFullFile: updatedFullFile,
      readingTime: postReadingTime.text,
      wordCount: postReadingTime.words,
    });
  };

  // Append full video transcript section to the active post markdown on-demand
  const handleAppendTranscriptToPost = () => {
    if (!activePost || !activePost.rawTranscript) return;
    if (
      editorMarkdown.includes("## Transcription complète") ||
      editorMarkdown.includes("## Full Video Transcript")
    ) {
      return;
    }
    const transcriptSection = formatFullTranscriptSection(activePost.rawTranscript, {
      language: options.language,
      youtubeVideoId: activePost.youtubeVideoId,
    });
    if (!transcriptSection) return;

    const updatedMarkdown = `${editorMarkdown.trim()}\n\n${transcriptSection}`;
    handleMarkdownEditorChange(updatedMarkdown);
    setCopyFeedback("transcript-added");
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // On-demand Translation trigger for the active generated post
  const handleTranslate = async (targetLang: "french" | "english" | "both") => {
    if (!activePost || translating) return;

    setTranslating(true);
    setTranslationError(null);
    setTranslationSuccess(null);

    try {
      const response = await fetch("/api/translate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post: activePost,
          targetLanguage: targetLang,
          provider: options.provider,
          model: options.model,
          ollamaBaseUrl: options.ollamaBaseUrl,
          ollamaApiKey: options.ollamaApiKey,
          groqApiKey: options.groqApiKey,
          litellmBaseUrl: options.litellmBaseUrl,
          litellmApiKey: options.litellmApiKey,
        }),
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || `Failed to translate to ${targetLang}.`);
      }

      const translatedPost: HugoPost = resJson.data;
      setActivePost(translatedPost);
      setEditorMarkdown(translatedPost.markdownContent);
      setEditorFullFile(translatedPost.hugoFullFile);

      // Also update history item
      const updatedHistory = history.map((item) => {
        if (item.post.originalUrl === activePost.originalUrl) {
          return { ...item, post: translatedPost };
        }
        return item;
      });
      setHistory(updatedHistory);
      localStorage.setItem("hugo_generator_history", JSON.stringify(updatedHistory));

      const langLabel = targetLang === "french" ? "French 🇫🇷" : targetLang === "english" ? "English 🇬🇧" : "Bilingual 🌐 (FR & EN)";
      setTranslationSuccess(`Successfully translated article into ${langLabel}! Saved to volume.`);
      setTimeout(() => setTranslationSuccess(null), 6000);
    } catch (err: any) {
      setTranslationError(err.message || "Failed to translate article. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  // Auto-advancing loading step simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      const steps = [
        "Connecting to remote target host...",
        "Executing remote extraction & bypassing crawler defenses...",
        "Parsing DOM tree nodes & identifying core article body...",
        "Discarding headers, navigation bars, scripts, and promotional widgets...",
        "Streaming content to Google's Gemini 3.7 Flash engine...",
        "Structuring Markdown sections, code fences, and quotes...",
        "Synthesizing SEO categories, tags, and YAML front matter...",
        "Validating Hugo static compilation formatting...",
        "Finalizing your Hugo Markdown document..."
      ];
      
      let index = 0;
      setLoadingStep(steps[0]);
      
      timer = setInterval(() => {
        index = (index + 1) % steps.length;
        setLoadingStep(steps[index]);
      }, 2400);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handlePasteUrl = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().startsWith("http")) {
        setUrl(text.trim());
      }
    } catch (err) {
      console.log("Clipboard read failed, please paste manually.");
    }
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUrl = e.target.value;
    if (selectedUrl) {
      setUrl(selectedUrl);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    executeScrape(url, options);
  };

  // History operations
  const handleSelectHistoryItem = (item: HistoryItem) => {
    setActivePost(item.post);
    setOptions(item.options);
    setError(null);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem("hugo_generator_history", JSON.stringify(updated));
    
    const itemToDelete = history.find(item => item.id === id);
    if (itemToDelete && activePost && itemToDelete.post.originalUrl === activePost.originalUrl) {
      setActivePost(null);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your generation history? This cannot be undone.")) {
      setHistory([]);
      localStorage.removeItem("hugo_generator_history");
      setActivePost(null);
    }
  };

  const handleCopyText = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(type);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleDownloadFile = () => {
    if (!activePost) return;
    const element = document.createElement("a");
    const file = new Blob([editorFullFile], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `${activePost.suggestedSlug || "index"}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 antialiased selection:bg-indigo-500/10 selection:text-indigo-900">
      
      {/* Top Header Banner */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 py-3.5 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20 flex items-center justify-center">
              <FileCode size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                URL to Hugo Blog Generator
                <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  Google Free Tier
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Scrape web articles, format YAML front matter & export Hugo Markdown posts.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAutomationModal(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Open Automation & GET Caller Link (?url=...&proceed=1)"
            >
              <Zap size={13} className="text-indigo-600 fill-indigo-600" />
              <span className="hidden sm:inline">GET Caller &amp; Automation</span>
              <span className="sm:hidden">Caller</span>
            </button>

            <button
              onClick={() => {
                setActivePost(null);
                setUrl("");
                setError(null);
                setAutoTriggeredMessage(null);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Reset workspace"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">

        {/* Automated Trigger Banner */}
        <AnimatePresence>
          {autoTriggeredMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-indigo-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Zap size={18} className="fill-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-100">Automation Triggered</h4>
                  <p className="text-xs font-medium text-white">{autoTriggeredMessage}</p>
                </div>
              </div>
              <button
                onClick={() => setAutoTriggeredMessage(null)}
                className="text-xs font-bold px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Scraping Control panel & Presets */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Scraping Panel Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-5">
              
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <span>Configure &amp; Scrape</span>
                </h2>
                
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-all"
                >
                  <Settings2 size={13} />
                  <span>Presets &amp; Options</span>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${showConfig ? "rotate-180" : ""}`} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* Preset Technical Articles Dropdown Selector */}
                <div className="space-y-1.5">
                  <label htmlFor="preset-select" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers size={12} className="text-indigo-600" />
                    <span>Quick Sample Presets (Dropdown Selector)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="preset-select"
                      onChange={handlePresetSelect}
                      disabled={loading}
                      className="w-full text-xs py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium transition-all cursor-pointer"
                    >
                      {PRESET_ARTICLES.map((preset, idx) => (
                        <option key={idx} value={preset.url}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* URL Input Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="url-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Article, YouTube, Instagram Reel or TikTok URL
                    </label>
                    {isYouTubeUrl(url) && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
                        <Youtube size={12} className="fill-red-600 text-red-600" />
                        <span>YouTube Video Mode</span>
                      </span>
                    )}
                    {isInstagramUrl(url) && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full animate-pulse">
                        <Instagram size={12} className="text-pink-600" />
                        <span>Instagram Reel Mode</span>
                      </span>
                    )}
                    {isTikTokUrl(url) && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-cyan-600 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full animate-pulse">
                        <Video size={12} className="text-cyan-600" />
                        <span>TikTok Video Mode</span>
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400">
                      {isYouTubeUrl(url) ? (
                        <Youtube size={18} className="text-red-500" />
                      ) : isInstagramUrl(url) ? (
                        <Instagram size={18} className="text-pink-500" />
                      ) : isTikTokUrl(url) ? (
                        <Video size={18} className="text-cyan-500" />
                      ) : (
                        <Link2 size={18} />
                      )}
                    </span>
                    <input
                      id="url-input"
                      type="text"
                      placeholder="https://example.com/article, youtube.com, instagram.com/reel/..., or tiktok.com/..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      disabled={loading}
                      className="w-full text-sm pl-11 pr-24 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition-all text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handlePasteUrl}
                      disabled={loading}
                      className="absolute right-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-200/30 cursor-pointer"
                      title="Paste URL from your clipboard"
                    >
                      <ClipboardPaste size={12} />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>

                {/* AI Provider Switcher */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={12} className="text-indigo-600" />
                      <span>AI Model Engine</span>
                    </label>
                    <span className="text-[10px] font-medium text-slate-400 font-mono">
                      {selectedProvider === "gemini" && "⚡ Google Gemini Free Tier"}
                      {selectedProvider === "groq" && "🚀 Groq Free Ultra-Fast LPU"}
                      {selectedProvider === "ollama" && "🦙 Ollama Local Free Engine"}
                      {selectedProvider === "litellm" && "🌐 LiteLLM Proxy (192.168.1.17:4100)"}
                    </span>
                  </div>

                  {/* Provider Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("gemini");
                        setOptions(prev => ({ ...prev, provider: "gemini", model: "gemini-3.7-flash" }));
                      }}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        selectedProvider === "gemini"
                          ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Sparkles size={13} className={selectedProvider === "gemini" ? "text-indigo-600" : "text-slate-400"} />
                      <span>Gemini</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("groq");
                        setOptions(prev => ({ ...prev, provider: "groq", model: "llama-3.3-70b-versatile" }));
                      }}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        selectedProvider === "groq"
                          ? "bg-white text-orange-700 shadow-xs border border-slate-200/50 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Zap size={13} className={selectedProvider === "groq" ? "text-orange-500 fill-orange-500" : "text-slate-400"} />
                      <span>Groq</span>
                      <span className="text-[9px] px-1 py-0.2 bg-orange-100 text-orange-800 rounded font-mono hidden sm:inline">LPU</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("ollama");
                        setOptions(prev => ({ ...prev, provider: "ollama", model: "llama3.2" }));
                        if (!ollamaStatus.checked) {
                          checkOllama();
                        }
                      }}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        selectedProvider === "ollama"
                          ? "bg-white text-emerald-700 shadow-xs border border-slate-200/50 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Server size={13} className={selectedProvider === "ollama" ? "text-emerald-600" : "text-slate-400"} />
                      <span>Ollama</span>
                      <span className="text-[9px] px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono hidden sm:inline">Local</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProvider("litellm");
                        setOptions(prev => ({ ...prev, provider: "litellm", model: "gpt-4o-mini" }));
                        if (!litellmStatus.checked) {
                          checkLiteLLM();
                        }
                      }}
                      className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        selectedProvider === "litellm"
                          ? "bg-white text-sky-700 shadow-xs border border-slate-200/50 font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Network size={13} className={selectedProvider === "litellm" ? "text-sky-600" : "text-slate-400"} />
                      <span>LiteLLM</span>
                      <span className="text-[9px] px-1 py-0.2 bg-sky-100 text-sky-800 rounded font-mono hidden sm:inline">Proxy</span>
                    </button>
                  </div>
                </div>

                {/* Model Selector & Scraper Remote Capabilities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Dynamic Model Selector based on provider */}
                  <div className="space-y-1">
                    <label htmlFor="model-select" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Cpu size={11} className={selectedProvider === "gemini" ? "text-indigo-600" : selectedProvider === "groq" ? "text-orange-500" : selectedProvider === "ollama" ? "text-emerald-600" : "text-sky-600"} />
                        <span>
                          {selectedProvider === "gemini" ? "Gemini Model" : 
                           selectedProvider === "groq" ? "Groq Model" : 
                           selectedProvider === "ollama" ? "Ollama Model" : 
                           "LiteLLM Model"}
                        </span>
                      </span>
                    </label>

                    {selectedProvider === "gemini" && (
                      <select
                        id="model-select"
                        value={options.model}
                        onChange={(e) => setOptions({ ...options, model: e.target.value })}
                        disabled={loading}
                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                      >
                        {SUPPORTED_MODELS.gemini.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.tag})
                          </option>
                        ))}
                      </select>
                    )}

                    {selectedProvider === "groq" && (
                      <select
                        id="model-select"
                        value={options.model}
                        onChange={(e) => setOptions({ ...options, model: e.target.value })}
                        disabled={loading}
                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800"
                      >
                        {SUPPORTED_MODELS.groq.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.tag})
                          </option>
                        ))}
                      </select>
                    )}

                    {selectedProvider === "ollama" && (
                      <select
                        id="model-select"
                        value={customOllamaModel ? "__custom__" : options.model}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setCustomOllamaModel(options.model);
                          } else {
                            setCustomOllamaModel("");
                            setOptions({ ...options, model: e.target.value });
                          }
                        }}
                        disabled={loading}
                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800"
                      >
                        <optgroup label="Default Supported Models">
                          {SUPPORTED_MODELS.ollama.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.tag})
                            </option>
                          ))}
                        </optgroup>
                        {ollamaStatus.models.length > 0 && (
                          <optgroup label="Locally Installed on Your Ollama">
                            {ollamaStatus.models
                              .filter((mName) => !SUPPORTED_MODELS.ollama.some((sm) => sm.id === mName))
                              .map((mName) => (
                                <option key={mName} value={mName}>
                                  🦙 {mName} (Local Tag)
                                </option>
                              ))}
                          </optgroup>
                        )}
                        <optgroup label="Custom">
                          <option value="__custom__">✏️ Custom Model Tag...</option>
                        </optgroup>
                      </select>
                    )}

                    {selectedProvider === "litellm" && (
                      <select
                        id="model-select"
                        value={customLiteLLMModel ? "__custom__" : options.model}
                        onChange={(e) => {
                          if (e.target.value === "__custom__") {
                            setCustomLiteLLMModel(options.model);
                          } else {
                            setCustomLiteLLMModel("");
                            setOptions({ ...options, model: e.target.value });
                          }
                        }}
                        disabled={loading}
                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-800"
                      >
                        <optgroup label="Default LiteLLM Routes">
                          {SUPPORTED_MODELS.litellm.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.tag})
                            </option>
                          ))}
                        </optgroup>
                        {litellmStatus.models.length > 0 && (
                          <optgroup label="Discovered from LiteLLM Proxy">
                            {litellmStatus.models
                              .filter((mName) => !SUPPORTED_MODELS.litellm.some((sm) => sm.id === mName))
                              .map((mName) => (
                                <option key={mName} value={mName}>
                                  🌐 {mName}
                                </option>
                              ))}
                          </optgroup>
                        )}
                        <optgroup label="Custom">
                          <option value="__custom__">✏️ Custom Model Route / Tag...</option>
                        </optgroup>
                      </select>
                    )}
                  </div>

                  {/* Remote Scraper Engine Selector */}
                  <div className="space-y-1">
                    <label htmlFor="remote-select" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                      <Globe size={11} className="text-indigo-600" />
                      <span>Scraper Engine</span>
                    </label>
                    <select
                      id="remote-select"
                      value={options.remoteCapability}
                      onChange={(e) => setOptions({ ...options, remoteCapability: e.target.value })}
                      disabled={loading}
                      className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    >
                      <option value="google-free">🌐 Smart Direct + Fallback Proxy</option>
                      <option value="reader-proxy">🛡️ Remote Reader Proxy (Jina AI)</option>
                      <option value="direct">⚡ Strict Direct DOM Scraping</option>
                    </select>
                  </div>

                  {/* Language Selector */}
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="language-select" className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Languages size={11} className="text-indigo-600" />
                        <span>Generation Language</span>
                      </span>
                      <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                        Default: Both (Bilingual)
                      </span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setOptions({ ...options, language: "both" })}
                        disabled={loading}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                          options.language === "both" || !options.language
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold ring-2 ring-indigo-500/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>🌐</span>
                        <span className="truncate">Both (FR &amp; EN)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOptions({ ...options, language: "french" })}
                        disabled={loading}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                          options.language === "french"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold ring-2 ring-indigo-500/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>🇫🇷</span>
                        <span className="truncate">French</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOptions({ ...options, language: "english" })}
                        disabled={loading}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                          options.language === "english"
                            ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-2xs font-bold ring-2 ring-indigo-500/20"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>🇬🇧</span>
                        <span className="truncate">English</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Specific Provider Config (Ollama / Groq / LiteLLM) */}
                {selectedProvider === "ollama" && (
                  <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                        <Server size={13} className="text-emerald-600" />
                        <span>Ollama Daemon Setup</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {ollamaStatus.loading ? (
                          <span className="text-slate-500 flex items-center gap-1">
                            <RefreshCw size={11} className="animate-spin" /> Scanning...
                          </span>
                        ) : ollamaStatus.checked ? (
                          ollamaStatus.reachable ? (
                            <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} className="text-emerald-600" /> Connected ({ollamaStatus.models.length} local models)
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center gap-1 bg-amber-100/70 px-2 py-0.5 rounded-full" title={ollamaStatus.error}>
                              <XCircle size={11} className="text-amber-600" /> Offline (start `ollama serve`)
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={options.ollamaBaseUrl || "http://localhost:11434"}
                            onChange={(e) => setOptions({ ...options, ollamaBaseUrl: e.target.value })}
                            placeholder="http://localhost:11434"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => checkOllama(options.ollamaBaseUrl, options.ollamaApiKey)}
                          disabled={ollamaStatus.loading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
                        >
                          <RefreshCw size={12} className={ollamaStatus.loading ? "animate-spin" : ""} />
                          <span>Scan Models</span>
                        </button>
                      </div>

                      {/* Optional API Key for secured Ollama / Cloudflare Tunnels */}
                      <div className="relative flex items-center">
                        <input
                          type={showOllamaKey ? "text" : "password"}
                          value={options.ollamaApiKey || ""}
                          onChange={(e) => setOptions({ ...options, ollamaApiKey: e.target.value })}
                          placeholder="Ollama API Key (Optional for proxies/tunnels)"
                          className="w-full text-xs pl-2.5 pr-8 py-1.5 rounded-lg border border-emerald-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOllamaKey(!showOllamaKey)}
                          className="absolute right-2 text-slate-400 hover:text-slate-600"
                        >
                          {showOllamaKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {customOllamaModel && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-emerald-900 uppercase tracking-wider mb-1">
                          Custom Local Model Tag:
                        </label>
                        <input
                          type="text"
                          value={customOllamaModel}
                          onChange={(e) => {
                            setCustomOllamaModel(e.target.value);
                            setOptions({ ...options, model: e.target.value });
                          }}
                          placeholder="e.g. codellama:7b, deepseek-r1:14b, llama3.2:1b"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-white font-mono text-slate-800 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedProvider === "litellm" && (
                  <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-100 space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-sky-950">
                        <Network size={13} className="text-sky-600" />
                        <span>LiteLLM Proxy Host &amp; Credentials</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {litellmStatus.loading ? (
                          <span className="text-slate-500 flex items-center gap-1">
                            <RefreshCw size={11} className="animate-spin" /> Connecting...
                          </span>
                        ) : litellmStatus.checked ? (
                          litellmStatus.reachable ? (
                            <span className="text-sky-700 font-semibold flex items-center gap-1 bg-sky-100/80 px-2 py-0.5 rounded-full">
                              <CheckCircle2 size={11} className="text-sky-600" /> Proxy Online ({litellmStatus.models.length} routes)
                            </span>
                          ) : (
                            <span className="text-amber-700 font-semibold flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded-full" title={litellmStatus.error}>
                              <XCircle size={11} className="text-amber-600" /> Proxy Unreachable
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={options.litellmBaseUrl || "http://192.168.1.17:4100"}
                            onChange={(e) => setOptions({ ...options, litellmBaseUrl: e.target.value })}
                            placeholder="http://192.168.1.17:4100"
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => checkLiteLLM(options.litellmBaseUrl, options.litellmApiKey)}
                          disabled={litellmStatus.loading}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-2xs cursor-pointer"
                        >
                          <RefreshCw size={12} className={litellmStatus.loading ? "animate-spin" : ""} />
                          <span>Scan Proxy</span>
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={showLiteLLMKey ? "text" : "password"}
                          value={options.litellmApiKey || ""}
                          onChange={(e) => setOptions({ ...options, litellmApiKey: e.target.value })}
                          placeholder="LiteLLM Master Key (sk-... / proxy api key)"
                          className="w-full text-xs pl-2.5 pr-8 py-1.5 rounded-lg border border-sky-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLiteLLMKey(!showLiteLLMKey)}
                          className="absolute right-2 text-slate-400 hover:text-slate-600"
                        >
                          {showLiteLLMKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>

                    {customLiteLLMModel && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-sky-900 uppercase tracking-wider mb-1">
                          Custom Model Route / Tag:
                        </label>
                        <input
                          type="text"
                          value={customLiteLLMModel}
                          onChange={(e) => {
                            setCustomLiteLLMModel(e.target.value);
                            setOptions({ ...options, model: e.target.value });
                          }}
                          placeholder="e.g. anthropic/claude-3-7-sonnet, openai/gpt-4o, mistral/mistral-large"
                          className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-sky-200 bg-white font-mono text-slate-800 focus:outline-none"
                        />
                      </div>
                    )}
                    <p className="text-[11px] text-sky-800/80 leading-normal">
                      Connects directly to your LiteLLM Proxy OpenAI-compatible gateway at <code className="bg-sky-100/80 px-1 py-0.5 rounded font-mono font-semibold text-sky-900">192.168.1.17:4100</code>.
                    </p>
                  </div>
                )}

                {selectedProvider === "groq" && (
                  <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-orange-950">
                      <span className="flex items-center gap-1.5">
                        <Key size={12} className="text-orange-600" />
                        <span>Groq API Key (Free Tier LPU)</span>
                      </span>
                      {groqStatus.hasServerKey && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} /> Server Key Configured
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showGroqKey ? "text" : "password"}
                        value={options.groqApiKey || ""}
                        onChange={(e) => setOptions({ ...options, groqApiKey: e.target.value })}
                        placeholder={groqStatus.hasServerKey ? "Using server GROQ_API_KEY (optional override)" : "Paste Groq API Key (gsk_...)"}
                        className="w-full text-xs pl-2.5 pr-8 py-1.5 rounded-lg border border-orange-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        className="absolute right-2 text-slate-400 hover:text-slate-600"
                      >
                        {showGroqKey ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-orange-800/80 leading-normal">
                      Get a free Groq API key with fast LPU inference at{" "}
                      <a
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline text-orange-700 hover:text-orange-900"
                      >
                        console.groq.com/keys
                      </a>.
                    </p>
                  </div>
                )}

                {/* Include Full Transcript Option */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-200/80 transition-all cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(options.includeTranscript)}
                    onChange={(e) => setOptions({ ...options, includeTranscript: e.target.checked })}
                    disabled={loading}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800">
                        Inclure le transcript complet dans le post
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        Full Transcript
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Ajoute automatiquement la transcription complète avec liens vers les timestamps à la fin de l&apos;article Hugo généré.
                    </p>
                  </div>
                </label>

                {/* Customization & Saved Profile Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-xs font-semibold text-slate-700 hover:text-indigo-600 flex items-center gap-1.5 transition-colors cursor-pointer py-1 select-none"
                  >
                    <Settings2 size={13} className="text-indigo-600" />
                    <span>{showConfig ? "Hide Hugo Settings & Profile" : "Hugo Post Settings & Profile"}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${showConfig ? "rotate-180 text-indigo-600" : "text-slate-400"}`} />
                  </button>

                  <div className="flex items-center gap-2 text-xs">
                    {profileStatusMessage && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <Check size={12} /> {profileStatusMessage}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 font-semibold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                      title="Save current model, provider, tone, language, author to localStorage"
                    >
                      <Bookmark size={11} className={savedProfile ? "fill-indigo-600 text-indigo-600" : "text-indigo-600"} />
                      <span>{savedProfile ? "Update Profile" : "Save Profile"}</span>
                    </button>
                    {savedProfile && (
                      <button
                        type="button"
                        onClick={handleClearProfile}
                        className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                        title="Reset saved profile to default settings"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Preset Config options (Accordion/Collapsible) */}
                <AnimatePresence>
                  {showConfig && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden space-y-4 pt-1"
                    >
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Settings2 size={12} /> Hugo Post Customization
                        </h3>

                        {/* Author & Language */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <User size={10} /> Blog Author
                            </label>
                            <input
                              type="text"
                              value={options.author}
                              onChange={(e) => setOptions({ ...options, author: e.target.value })}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none bg-white font-medium"
                              placeholder="Personal Blog"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Languages size={10} /> Output Language
                            </label>
                            <select
                              value={options.language}
                              onChange={(e) => setOptions({ ...options, language: e.target.value })}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none bg-white font-medium"
                            >
                              <option value="both">🌐 Both (French &amp; English Bilingual - Default)</option>
                              <option value="french">🇫🇷 French (Français)</option>
                              <option value="english">🇬🇧 English</option>
                              <option value="Spanish">🇪🇸 Spanish (Español)</option>
                              <option value="German">🇩🇪 German (Deutsch)</option>
                              <option value="Portuguese">🇵🇹 Portuguese (Português)</option>
                              <option value="Italian">🇮🇹 Italian (Italiano)</option>
                              <option value="Japanese">🇯🇵 Japanese (日本語)</option>
                              <option value="Chinese">🇨🇳 Chinese (中文)</option>
                            </select>
                          </div>
                        </div>

                        {/* Tone Selection */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Writing Style / Tone
                          </label>
                          <select
                            value={options.tone}
                            onChange={(e) => setOptions({ ...options, tone: e.target.value })}
                            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none bg-white font-medium"
                          >
                            <option value="informative">Informative Tutorial (Default)</option>
                            <option value="editorial">Editorial Opinion / Analysis</option>
                            <option value="deep-tech">Deep Tech &amp; Full Code Analysis</option>
                            <option value="conversational">Casual &amp; Conversational Discussion</option>
                            <option value="concise-summary">Concise Summary (Short Post)</option>
                            <option value="key-takeaways">Actionable Key Takeaways Checklist</option>
                          </select>
                        </div>

                        {/* Custom Override Categories & Tags */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <FolderOpen size={10} /> Override Categories
                            </label>
                            <input
                              type="text"
                              value={options.customCategories}
                              onChange={(e) => setOptions({ ...options, customCategories: e.target.value })}
                              placeholder="e.g. tech, cloud"
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none bg-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Tag size={10} /> Override Tags
                            </label>
                            <input
                              type="text"
                              value={options.customTags}
                              onChange={(e) => setOptions({ ...options, customTags: e.target.value })}
                              placeholder="e.g. hugo, static-sites"
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none bg-white font-mono"
                            />
                          </div>
                        </div>

                        {/* Persistent User Settings Profile */}
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 space-y-2.5 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                              <Bookmark size={14} className={savedProfile ? "fill-indigo-600 text-indigo-600" : "text-slate-400"} />
                              <span>Generation Defaults Profile</span>
                              {savedProfile && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Check size={10} /> Active Profile
                                </span>
                              )}
                            </div>
                            {profileStatusMessage && (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                                <Check size={12} /> {profileStatusMessage}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {savedProfile ? (
                              <span>
                                Saved profile active: <strong className="text-slate-700 font-semibold">{savedProfile.provider.toUpperCase()}</strong> ({savedProfile.model}) • Tone: <strong className="text-slate-700 font-semibold">{savedProfile.tone}</strong> • Language: <strong className="text-slate-700 font-semibold">{savedProfile.language}</strong> • Author: <strong className="text-slate-700 font-semibold">{savedProfile.author}</strong> • Transcript: <strong className="text-slate-700 font-semibold">{savedProfile.includeTranscript ? "Full Included" : "Summary Only"}</strong>.
                              </span>
                            ) : (
                              <span>
                                Save your preferred model, engine, tone, language, and author as a persistent user profile in <code className="font-mono text-indigo-600">localStorage</code> so they don't have to be re-selected for every scrape.
                              </span>
                            )}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={handleSaveProfile}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                            >
                              <Bookmark size={12} />
                              <span>{savedProfile ? "Update Saved Profile" : "Save Current Settings as Profile"}</span>
                            </button>
                            {savedProfile && (
                              <button
                                type="button"
                                onClick={handleClearProfile}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-all cursor-pointer"
                              >
                                <span>Reset Profile</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scrape Action trigger */}
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-400 font-semibold rounded-xl shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing &amp; Compiling Hugo Post...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Scrape &amp; Generate Hugo Page</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Simulated Live Generation Loader */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      Live Static Compiler
                    </span>
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono px-2 py-0.5 rounded font-bold uppercase">
                      {options.model}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-200">
                      {loadingStep}
                    </p>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-1.5 rounded-full animate-[shimmer_15s_infinite_linear] bg-[linear-gradient(90deg,#6366f1,#818cf8,#6366f1)] bg-[length:200%_auto]"></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-800/40 rounded-xl border border-slate-800/40">
                    <HelpCircle size={15} className="text-slate-400 shrink-0" />
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Extracting core content via {options.remoteCapability === "reader-proxy" ? "Remote Reader Proxy" : "Direct Cheerio scraper"} and structuring with Google AI.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Notification Block */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3"
                >
                  <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wide">Scraping Failure</h4>
                    <p className="text-xs text-rose-700 leading-relaxed font-medium">{error}</p>
                    <p className="text-[11px] text-rose-600 pt-1">
                      Tip: Try selecting the <strong>"Remote Reader Proxy"</strong> in the Remote Engine dropdown.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History Panel Log */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <RecentPosts
                items={history}
                activeId={activePost ? activePost.originalUrl : null}
                onSelect={handleSelectHistoryItem}
                onDelete={handleDeleteHistoryItem}
                onClearAll={handleClearHistory}
              />
            </div>

          </div>

          {/* Right Column: Hugo Workspace & Dynamic Editor */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {activePost ? (
                <motion.div
                  key={activePost.originalUrl}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Generated Post Header Metadata details */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          {activePost.isYouTube && (
                            <span className="text-[10px] font-mono text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Youtube size={12} className="fill-red-600 text-red-600" />
                              <span>YouTube Video</span>
                            </span>
                          )}
                          {activePost.isInstagram && (
                            <span className="text-[10px] font-mono text-pink-700 font-bold bg-pink-50 border border-pink-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Instagram size={12} className="text-pink-600" />
                              <span>Instagram Reel</span>
                            </span>
                          )}
                          {activePost.isTikTok && (
                            <span className="text-[10px] font-mono text-cyan-800 font-bold bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded flex items-center gap-1">
                              <Video size={12} className="text-cyan-600" />
                              <span>TikTok Video</span>
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wide">
                            {options.tone} style
                          </span>
                          {activePost.modelUsed && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 border border-slate-200 bg-slate-50 text-slate-800">
                              {options.provider === "litellm" ? (
                                <>
                                  <Network size={10} className="text-sky-600" />
                                  <span className="text-sky-900 font-semibold">LiteLLM: {activePost.modelUsed}</span>
                                </>
                              ) : options.provider === "groq" ? (
                                <>
                                  <Zap size={10} className="text-orange-500 fill-orange-500" />
                                  <span className="text-orange-900 font-semibold">Groq: {activePost.modelUsed}</span>
                                </>
                              ) : options.provider === "ollama" ? (
                                <>
                                  <Server size={10} className="text-emerald-600" />
                                  <span className="text-emerald-900 font-semibold">Ollama: {activePost.modelUsed}</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={10} className="text-indigo-600" />
                                  <span className="text-indigo-900 font-semibold">Gemini: {activePost.modelUsed}</span>
                                </>
                              )}
                            </span>
                          )}
                          {activePost.savedFilePath && (
                            <span className="text-[10px] font-mono text-blue-700 font-bold bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded flex items-center gap-1" title="Persisted to mounted Docker volume / local disk">
                              <span>💾 {activePost.savedFilePath}</span>
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock size={11} className="text-indigo-600" />
                            <span>{postReadingTime.text} ({postReadingTime.words} words)</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">
                            Slug: /{activePost.suggestedSlug}
                          </span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">
                          {activePost.title}
                        </h2>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-500 font-semibold">
                            {activePost.isYouTube ? "YouTube Channel / Source:" : activePost.isInstagram ? "Instagram Creator:" : activePost.isTikTok ? "TikTok Creator:" : "Originally scraped from:"}
                          </span>
                          <a
                            href={activePost.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline"
                          >
                            <span className="truncate max-w-[240px]">{activePost.originalUrl}</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>

                        {/* YouTube Video Banner Card */}
                        {activePost.isYouTube && activePost.youtubeThumbnail && (
                          <div className="mt-3 p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-center gap-3">
                            <img
                              src={activePost.youtubeThumbnail}
                              alt={activePost.title}
                              referrerPolicy="no-referrer"
                              className="w-20 h-14 object-cover rounded-lg shadow-2xs border border-red-200"
                            />
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-red-600 tracking-wider">Video Presenter / Creator</span>
                              <p className="text-xs font-bold text-slate-900 truncate">{activePost.author}</p>
                              <a
                                href={activePost.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1"
                              >
                                <Play size={10} className="fill-red-600" />
                                <span>Watch Original on YouTube</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Instagram Reel Banner Card */}
                        {activePost.isInstagram && (
                          <div className="mt-3 p-3 bg-pink-50/50 rounded-xl border border-pink-200/80 flex items-center gap-3">
                            {activePost.instagramThumbnail ? (
                              <img
                                src={activePost.instagramThumbnail}
                                alt={activePost.title}
                                referrerPolicy="no-referrer"
                                className="w-14 h-16 object-cover rounded-lg shadow-2xs border border-pink-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                                <Instagram size={24} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-pink-600 tracking-wider">Instagram Reel / Video</span>
                              <p className="text-xs font-bold text-slate-900 truncate">{activePost.author || "Instagram Creator"}</p>
                              <a
                                href={activePost.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-1"
                              >
                                <Instagram size={11} />
                                <span>Open Reel on Instagram</span>
                              </a>
                            </div>
                          </div>
                        )}

                        {/* TikTok Video Banner Card */}
                        {activePost.isTikTok && (
                          <div className="mt-3 p-3 bg-cyan-50/50 rounded-xl border border-cyan-200/80 flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-950 text-cyan-400 border border-slate-800 rounded-xl flex items-center justify-center shadow-sm">
                              <Music size={22} className="text-cyan-400" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className="text-[10px] uppercase font-bold text-cyan-700 tracking-wider">TikTok Short Video</span>
                              <p className="text-xs font-bold text-slate-900 truncate">@{activePost.tiktokUsername || activePost.author || "creator"}</p>
                              <a
                                href={activePost.originalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-cyan-700 hover:text-cyan-800 font-medium inline-flex items-center gap-1"
                              >
                                <Video size={11} />
                                <span>View Video on TikTok</span>
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Download & Copy controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyText(editorFullFile, "full")}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        >
                          {copyFeedback === "full" ? (
                            <>
                              <Check size={14} className="text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copy Hugo File</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadFile}
                          className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center shadow-sm active:scale-95 transition-all cursor-pointer"
                          title="Download Markdown file"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {activePost.isYouTube ? "AI Video Summary & Key Insights" : "AI Scraper Summary"}
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                        "{activePost.summary}"
                      </p>
                    </div>

                    {/* On-Demand Translation Control Toolbar */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                          <Languages size={14} className="text-indigo-600" />
                          <span>Translate Post:</span>
                          <span className="text-[11px] font-normal text-slate-500">
                            (French / English / Bilingual with preserved Hugo shortcodes)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTranslate("french")}
                            disabled={translating}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            <span>🇫🇷</span>
                            <span>Translate to French</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTranslate("english")}
                            disabled={translating}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                          >
                            <span>🇬🇧</span>
                            <span>Translate to English</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleTranslate("both")}
                            disabled={translating}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer font-bold"
                          >
                            <span>🌐</span>
                            <span>Translate to Bilingual (Both)</span>
                          </button>
                        </div>
                      </div>

                      {translating && (
                        <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2 text-xs text-indigo-800">
                          <RefreshCw size={13} className="animate-spin text-indigo-600" />
                          <span>Translating post with {options.model} and updating Hugo markdown &amp; tags...</span>
                        </div>
                      )}

                      {translationSuccess && (
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-medium">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                          <span>{translationSuccess}</span>
                        </div>
                      )}

                      {translationError && (
                        <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2 text-xs text-rose-800">
                          <AlertCircle size={14} className="text-rose-600 shrink-0" />
                          <span>{translationError}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Tabbed workspace */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                    
                    {/* Tab Selectors bar */}
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-1 overflow-x-auto">
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => setActiveTab("preview")}
                          className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "preview"
                              ? "border-indigo-600 text-indigo-700 font-bold"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Eye size={14} />
                          <span>Reader Preview</span>
                        </button>
                        <button
                          onClick={() => setActiveTab("code")}
                          className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "code"
                              ? "border-indigo-600 text-indigo-700 font-bold"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <FileCode size={14} />
                          <span>Markdown Code (.md)</span>
                        </button>
                        <button
                          onClick={() => setActiveTab("frontmatter")}
                          className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "frontmatter"
                              ? "border-indigo-600 text-indigo-700 font-bold"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <FileText size={14} />
                          <span>YAML Front Matter</span>
                        </button>

                        <button
                          onClick={() => setActiveTab("og")}
                          className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "og"
                              ? "border-indigo-600 text-indigo-700 font-bold"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Share2 size={14} className="text-indigo-600" />
                          <span>OG Social Image</span>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-mono px-1.5 py-0.5 rounded font-semibold">
                            1200×630
                          </span>
                        </button>

                        <button
                          onClick={() => setActiveTab("seo")}
                          className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                            activeTab === "seo"
                              ? "border-indigo-600 text-indigo-700 font-bold"
                              : "border-transparent text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <Sparkles size={14} className="text-indigo-600" />
                          <span>SEO Audit &amp; Keywords</span>
                        </button>

                        {(activePost.rawTranscript || activePost.isYouTube || activePost.isInstagram || activePost.isTikTok) && (
                          <button
                            onClick={() => setActiveTab("transcript")}
                            className={`px-3 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                              activeTab === "transcript"
                                ? activePost.isInstagram
                                  ? "border-pink-600 text-pink-600 font-bold"
                                  : activePost.isTikTok
                                  ? "border-cyan-600 text-cyan-700 font-bold"
                                  : "border-red-600 text-red-600 font-bold"
                                : "border-transparent text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <Radio size={14} className={activePost.isInstagram ? "text-pink-500" : activePost.isTikTok ? "text-cyan-500" : "text-red-500"} />
                            <span>
                              {activePost.isInstagram ? "Reel Audio & Captions" : activePost.isTikTok ? "TikTok Video Captions" : "Video Transcript"}
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 select-none font-mono shrink-0 pl-2">
                        <span>Edit Mode Active</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      </div>
                    </div>

                    {/* Active Tab Screen */}
                    <div className="p-6 min-h-[400px]">
                      
                      {activeTab === "preview" && (
                        <div className="space-y-6">
                          {/* Simulated Hugo Post Meta Header */}
                          <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/20 rounded-r-xl space-y-1.5 select-none">
                            <h3 className="text-2xl font-bold text-slate-900 leading-tight">{activePost.title}</h3>
                            <div className="flex flex-wrap gap-y-1 items-center gap-3 text-xs text-slate-500 font-semibold font-mono">
                              <span>By {activePost.author}</span>
                              <span>•</span>
                              <span>{new Date(activePost.date).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1.5 text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs font-sans font-medium">
                                <Clock size={12} className="text-indigo-600" />
                                <span>{postReadingTime.text}</span>
                                <span className="text-slate-400 text-[10px]">({postReadingTime.words} words)</span>
                              </span>
                              {activePost.categories && activePost.categories.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 uppercase">{activePost.categories.join(", ")}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Render beautiful custom formatted markdown body */}
                          <div className="bg-white rounded-lg pt-2">
                            <MarkdownPreview content={editorMarkdown} youtubeVideoId={activePost.youtubeVideoId} />
                          </div>

                          {/* SEO Audit Section below the post preview */}
                          <div className="pt-6 border-t border-slate-200/80">
                            <SeoAudit
                              post={activePost}
                              markdownContent={editorMarkdown}
                              onUpdateDescription={handleUpdateDescriptionFromSeo}
                              onAddTag={handleAddTagFromSeo}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "code" && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Double-click inside to edit the compiled blog markdown file directly</span>
                            <button
                              onClick={() => handleCopyText(editorFullFile, "file")}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              {copyFeedback === "file" ? (
                                <>
                                  <Check size={12} className="text-emerald-500" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy File</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-950 font-mono text-sm shadow-sm">
                            <textarea
                              value={editorFullFile}
                              onChange={(e) => {
                                setEditorFullFile(e.target.value);
                                const parts = e.target.value.split("---");
                                if (parts.length >= 3) {
                                  const markdownBody = parts.slice(2).join("---").trim();
                                  setEditorMarkdown(markdownBody);
                                }
                              }}
                              className="w-full h-[450px] p-5 bg-slate-950 text-slate-200 outline-none resize-none font-mono text-xs leading-relaxed overflow-y-auto"
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      )}

                      {activeTab === "frontmatter" && (
                        <div className="space-y-4">
                          {/* Front Matter Action Banner */}
                          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <FileText size={14} className="text-indigo-600" />
                                <span>Hugo YAML Front Matter</span>
                                <span className="text-[10px] bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                                  {activePost.hugoFrontMatter.split("\n").length} lines
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Ready to paste directly at the top of your Hugo content markdown file (<code className="font-mono text-slate-700">content/posts/{activePost.suggestedSlug}.md</code>).
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyText(activePost.hugoFrontMatter, "fm")}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 text-xs shadow-sm transition-all cursor-pointer hover:shadow-indigo-500/20 active:scale-[0.98]"
                              >
                                {copyFeedback === "fm" ? (
                                  <>
                                    <Check size={14} className="text-emerald-300" />
                                    <span>Copied to Clipboard!</span>
                                  </>
                                ) : (
                                  <>
                                    <ClipboardCopy size={14} />
                                    <span>Copy to Clipboard</span>
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Copy without delimiter ---
                                  const rawWithoutDashes = activePost.hugoFrontMatter.replace(/^---\r?\n?/, "").replace(/\r?\n?---\s*$/, "").trim();
                                  handleCopyText(rawWithoutDashes, "fm-raw");
                                }}
                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium text-xs transition-all cursor-pointer"
                                title="Copy YAML without the leading and trailing --- dividers"
                              >
                                {copyFeedback === "fm-raw" ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <Check size={12} /> Copied Clean!
                                  </span>
                                ) : (
                                  <span>Copy Raw (No ---)</span>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Code container with floating copy button */}
                          <div className="relative rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-5 font-mono text-xs overflow-x-auto leading-relaxed shadow-lg">
                            <div className="absolute top-3 right-3 flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                                YAML
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(activePost.hugoFrontMatter, "fm")}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Copy YAML front matter to clipboard"
                              >
                                {copyFeedback === "fm" ? (
                                  <>
                                    <Check size={12} className="text-emerald-400" />
                                    <span className="text-emerald-300 font-semibold">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="pt-6"><code>{activePost.hugoFrontMatter}</code></pre>
                          </div>

                          {/* Open Graph Card preview and download under Front Matter */}
                          <OgImageCard post={activePost} />
                        </div>
                      )}

                      {activeTab === "og" && (
                        <div className="space-y-4">
                          <OgImageCard post={activePost} />
                        </div>
                      )}

                      {activeTab === "transcript" && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">
                                {activePost.isInstagram ? "Reel Description & Audio Captions" : activePost.isTikTok ? "TikTok Captions & Spoken Words" : "Timestamped Video Transcript"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border ${
                                activePost.isInstagram ? "bg-pink-50 text-pink-700 border-pink-200" : activePost.isTikTok ? "bg-cyan-50 text-cyan-800 border-cyan-200" : "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                {activePost.isInstagram ? "Instagram Audio" : activePost.isTikTok ? "TikTok Audio" : "YouTube Audio"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {activePost.rawTranscript && (
                                editorMarkdown.includes("## Transcription complète") ||
                                editorMarkdown.includes("## Full Video Transcript") ? (
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px] flex items-center gap-1">
                                    <Check size={12} className="text-emerald-600" />
                                    <span>Inclus dans le post</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleAppendTranscriptToPost}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                    title="Ajouter le transcript complet à la fin du post Markdown"
                                  >
                                    <FileText size={12} />
                                    <span>Ajouter au post</span>
                                  </button>
                                )
                              )}
                              <button
                                onClick={() => handleCopyText(activePost.rawTranscript || "", "transcript")}
                                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                              >
                                {copyFeedback === "transcript" ? (
                                  <>
                                    <Check size={12} className="text-emerald-500" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy Transcript</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Quick Filter Input */}
                          <div>
                            <input
                              type="text"
                              placeholder="Search within video transcript or captions (keywords, topics)..."
                              value={transcriptFilter}
                              onChange={(e) => setTranscriptFilter(e.target.value)}
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 text-slate-800 font-medium"
                            />
                          </div>

                          {/* Transcript Content Box */}
                          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 font-sans text-xs text-slate-700 max-h-[420px] overflow-y-auto space-y-3 leading-relaxed">
                            {activePost.rawTranscript ? (
                              activePost.rawTranscript
                                .split("\n\n")
                                .filter((block) => !transcriptFilter.trim() || block.toLowerCase().includes(transcriptFilter.toLowerCase()))
                                .map((block, idx) => {
                                  const timestampMatch = block.match(/^(\[\d{1,2}:\d{2}(?::\d{2})?\])/);
                                  const timestamp = timestampMatch ? timestampMatch[1] : null;
                                  const text = timestamp ? block.slice(timestamp.length).trim() : block;

                                  return (
                                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-2xs flex items-start gap-2">
                                      {timestamp ? (
                                        activePost.youtubeVideoId ? (
                                          <a
                                            href={buildYouTubeTimestampUrl(activePost.youtubeVideoId, timestamp)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={`Lire la vidéo à ${timestamp.replace(/^\[|\]$/g, "")}`}
                                            className="font-mono text-[11px] font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200/60 px-2 py-0.5 rounded shrink-0 flex items-center gap-1 transition-colors"
                                          >
                                            <Play size={10} className="fill-red-600" />
                                            <span>{timestamp}</span>
                                          </a>
                                        ) : (
                                          <span className="font-mono text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded shrink-0 flex items-center gap-1">
                                            <Play size={10} className="fill-red-600" />
                                            {timestamp}
                                          </span>
                                        )
                                      ) : (
                                        <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                          #{idx + 1}
                                        </span>
                                      )}
                                      <p className="text-slate-800 leading-relaxed">{text}</p>
                                    </div>
                                  );
                                })
                            ) : (
                              <p className="text-slate-400 italic">No transcript or audio notes available for this post.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "seo" && (
                        <div className="space-y-4">
                          <SeoAudit
                            post={activePost}
                            markdownContent={editorMarkdown}
                            onUpdateDescription={handleUpdateDescriptionFromSeo}
                            onAddTag={handleAddTagFromSeo}
                          />
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Metadata editor below the tabs for streamlined tweaking */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                    <MetadataEditor
                      post={activePost}
                      onChange={handleMetadataChange}
                    />
                  </div>

                </motion.div>
              ) : (
                /* Welcome Default State screen */
                <motion.div
                  key="empty-welcome"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[580px] space-y-6"
                >
                  <div className="p-5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner border border-indigo-100/30 flex items-center justify-center animate-bounce duration-1000">
                    <FileCode size={40} className="stroke-[1.5]" />
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hugo Static Post Generator</h2>
                    <p className="text-sm text-slate-500 leading-relaxed font-medium">
                      Convert any web page, developer blog, <strong>YouTube video</strong>, <strong>Instagram Reel</strong>, or <strong>TikTok video</strong> into a clean, markdown-formatted Hugo static page with automated front matter tags and shortcodes.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-xl text-left pt-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">STEP 1</span>
                      <h4 className="text-xs font-bold text-slate-900">Article or Video URL</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">Pick a sample or paste any blog, YouTube, Instagram Reel, or TikTok link.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">STEP 2</span>
                      <h4 className="text-xs font-bold text-slate-900">Google AI &amp; Transcripts</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">Gemini transcribes audio, parses content, and embeds Hugo shortcodes.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">STEP 3</span>
                      <h4 className="text-xs font-bold text-slate-900">Automate via ?url=</h4>
                      <p className="text-[11px] text-slate-500 leading-normal">Use <code className="text-indigo-600 font-mono">?url=...&amp;proceed=1</code> or bookmarklet for 1-click scraping.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowAutomationModal(true)}
                      className="text-xs font-bold px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-100 inline-flex items-center gap-1.5 transition-all"
                    >
                      <Zap size={14} className="fill-indigo-600" />
                      <span>Learn Automation &amp; Bookmarklet</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Automation & GET Caller Modal */}
      <AutomationModal
        isOpen={showAutomationModal}
        onClose={() => setShowAutomationModal(false)}
        currentUrl={url || (activePost ? activePost.originalUrl : "")}
        currentModel={options.model}
        currentProvider={options.provider || selectedProvider}
        includeTranscript={Boolean(options.includeTranscript)}
      />

    </div>
  );
}

