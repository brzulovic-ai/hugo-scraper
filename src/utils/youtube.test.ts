import { describe, it, expect } from "vitest";
import {
  parseTimestampToSeconds,
  buildYouTubeTimestampUrl,
  isValidTimestampToken,
  linkifyYouTubeTimestampsInMarkdown,
  formatFullTranscriptSection,
} from "./youtube";

describe("YouTube timestamp utilities", () => {
  it("parses MM:SS and HH:MM:SS timestamps into seconds", () => {
    expect(parseTimestampToSeconds("00:00")).toBe(0);
    expect(parseTimestampToSeconds("02:30")).toBe(150);
    expect(parseTimestampToSeconds("[05:45]")).toBe(345);
    expect(parseTimestampToSeconds("1:05:10")).toBe(3910);
  });

  it("validates timestamp tokens properly", () => {
    expect(isValidTimestampToken("00:00")).toBe(true);
    expect(isValidTimestampToken("[02:30]")).toBe(true);
    expect(isValidTimestampToken("1:05:10")).toBe(true);
    expect(isValidTimestampToken("02:65")).toBe(false);
    expect(isValidTimestampToken("16:9")).toBe(false);
    expect(isValidTimestampToken("not-a-time")).toBe(false);
  });

  it("builds YouTube timestamp URLs", () => {
    expect(buildYouTubeTimestampUrl("abc123DEF45", "02:30")).toBe(
      "https://www.youtube.com/watch?v=abc123DEF45&t=150s"
    );
  });

  it("linkifies Chronologie des moments forts timestamps without breaking code or existing links", () => {
    const input = [
      "## Chronologie des moments forts",
      "00:00 Introduction sur l'évolution de l'automatisation.",
      "02:30 Démonstration des nouveaux agents IA dans n8n.",
      "- [05:45] Configuration du webhook",
      "- **10:15** Déploiement en production",
      "- [12:00](https://www.youtube.com/watch?v=abc123DEF45&t=720s) Déjà lié",
      "",
      "```bash",
      "# 02:30 inside code block should not be touched",
      "echo 00:00",
      "```",
      "",
      "Timestamp inline `03:15` stays code, date 2026-11-20T01:35:43 stays untouched, port 192.168.1.17:4100 stays untouched.",
    ].join("\n");

    const output = linkifyYouTubeTimestampsInMarkdown(input, "abc123DEF45");

    expect(output).toContain(
      "[00:00](https://www.youtube.com/watch?v=abc123DEF45&t=0s) Introduction sur l'évolution de l'automatisation."
    );
    expect(output).toContain(
      "[02:30](https://www.youtube.com/watch?v=abc123DEF45&t=150s) Démonstration des nouveaux agents IA dans n8n."
    );
    expect(output).toContain(
      "- [05:45](https://www.youtube.com/watch?v=abc123DEF45&t=345s) Configuration du webhook"
    );
    expect(output).toContain(
      "- **[10:15](https://www.youtube.com/watch?v=abc123DEF45&t=615s)** Déploiement en production"
    );
    expect(output).toContain(
      "- [12:00](https://www.youtube.com/watch?v=abc123DEF45&t=720s) Déjà lié"
    );
    expect(output).toContain("# 02:30 inside code block should not be touched");
    expect(output).toContain("`03:15`");
    expect(output).toContain("2026-11-20T01:35:43");
    expect(output).toContain("192.168.1.17:4100");
  });

  it("formats full transcript section with localized heading and clickable timestamps", () => {
    const raw =
      "[YouTube Video Transcript with Timestamps]:\n[00:00] Bonjour à tous\n\n[02:30] Voici n8n";

    const frSection = formatFullTranscriptSection(raw, {
      language: "french",
      youtubeVideoId: "abc123DEF45",
    });

    expect(frSection).toContain("## Transcription complète de la vidéo");
    expect(frSection).toContain(
      "[00:00](https://www.youtube.com/watch?v=abc123DEF45&t=0s) Bonjour à tous"
    );
    expect(frSection).toContain(
      "[02:30](https://www.youtube.com/watch?v=abc123DEF45&t=150s) Voici n8n"
    );
    expect(frSection).not.toContain("[YouTube Video Transcript with Timestamps]:");
  });
});
