import React, { useState } from "react";
import { Check, Copy, Play, Youtube } from "lucide-react";
import { buildYouTubeTimestampUrl, isValidTimestampToken } from "../utils/youtube";

interface MarkdownPreviewProps {
  content: string;
  youtubeVideoId?: string;
}

export default function MarkdownPreview({ content, youtubeVideoId }: MarkdownPreviewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderTimestampBadge = (label: string, key: number, href?: string) => {
    const cleanLabel = label.replace(/^\[|\]$/g, "").trim();
    if (href) {
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Aller à ${cleanLabel} dans la vidéo`}
          className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 mr-1.5 shadow-2xs transition-colors no-underline align-baseline"
        >
          <Play size={10} className="fill-red-600 text-red-600" />
          <span>{cleanLabel}</span>
        </a>
      );
    }

    return (
      <span
        key={key}
        className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200/80 mr-1.5 shadow-2xs align-baseline"
      >
        <Play size={10} className="fill-red-600 text-red-600" />
        <span>{cleanLabel}</span>
      </span>
    );
  };

  // Safe inline markdown parsing for bold, code, links, and timestamps (matching links BEFORE standalone timestamps)
  const renderInlineStyles = (text: string, depth = 0): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let keyIndex = 0;

    // Match markdown links [label](url) BEFORE bracketed timestamps [01:30]
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[\d{1,2}:\d{2}(?::\d{2})?\])/g);

    const renderPlainWithBareTimestamps = (plain: string) => {
      if (!youtubeVideoId) {
        elements.push(plain);
        return;
      }

      const tsRegex = /(^|[\s(*\-—–])(\d{1,2}:\d{2}(?::\d{2})?)(?=$|[\s.,;:!?)*\-—–])/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = tsRegex.exec(plain)) !== null) {
        const prefix = match[1];
        const ts = match[2];
        const matchStart = match.index;

        if (!isValidTimestampToken(ts)) {
          continue;
        }

        const beforeText = plain.slice(lastIndex, matchStart) + prefix;
        if (beforeText) {
          elements.push(beforeText);
        }

        elements.push(renderTimestampBadge(ts, keyIndex++, buildYouTubeTimestampUrl(youtubeVideoId, ts)));
        lastIndex = matchStart + prefix.length + ts.length;
      }

      if (lastIndex < plain.length) {
        elements.push(plain.slice(lastIndex));
      }
    };

    parts.forEach((part) => {
      if (!part) return;

      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        const inner = part.slice(2, -2);
        elements.push(
          <strong key={keyIndex++} className="font-semibold text-slate-950">
            {depth < 2 ? renderInlineStyles(inner, depth + 1) : inner}
          </strong>
        );
      } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        elements.push(
          <code key={keyIndex++} className="px-1.5 py-0.5 rounded bg-slate-100 text-pink-600 font-mono text-xs font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      } else if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const labelEnd = part.indexOf("](");
        const label = part.slice(1, labelEnd);
        const url = part.slice(labelEnd + 2, -1);

        if (isValidTimestampToken(label)) {
          elements.push(renderTimestampBadge(label, keyIndex++, url));
        } else {
          elements.push(
            <a
              key={keyIndex++}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline font-medium"
            >
              {label}
            </a>
          );
        }
      } else if (/^\[\d{1,2}:\d{2}(?::\d{2})?\]$/.test(part) && isValidTimestampToken(part)) {
        const href = youtubeVideoId ? buildYouTubeTimestampUrl(youtubeVideoId, part) : undefined;
        elements.push(renderTimestampBadge(part, keyIndex++, href));
      } else {
        renderPlainWithBareTimestamps(part);
      }
    });

    return elements;
  };

  // Parse markdown content by blocks
  const parseMarkdown = (rawContent: string) => {
    const lines = rawContent.split("\n");
    const parsedBlocks: React.ReactNode[] = [];
    
    let isCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];
    let listBuffer: React.ReactNode[] = [];
    let orderedListBuffer: React.ReactNode[] = [];
    let currentBlockKey = 0;

    const flushList = () => {
      if (listBuffer.length > 0) {
        parsedBlocks.push(
          <ul key={`list-${currentBlockKey++}`} className="list-disc pl-6 mb-5 space-y-1.5 text-slate-700">
            {listBuffer}
          </ul>
        );
        listBuffer = [];
      }
      if (orderedListBuffer.length > 0) {
        parsedBlocks.push(
          <ol key={`olist-${currentBlockKey++}`} className="list-decimal pl-6 mb-5 space-y-1.5 text-slate-700">
            {orderedListBuffer}
          </ol>
        );
        orderedListBuffer = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block detection
      if (line.trim().startsWith("```")) {
        if (isCodeBlock) {
          // Closing code block
          isCodeBlock = false;
          const codeString = codeBuffer.join("\n");
          const blockId = `code-block-${currentBlockKey}`;
          const currentLang = codeLanguage || "code";
          
          parsedBlocks.push(
            <div key={`code-${currentBlockKey++}`} className="my-5 rounded-lg border border-slate-200 bg-slate-900 text-slate-100 font-mono text-sm overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-xs text-slate-400 font-sans border-b border-slate-700 select-none">
                <span className="uppercase tracking-wider font-semibold">{currentLang}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(codeString, blockId)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedId === blockId ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto max-h-96">
                <code>{codeString}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          codeLanguage = "";
        } else {
          // Opening code block
          flushList();
          isCodeBlock = true;
          codeLanguage = line.trim().slice(3).trim();
        }
        continue;
      }

      if (isCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      const trimmedLine = line.trim();

      // Hugo YouTube Shortcode detection: {{< youtube VIDEO_ID >}} or {{< youtube id="VIDEO_ID" >}}
      const ytShortcodeMatch = trimmedLine.match(/\{\{<\s*youtube\s+(?:id=)?["']?([a-zA-Z0-9_-]{11})["']?\s*>\}\}/i);
      if (ytShortcodeMatch && ytShortcodeMatch[1]) {
        flushList();
        const videoId = ytShortcodeMatch[1];
        parsedBlocks.push(
          <div key={`yt-shortcode-${currentBlockKey++}`} className="my-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 text-slate-300 text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Youtube size={16} className="text-red-500" />
                <span className="font-semibold text-slate-200 font-mono">Hugo Shortcode: &#123;&#123;&lt; youtube {videoId} &gt;&#125;&#125;</span>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-red-400 hover:text-red-300 underline font-medium"
              >
                Open on YouTube ↗
              </a>
            </div>
            <div className="relative w-full aspect-video bg-black">
              <iframe
                className="absolute inset-0 w-full h-full border-0"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube Video Embed"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
        continue;
      }

      // Hugo Instagram Shortcode detection: {{< instagram SHORTCODE >}}
      const igShortcodeMatch = trimmedLine.match(/\{\{<\s*instagram\s+(?:id=)?["']?([a-zA-Z0-9_-]+)["']?\s*>\}\}/i);
      if (igShortcodeMatch && igShortcodeMatch[1]) {
        flushList();
        const shortcode = igShortcodeMatch[1];
        parsedBlocks.push(
          <div key={`ig-shortcode-${currentBlockKey++}`} className="my-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md max-w-md mx-auto">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 text-slate-300 text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-pink-500 font-sans">📸 Instagram</span>
                <span className="font-semibold text-slate-200 font-mono text-[11px]">&#123;&#123;&lt; instagram {shortcode} &gt;&#125;&#125;</span>
              </div>
              <a
                href={`https://www.instagram.com/reel/${shortcode}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-pink-400 hover:text-pink-300 underline font-medium"
              >
                View on Instagram ↗
              </a>
            </div>
            <div className="relative w-full aspect-[9/12] bg-slate-950">
              <iframe
                className="absolute inset-0 w-full h-full border-0"
                src={`https://www.instagram.com/p/${shortcode}/embed/captioned/`}
                title="Instagram Reel Embed"
                allowTransparency
              />
            </div>
          </div>
        );
        continue;
      }

      // Hugo TikTok Shortcode detection: {{< tiktok ID >}} or {{< tiktok user="USERNAME" id="VIDEO_ID" >}}
      const ttShortcodeMatch = trimmedLine.match(/\{\{<\s*tiktok\s+(?:user=["']?[\w.-]+["']?\s+)?(?:id=)?["']?(\d+|[\w.-]+)["']?\s*>\}\}/i);
      if (ttShortcodeMatch && ttShortcodeMatch[1]) {
        flushList();
        const ttId = ttShortcodeMatch[1];
        parsedBlocks.push(
          <div key={`tt-shortcode-${currentBlockKey++}`} className="my-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-md max-w-sm mx-auto">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-950 text-slate-300 text-xs border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-cyan-400 font-sans">🎵 TikTok</span>
                <span className="font-semibold text-slate-200 font-mono text-[11px]">&#123;&#123;&lt; tiktok {ttId} &gt;&#125;&#125;</span>
              </div>
              <a
                href={/^\d+$/.test(ttId) ? `https://www.tiktok.com/video/${ttId}` : `https://www.tiktok.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                View on TikTok ↗
              </a>
            </div>
            <div className="relative w-full aspect-[9/16] bg-slate-950">
              <iframe
                className="absolute inset-0 w-full h-full border-0"
                src={`https://www.tiktok.com/embed/v2/${ttId}`}
                title="TikTok Video Embed"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        );
        continue;
      }

      // Heading 2
      if (trimmedLine.startsWith("## ")) {
        flushList();
        parsedBlocks.push(
          <h2 key={`h2-${currentBlockKey++}`} className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-100 pb-1 font-sans">
            {renderInlineStyles(trimmedLine.slice(3))}
          </h2>
        );
        continue;
      }

      // Heading 3
      if (trimmedLine.startsWith("### ")) {
        flushList();
        parsedBlocks.push(
          <h3 key={`h3-${currentBlockKey++}`} className="text-lg font-bold text-slate-900 mt-6 mb-3 font-sans">
            {renderInlineStyles(trimmedLine.slice(4))}
          </h3>
        );
        continue;
      }

      // Heading 4
      if (trimmedLine.startsWith("#### ")) {
        flushList();
        parsedBlocks.push(
          <h4 key={`h4-${currentBlockKey++}`} className="text-md font-semibold text-slate-800 mt-5 mb-2 font-sans">
            {renderInlineStyles(trimmedLine.slice(5))}
          </h4>
        );
        continue;
      }

      // Blockquotes
      if (trimmedLine.startsWith("> ")) {
        flushList();
        parsedBlocks.push(
          <blockquote key={`quote-${currentBlockKey++}`} className="border-l-4 border-indigo-500 pl-4 py-1.5 my-4 bg-slate-50 rounded-r text-slate-600 italic">
            {renderInlineStyles(trimmedLine.slice(2))}
          </blockquote>
        );
        continue;
      }

      // Bullet List Items
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        if (orderedListBuffer.length > 0) flushList();
        listBuffer.push(
          <li key={`li-${i}`} className="leading-relaxed">
            {renderInlineStyles(trimmedLine.slice(2))}
          </li>
        );
        continue;
      }

      // Ordered List Items
      const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
      if (orderedMatch) {
        if (listBuffer.length > 0) flushList();
        orderedListBuffer.push(
          <li key={`oli-${i}`} className="leading-relaxed">
            {renderInlineStyles(orderedMatch[1])}
          </li>
        );
        continue;
      }

      // Empty Lines
      if (trimmedLine === "") {
        flushList();
        continue;
      }

      // Default to paragraph
      flushList();
      parsedBlocks.push(
        <p key={`p-${currentBlockKey++}`} className="text-slate-600 leading-relaxed mb-4">
          {renderInlineStyles(trimmedLine)}
        </p>
      );
    }

    // Flush any remaining list elements
    flushList();

    return parsedBlocks;
  };

  return (
    <div id="markdown-viewer" className="prose max-w-none prose-slate">
      {parseMarkdown(content)}
    </div>
  );
}
