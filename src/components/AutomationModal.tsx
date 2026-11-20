import React, { useState } from "react";
import { Copy, Check, ExternalLink, Zap, Terminal, Bookmark, Code2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUrl: string;
  currentModel: string;
  currentProvider?: string;
  includeTranscript?: boolean;
}

export default function AutomationModal({
  isOpen,
  onClose,
  currentUrl,
  currentModel,
  currentProvider = "gemini",
  includeTranscript = false,
}: AutomationModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleUrl = currentUrl.trim() || "https://gohugo.io/getting-started/quick-start/";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://my-hugo-generator.run.app";
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const transcriptParam = includeTranscript ? "&includeTranscript=1" : "";
  
  const automationLink = `${origin}${pathname}?url=${encodeURIComponent(sampleUrl)}&proceed=1&provider=${currentProvider}&model=${currentModel}${transcriptParam}`;
  const bookmarkletCode = `javascript:(function(){window.open('${origin}${pathname}?url='+encodeURIComponent(window.location.href)+'&proceed=1&provider=${currentProvider}&model=${currentModel}${transcriptParam}','_blank');})();`;
  const curlGetCommand = `curl -s "${origin}/api/scrape-and-generate?url=${encodeURIComponent(sampleUrl)}&provider=${currentProvider}&model=${currentModel}${transcriptParam}"`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
                <Zap size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Automation & GET Caller Link
                  <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                    ?url=...&proceed=1
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Trigger automatic remote scraping & Hugo blog generation with simple GET query parameters.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
            
            {/* 1. Direct 1-Click Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-indigo-600" />
                  <span>1-Click Automated Web Link</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Launches scraping on arrival</span>
              </div>
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs flex items-center justify-between gap-3 border border-slate-800">
                <span className="truncate flex-1 text-indigo-300">{automationLink}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(automationLink, "link")}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Copy automated URL"
                  >
                    {copiedKey === "link" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedKey === "link" ? "Copied" : "Copy"}</span>
                  </button>
                  <a
                    href={automationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Test Open in New Tab"
                  >
                    <ExternalLink size={14} />
                    <span>Test</span>
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Passing <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono font-semibold">?url=&lt;encoded_url&gt;&amp;proceed=1</code> automatically parses the target page and runs Gemini generation without manual clicks.
              </p>
            </div>

            {/* 2. Browser Bookmarklet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Bookmark size={14} className="text-amber-500" />
                  <span>Browser Bookmarklet (1-Click Scraping from Any Tab)</span>
                </label>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <p className="text-slate-600 leading-relaxed text-[12px]">
                  Drag this button to your browser's Bookmarks bar, or copy the JS snippet. When reading any web article, click the bookmark to instantly scrape it into a Hugo post!
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <a
                    href={bookmarkletCode}
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Drag this button to your Bookmarks Bar to install the bookmarklet!");
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 inline-flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
                    title="Drag me to your Bookmarks toolbar!"
                  >
                    <Bookmark size={14} />
                    <span>⚡ Send to Hugo Generator</span>
                  </a>
                  <button
                    onClick={() => handleCopy(bookmarkletCode, "bookmarklet")}
                    className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {copiedKey === "bookmarklet" ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{copiedKey === "bookmarklet" ? "Copied JS!" : "Copy Bookmarklet Code"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Programmatic API GET Endpoint */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal size={14} className="text-emerald-600" />
                  <span>Programmatic REST API (cURL / Webhooks)</span>
                </label>
                <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 font-bold px-2 py-0.5 rounded">GET /api/scrape-and-generate</span>
              </div>
              <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-xs relative group border border-slate-800">
                <pre className="overflow-x-auto text-[11px] leading-relaxed py-1 pr-16">{curlGetCommand}</pre>
                <button
                  onClick={() => handleCopy(curlGetCommand, "curl")}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  {copiedKey === "curl" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedKey === "curl" ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Returns clean JSON containing <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">title</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">hugoFrontMatter</code>, <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">markdownContent</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">hugoFullFile</code>.
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Provider: <strong className="text-indigo-600 uppercase font-mono">{currentProvider}</strong> &bull; Model: <strong className="text-slate-800">{currentModel}</strong>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
