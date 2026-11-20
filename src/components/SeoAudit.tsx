import React, { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Hash,
  Search,
  Check,
  Plus,
  Clock,
  FileText,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { HugoPost } from "../types";
import { performSeoAudit, KeywordAnalysis, MetaDescriptionSuggestion } from "../utils/seo";

interface SeoAuditProps {
  post: HugoPost;
  markdownContent: string;
  onUpdateDescription: (newDesc: string) => void;
  onAddTag: (newTag: string) => void;
}

export default function SeoAudit({
  post,
  markdownContent,
  onUpdateDescription,
  onAddTag,
}: SeoAuditProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedDescId, setAppliedDescId] = useState<string | null>(null);
  const [selectedFocusKeyword, setSelectedFocusKeyword] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"meta" | "keywords" | "checklist">("meta");
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Perform full SEO calculation whenever content, title, description, or tags change
  const audit = useMemo(() => {
    return performSeoAudit(
      post.title,
      post.description,
      markdownContent,
      post.tags,
      post.categories
    );
  }, [post.title, post.description, markdownContent, post.tags, post.categories]);

  const handleApplyDescription = (suggestion: MetaDescriptionSuggestion) => {
    onUpdateDescription(suggestion.text);
    setAppliedDescId(suggestion.id);
    setTimeout(() => setAppliedDescId(null), 3000);
  };

  const handleAddTag = (keyword: string) => {
    onAddTag(keyword);
  };

  // Status color helpers
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  const getScoreBadgeBg = (score: number) => {
    if (score >= 85) return "bg-emerald-500";
    if (score >= 70) return "bg-amber-500";
    return "bg-rose-500";
  };

  const descLen = post.description ? post.description.trim().length : 0;
  const descProgress = Math.min(100, Math.round((descLen / 160) * 100));

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                SEO &amp; Content Audit
              </h3>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${getScoreColor(audit.overallScore)}`}>
                Score: {audit.overallScore}/100 • Grade {audit.grade}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live meta description suggestions &amp; keyword density intelligence based on current markdown
            </p>
          </div>
        </div>

        {/* Quick Stats & Expand Toggle */}
        <div className="flex items-center gap-3">
          {/* Estimated Reading Time Pill */}
          <div className="px-3 py-1.5 bg-indigo-50/80 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <Clock size={13} className="text-indigo-600 shrink-0" />
            <span>{audit.readingTime.text}</span>
            <span className="text-indigo-400 font-normal">({audit.readingTime.words} words)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isExpanded ? "Collapse SEO Audit" : "Expand SEO Audit"}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Internal Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("meta")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "meta"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <FileText size={13} />
                <span>Meta Description Suggestions</span>
                {descLen >= 120 && descLen <= 160 ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("keywords")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "keywords"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <TrendingUp size={13} />
                <span>Keyword Optimization</span>
                {audit.suggestedTagsToAdd.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[10px] rounded-full font-bold">
                    +{audit.suggestedTagsToAdd.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("checklist")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "checklist"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <CheckCircle2 size={13} />
                <span>SEO Scorecard ({audit.overallScore}%)</span>
              </button>
            </div>

            {/* Reading Speed indicator */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <span>Avg 200 WPM</span>
            </div>
          </div>

          {/* TAB 1: Meta Description Improvements */}
          {activeTab === "meta" && (
            <div className="space-y-5">
              {/* Current Meta Description & Google SERP Preview */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Search size={13} className="text-indigo-600" />
                    <span>Google Search Snippet Preview</span>
                  </span>

                  {/* Character gauge */}
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span
                      className={`font-bold ${
                        descLen >= 120 && descLen <= 160
                          ? "text-emerald-600"
                          : descLen > 160
                          ? "text-amber-600"
                          : "text-rose-600"
                      }`}
                    >
                      {descLen} / 160 chars
                    </span>
                    <span className="text-slate-400">
                      {descLen >= 120 && descLen <= 160
                        ? "(Optimal length)"
                        : descLen > 160
                        ? "(May get truncated)"
                        : "(Too brief)"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      descLen >= 120 && descLen <= 160
                        ? "bg-emerald-500"
                        : descLen > 160
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${descProgress}%` }}
                  />
                </div>

                {/* Simulated Google SERP Snippet */}
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 space-y-1 shadow-2xs font-sans">
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    <span className="font-semibold text-slate-700">example.com</span>
                    <span>›</span>
                    <span>posts</span>
                    <span>›</span>
                    <span className="text-slate-400">{post.suggestedSlug || "article"}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-indigo-700 hover:underline cursor-pointer truncate">
                    {post.title || "Post Title"}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {post.description || (
                      <span className="text-slate-400 italic">
                        No meta description provided. Search engines will automatically grab random page text.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Suggestions Panel */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600" />
                    <span>Suggested Meta Description Improvements</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Generated from your current markdown content
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {audit.suggestedMetaDescriptions.map((suggestion) => {
                    const isApplied = post.description === suggestion.text || appliedDescId === suggestion.id;
                    return (
                      <div
                        key={suggestion.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isApplied
                            ? "bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/10"
                            : "bg-white hover:bg-slate-50/60 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{suggestion.label}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {suggestion.charCount} chars
                            </span>
                            {isApplied && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full flex items-center gap-0.5">
                                <Check size={10} /> Active Description
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleApplyDescription(suggestion)}
                            disabled={isApplied}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isApplied
                                ? "bg-emerald-600 text-white cursor-default"
                                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 active:scale-95"
                            }`}
                          >
                            {isApplied ? (
                              <>
                                <Check size={12} />
                                <span>Applied!</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={12} />
                                <span>Apply to Post</span>
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/60 p-2.5 rounded-lg border border-slate-100">
                          "{suggestion.text}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Keyword Optimization */}
          {activeTab === "keywords" && (
            <div className="space-y-5">
              {/* Tag suggestions based on prominent words in markdown */}
              {audit.suggestedTagsToAdd.length > 0 && (
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-amber-600" />
                      <span>Suggested Tags from Content</span>
                    </span>
                    <span className="text-[11px] text-amber-700">
                      Prominent in markdown but missing in Hugo tags
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {audit.suggestedTagsToAdd.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Plus size={11} className="text-amber-600" />
                        <span>#{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Keyword Density Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash size={13} className="text-indigo-600" />
                    <span>Top Content Keywords &amp; Keyword Density</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Ideal density: 1.0% – 2.5%
                  </span>
                </div>

                {audit.topKeywords.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-4 bg-slate-50 rounded-xl text-center">
                    No prominent keywords found. Add more text to the markdown body.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Keyword</th>
                          <th className="py-2.5 px-3">Occurrences</th>
                          <th className="py-2.5 px-3">Density</th>
                          <th className="py-2.5 px-3">In Title</th>
                          <th className="py-2.5 px-3">In Meta</th>
                          <th className="py-2.5 px-3">In Headings</th>
                          <th className="py-2.5 px-3">Tagged</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {audit.topKeywords.map((k) => (
                          <tr key={k.keyword} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {k.keyword}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {k.count}x
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  k.status === "high"
                                    ? "bg-rose-100 text-rose-800"
                                    : k.status === "optimal"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {k.density}% {k.status === "high" && "⚠️ High"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {k.isInTitle ? (
                                <Check size={14} className="text-emerald-600 font-bold" />
                              ) : (
                                <span className="text-slate-300 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {k.isInDescription ? (
                                <Check size={14} className="text-emerald-600 font-bold" />
                              ) : (
                                <span className="text-slate-300 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {k.isInHeadings ? (
                                <Check size={14} className="text-emerald-600 font-bold" />
                              ) : (
                                <span className="text-slate-300 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {k.isTagged ? (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  Tagged
                                </span>
                              ) : (
                                <span className="text-slate-300 font-mono">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {!k.isTagged && (
                                <button
                                  type="button"
                                  onClick={() => handleAddTag(k.keyword)}
                                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Plus size={11} /> Add Tag
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Full SEO Scorecard Checklist */}
          {activeTab === "checklist" && (
            <div className="space-y-4">
              {/* Content overview counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-lg font-bold text-slate-900 font-mono">
                    {audit.contentStats.wordCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Total Words</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-lg font-bold text-slate-900 font-mono">
                    {audit.readingTime.minutes} min
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Estimated Reading Time</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-lg font-bold text-slate-900 font-mono">
                    {audit.contentStats.headingCount}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Subheadings (H1-H4)</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <span className="block text-lg font-bold text-slate-900 font-mono">
                    {post.tags ? post.tags.length : 0}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">Configured Tags</span>
                </div>
              </div>

              {/* Audit Checks List */}
              <div className="space-y-2.5">
                {audit.checks.map((check) => (
                  <div
                    key={check.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-start gap-3 shadow-2xs"
                  >
                    <div className="mt-0.5 shrink-0">
                      {check.status === "pass" && (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      )}
                      {check.status === "warning" && (
                        <AlertTriangle size={16} className="text-amber-500" />
                      )}
                      {check.status === "fail" && (
                        <XCircle size={16} className="text-rose-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-bold text-slate-900">{check.title}</h5>
                        <span className="text-[10px] font-mono font-semibold text-slate-400">
                          {check.score}/{check.maxScore} pts
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {check.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
