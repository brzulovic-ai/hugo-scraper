import React from "react";
import { HistoryItem } from "../types";
import { Clock, Trash2, ChevronRight, Sparkles, BookOpen, Youtube, Instagram, Video } from "lucide-react";

interface RecentPostsProps {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function RecentPosts({
  items,
  activeId,
  onSelect,
  onDelete,
  onClearAll
}: RecentPostsProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
        <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-3">
          <BookOpen size={20} />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No generated posts yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
          Paste a URL above to scrape its content and generate your first Hugo static page.
        </p>
      </div>
    );
  }

  // Extract a readable domain from absolute URL
  const getDomain = (urlStr: string) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace("www.", "");
    } catch {
      return urlStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Clock size={14} />
          <span>Recently Converted ({items.length})</span>
        </h3>
        <button
          onClick={onClearAll}
          className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map((item) => {
          const isActive = activeId === item.id || (activeId && item.post && activeId === item.post.originalUrl);
          return (
            <div
              key={item.id}
              className={`group relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-indigo-50/70 border-indigo-200 shadow-sm"
                  : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
              }`}
              onClick={() => onSelect(item)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  {item.post?.isYouTube && (
                    <span className="text-[9px] font-mono text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Youtube size={10} className="fill-red-600" />
                      <span>YouTube</span>
                    </span>
                  )}
                  {item.post?.isInstagram && (
                    <span className="text-[9px] font-mono text-pink-600 font-bold bg-pink-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Instagram size={10} />
                      <span>Instagram</span>
                    </span>
                  )}
                  {item.post?.isTikTok && (
                    <span className="text-[9px] font-mono text-cyan-700 font-bold bg-cyan-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Video size={10} />
                      <span>TikTok</span>
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                    {item.options.tone}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {getDomain(item.url)}
                  </span>
                </div>
                
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 leading-normal">
                  {item.post.title}
                </h4>

                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {item.post.description}
                </p>
              </div>

              <div className="flex items-center gap-1 self-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="p-1 text-slate-300 hover:text-rose-600 rounded hover:bg-rose-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                  title="Delete post"
                >
                  <Trash2 size={13} />
                </button>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
