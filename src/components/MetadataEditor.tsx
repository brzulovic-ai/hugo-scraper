import React, { useState, useEffect, useMemo } from "react";
import { HugoPost } from "../types";
import { Plus, X, Calendar, User, FileText, Globe, Tag, FolderOpen, Clock } from "lucide-react";
import { calculateReadingTime } from "../utils/seo";
import { formatHugoFrontMatter, generateOgImagePath } from "../utils/hugo";

interface MetadataEditorProps {
  post: HugoPost;
  onChange: (updatedPost: HugoPost) => void;
}

export default function MetadataEditor({ post, onChange }: MetadataEditorProps) {
  const [title, setTitle] = useState(post.title);
  const [author, setAuthor] = useState(post.author || "Personal Blog");
  const [slug, setSlug] = useState(post.suggestedSlug);
  const [date, setDate] = useState(post.date);
  const [description, setDescription] = useState(post.description);
  const [categories, setCategories] = useState<string[]>(post.categories || []);
  const [tags, setTags] = useState<string[]>(post.tags || []);

  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");

  // Sync state if post changes from outside (e.g. user selects a different history item)
  useEffect(() => {
    setTitle(post.title);
    setAuthor(post.author || "Personal Blog");
    setSlug(post.suggestedSlug);
    setDate(post.date);
    setDescription(post.description);
    setCategories(post.categories || []);
    setTags(post.tags || []);
  }, [post.originalUrl, post.title]);

  const readingTime = useMemo(() => {
    return calculateReadingTime(post.markdownContent);
  }, [post.markdownContent]);

  // Recalculate Front Matter & Hugo full file whenever metadata fields change
  const handleFieldChange = (
    newTitle: string,
    newAuthor: string,
    newSlug: string,
    newDate: string,
    newDesc: string,
    newCats: string[],
    newTgs: string[]
  ) => {
    const effectiveOgImage = post.ogImage || generateOgImagePath(newSlug);
    const updatedFrontMatter = formatHugoFrontMatter({
      title: newTitle,
      date: newDate,
      description: newDesc,
      slug: newSlug,
      author: newAuthor,
      categories: newCats,
      tags: newTgs,
      originalUrl: post.originalUrl,
      modelUsed: post.modelUsed,
      providerUsed: post.providerUsed,
      readingTime: readingTime.text,
      wordCount: readingTime.words,
      ogImage: effectiveOgImage,
      images: [effectiveOgImage],
    });

    const updatedFullFile = `${updatedFrontMatter}\n\n${post.markdownContent.trim()}\n`;

    onChange({
      ...post,
      title: newTitle,
      author: newAuthor,
      suggestedSlug: newSlug,
      date: newDate,
      description: newDesc,
      categories: newCats,
      tags: newTgs,
      ogImage: effectiveOgImage,
      images: [effectiveOgImage],
      hugoFrontMatter: updatedFrontMatter,
      hugoFullFile: updatedFullFile,
      readingTime: readingTime.text,
      wordCount: readingTime.words,
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    // Auto-generate slug from title
    const autoSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    setSlug(autoSlug);
    handleFieldChange(val, author, autoSlug, date, description, categories, tags);
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAuthor(val);
    handleFieldChange(title, val, slug, date, description, categories, tags);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSlug(val);
    handleFieldChange(title, author, val, date, description, categories, tags);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDate(val);
    handleFieldChange(title, author, slug, val, description, categories, tags);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDescription(val);
    handleFieldChange(title, author, slug, date, val, categories, tags);
  };

  const addCategory = () => {
    const cat = newCategory.trim();
    if (cat && !categories.includes(cat)) {
      const updated = [...categories, cat];
      setCategories(updated);
      setNewCategory("");
      handleFieldChange(title, author, slug, date, description, updated, tags);
    }
  };

  const removeCategory = (catToRemove: string) => {
    const updated = categories.filter(c => c !== catToRemove);
    setCategories(updated);
    handleFieldChange(title, author, slug, date, description, updated, tags);
  };

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      const updated = [...tags, tag];
      setTags(updated);
      setNewTag("");
      handleFieldChange(title, author, slug, date, description, categories, updated);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    handleFieldChange(title, author, slug, date, description, categories, updated);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-md font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            <span>Post Metadata Editor</span>
          </h3>
          <p className="text-xs text-slate-500">Live-edit values to update your Hugo front matter automatically.</p>
        </div>
        <div className="px-3 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-indigo-100 shadow-2xs">
          <Clock size={13} className="text-indigo-600" />
          <span>Reading Time: {readingTime.text}</span>
          <span className="text-indigo-400 font-normal">({readingTime.words} words)</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Blog Post Title
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          />
        </div>

        {/* Slug & Author Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Globe size={12} /> URL Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={handleSlugChange}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User size={12} /> Author
            </label>
            <input
              type="text"
              value={author}
              onChange={handleAuthorChange}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar size={12} /> Publication Date / ISO
          </label>
          <input
            type="text"
            value={date}
            onChange={handleDateChange}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-mono text-xs"
          />
        </div>

        {/* Description Excerpt */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Description Excerpt
          </label>
          <textarea
            value={description}
            onChange={handleDescriptionChange}
            rows={2}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white resize-y"
          />
        </div>

        {/* Categories Section */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <FolderOpen size={12} /> Categories
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            />
            <button
              type="button"
              onClick={addCategory}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No categories specified</span>
            ) : (
              categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-medium"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    className="hover:text-indigo-900 font-bold ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Tag size={12} /> Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Add tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags.length === 0 ? (
              <span className="text-xs text-slate-400 italic">No tags specified</span>
            ) : (
              tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-medium"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-slate-900 font-bold ml-0.5"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
