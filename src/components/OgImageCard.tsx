import React, { useMemo, useState, useRef } from "react";
import { HugoPost } from "../types";
import { generateOgImageSvg, generateOgImagePath, svgToDataUri } from "../utils/ogImage";
import { Download, Copy, Check, Share2, Sparkles, ExternalLink, Image as ImageIcon, Twitter, Globe } from "lucide-react";

interface OgImageCardProps {
  post: HugoPost;
  siteName?: string;
}

export default function OgImageCard({ post, siteName = "Hugo Blog" }: OgImageCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [platformPreview, setPlatformPreview] = useState<"standard" | "twitter" | "linkedin">("standard");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const ogPath = useMemo(() => {
    return post.ogImage || (post.images && post.images.length > 0 ? post.images[0] : generateOgImagePath(post.suggestedSlug));
  }, [post.ogImage, post.images, post.suggestedSlug]);

  const svgContent = useMemo(() => {
    return generateOgImageSvg({
      title: post.title,
      description: post.description,
      author: post.author || "Personal Blog",
      date: post.date,
      readingTime: post.readingTime,
      wordCount: post.wordCount,
      tags: post.tags,
      categories: post.categories,
      slug: post.suggestedSlug,
      siteName,
    });
  }, [post.title, post.description, post.author, post.date, post.readingTime, post.wordCount, post.tags, post.categories, post.suggestedSlug, siteName]);

  const dataUri = useMemo(() => {
    return svgToDataUri(svgContent);
  }, [svgContent]);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(ogPath);
    setCopied("path");
    setTimeout(() => setCopied(null), 2200);
  };

  const handleCopySvg = () => {
    navigator.clipboard.writeText(svgContent);
    setCopied("svg");
    setTimeout(() => setCopied(null), 2200);
  };

  const handleDownloadSvg = () => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `og-${post.suggestedSlug || "post"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPng = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 1200, 630);
        ctx.drawImage(img, 0, 0, 1200, 630);
        const pngUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = `og-${post.suggestedSlug || "post"}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    img.src = dataUri;
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Share2 size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Open Graph (OG) Social Card</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-bold px-1.5 py-0.5 rounded-full">
                1200 × 630
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Automatically generated card synced with YAML front matter: <code className="font-mono text-indigo-600 font-semibold">{ogPath}</code>
            </p>
          </div>
        </div>

        {/* Platform View Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setPlatformPreview("standard")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              platformPreview === "standard"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "hover:text-slate-900"
            }`}
          >
            Raw Card
          </button>
          <button
            type="button"
            onClick={() => setPlatformPreview("twitter")}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              platformPreview === "twitter"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "hover:text-slate-900"
            }`}
          >
            <Twitter size={11} />
            <span>Twitter / X</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatformPreview("linkedin")}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              platformPreview === "linkedin"
                ? "bg-white text-indigo-700 font-bold shadow-2xs"
                : "hover:text-slate-900"
            }`}
          >
            <Globe size={11} />
            <span>LinkedIn</span>
          </button>
        </div>
      </div>

      {/* Card Visual Preview */}
      <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-inner">
        {platformPreview === "standard" && (
          <div className="relative aspect-[1200/630] w-full">
            <img
              src={dataUri}
              alt={`${post.title} Open Graph Card`}
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {platformPreview === "twitter" && (
          <div className="p-4 bg-slate-900 flex justify-center">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden shadow-xl">
              <div className="relative aspect-[1200/630] w-full border-b border-slate-800">
                <img
                  src={dataUri}
                  alt={`${post.title} Twitter Card`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 bg-slate-900/90 text-left space-y-1">
                <div className="text-[11px] text-slate-400 uppercase font-mono">myhugoblog.com</div>
                <div className="text-xs font-bold text-white line-clamp-1">{post.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2">{post.description}</div>
              </div>
            </div>
          </div>
        )}

        {platformPreview === "linkedin" && (
          <div className="p-4 bg-slate-100 flex justify-center">
            <div className="w-full max-w-lg rounded-lg border border-slate-300 bg-white overflow-hidden shadow-md">
              <div className="relative aspect-[1200/630] w-full">
                <img
                  src={dataUri}
                  alt={`${post.title} LinkedIn Card`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-left space-y-1">
                <div className="text-xs font-bold text-slate-900 line-clamp-1">{post.title}</div>
                <div className="text-[11px] text-slate-500 font-mono">myhugoblog.com • {post.readingTime || "3 min read"}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Buttons & YAML integration */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Download crisp 1200x630 PNG for direct social media upload"
          >
            <Download size={13} />
            <span>Download PNG</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Download scalable SVG vector file"
          >
            <ImageIcon size={13} />
            <span>Download SVG</span>
          </button>
          <button
            type="button"
            onClick={handleCopySvg}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1 transition-all cursor-pointer"
          >
            {copied === "svg" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copied === "svg" ? "SVG Copied!" : "Copy SVG"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyPath}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy relative image path for Hugo config"
          >
            {copied === "path" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
            <span>{copied === "path" ? "Path Copied!" : ogPath}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
