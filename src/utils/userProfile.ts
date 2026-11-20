import { GenerationOptions, UserSettingsProfile } from "../types";

export const USER_PROFILE_STORAGE_KEY = "hugo_user_settings_profile";

/**
 * Loads the user's saved generation preferences profile from localStorage.
 */
export function loadSavedProfile(): UserSettingsProfile | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.model) {
      return parsed as UserSettingsProfile;
    }
  } catch (err) {
    console.warn("[Profile] Failed to parse saved user settings profile:", err);
  }
  return null;
}

/**
 * Saves current generation preferences (model, provider, tone, language, author, etc.)
 * as the user's persistent default profile in localStorage.
 */
export function saveUserProfile(options: GenerationOptions): UserSettingsProfile {
  const profile: UserSettingsProfile = {
    savedAt: Date.now(),
    author: options.author || "Personal Blog",
    tone: options.tone || "informative",
    language: options.language || "both",
    customCategories: options.customCategories || "",
    customTags: options.customTags || "",
    provider: (options.provider as "gemini" | "groq" | "ollama" | "litellm") || "gemini",
    model: options.model || "gemini-3.7-flash",
    remoteCapability: options.remoteCapability || "google-free",
    includeTranscript: Boolean(options.includeTranscript),
    ollamaBaseUrl: options.ollamaBaseUrl,
    litellmBaseUrl: options.litellmBaseUrl,
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn("[Profile] Failed to save profile to localStorage:", err);
    }
  }

  return profile;
}

/**
 * Removes the saved default profile from localStorage.
 */
export function clearSavedProfile(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    } catch (err) {
      console.warn("[Profile] Failed to clear user profile:", err);
    }
  }
}

/**
 * Merges a saved profile into GenerationOptions cleanly.
 */
export function applyProfileToOptions(
  profile: UserSettingsProfile,
  current: GenerationOptions
): GenerationOptions {
  return {
    ...current,
    author: profile.author || current.author,
    tone: profile.tone || current.tone,
    language: profile.language || current.language,
    customCategories: profile.customCategories !== undefined ? profile.customCategories : current.customCategories,
    customTags: profile.customTags !== undefined ? profile.customTags : current.customTags,
    provider: profile.provider || current.provider,
    model: profile.model || current.model,
    remoteCapability: profile.remoteCapability || current.remoteCapability,
    includeTranscript: profile.includeTranscript !== undefined ? Boolean(profile.includeTranscript) : current.includeTranscript,
    ollamaBaseUrl: profile.ollamaBaseUrl || current.ollamaBaseUrl,
    litellmBaseUrl: profile.litellmBaseUrl || current.litellmBaseUrl,
  };
}
