import { describe, it, expect } from "vitest";
import {
  isYouTubeUrl,
  extractYouTubeVideoId,
  decodeHtmlEntities,
  formatSecondsToTimestamp,
  formatTranscript,
  generateHugoYouTubeShortcode,
} from "../src/utils/youtube";

describe("YouTube Utility & Transcript Tests", () => {
  describe("isYouTubeUrl", () => {
    it("detects standard YouTube watch URLs", () => {
      expect(isYouTubeUrl("https://www.youtube.com/watch?v=PivpCKEiQOQ")).toBe(true);
      expect(isYouTubeUrl("http://youtube.com/watch?v=Gjnup-PuquQ&t=45s")).toBe(true);
    });

    it("detects shortened youtu.be URLs", () => {
      expect(isYouTubeUrl("https://youtu.be/PivpCKEiQOQ")).toBe(true);
      expect(isYouTubeUrl("http://youtu.be/Gjnup-PuquQ?si=abcdef12345")).toBe(true);
    });

    it("detects YouTube Shorts and Embed URLs", () => {
      expect(isYouTubeUrl("https://www.youtube.com/shorts/PivpCKEiQOQ")).toBe(true);
      expect(isYouTubeUrl("https://www.youtube.com/embed/PivpCKEiQOQ")).toBe(true);
    });

    it("rejects non-YouTube URLs", () => {
      expect(isYouTubeUrl("https://gohugo.io/getting-started/")).toBe(false);
      expect(isYouTubeUrl("https://vimeo.com/123456789")).toBe(false);
      expect(isYouTubeUrl("")).toBe(false);
    });
  });

  describe("extractYouTubeVideoId", () => {
    it("extracts ID from standard watch URL", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=PivpCKEiQOQ")).toBe("PivpCKEiQOQ");
      expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=Gjnup-PuquQ&feature=share")).toBe("Gjnup-PuquQ");
    });

    it("extracts ID from short youtu.be URL", () => {
      expect(extractYouTubeVideoId("https://youtu.be/PivpCKEiQOQ")).toBe("PivpCKEiQOQ");
    });

    it("extracts ID from shorts URL", () => {
      expect(extractYouTubeVideoId("https://www.youtube.com/shorts/PivpCKEiQOQ")).toBe("PivpCKEiQOQ");
    });

    it("extracts direct 11-char ID", () => {
      expect(extractYouTubeVideoId("PivpCKEiQOQ")).toBe("PivpCKEiQOQ");
    });

    it("returns null for invalid URLs", () => {
      expect(extractYouTubeVideoId("https://example.com/not-youtube")).toBeNull();
      expect(extractYouTubeVideoId("")).toBeNull();
    });
  });

  describe("decodeHtmlEntities", () => {
    it("decodes common HTML entities found in subtitles", () => {
      expect(decodeHtmlEntities("Kubernetes &amp; Docker &gt; VMs")).toBe("Kubernetes & Docker > VMs");
      expect(decodeHtmlEntities("It&#39;s &quot;fast&quot; and reliable")).toBe("It's \"fast\" and reliable");
    });
  });

  describe("formatSecondsToTimestamp", () => {
    it("formats seconds into MM:SS format", () => {
      expect(formatSecondsToTimestamp(0)).toBe("[00:00]");
      expect(formatSecondsToTimestamp(65)).toBe("[01:05]");
      expect(formatSecondsToTimestamp(599)).toBe("[09:59]");
    });

    it("formats seconds into HH:MM:SS format when over an hour", () => {
      expect(formatSecondsToTimestamp(3665)).toBe("[01:01:05]");
    });
  });

  describe("formatTranscript", () => {
    it("groups transcript segments into timestamped paragraphs", () => {
      const segments = [
        { text: "Welcome to this guide.", start: 0 },
        { text: "Today we talk about Hugo.", start: 10 },
        { text: "Hugo is blazing fast.", start: 35 },
        { text: "It builds sites in milliseconds.", start: 45 },
      ];

      const formatted = formatTranscript(segments, 30);
      expect(formatted).toContain("[00:00] Welcome to this guide. Today we talk about Hugo.");
      expect(formatted).toContain("[00:35] Hugo is blazing fast. It builds sites in milliseconds.");
    });
  });

  describe("generateHugoYouTubeShortcode", () => {
    it("generates standard Hugo youtube shortcode", () => {
      expect(generateHugoYouTubeShortcode("PivpCKEiQOQ")).toBe("{{< youtube PivpCKEiQOQ >}}");
    });
  });
});
