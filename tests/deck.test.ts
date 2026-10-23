/**
 * The English deck's manifest law: complete byte mapping, the four backs,
 * recorded aspect, and files that actually exist on disk.
 */
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import manifest from "../src/ui/decks/english-manifest.json";
import { deckFromManifest } from "../src/ui/decks/deck.ts";

describe("english deck manifest", () => {
  const faces = manifest.faces as Record<string, string>;

  it("maps all 52 card bytes to unique files", () => {
    const files = new Set<string>();
    for (let c = 0; c < 52; c++) {
      const f = faces[String(c)];
      expect(f, `card byte ${c}`).toBeDefined();
      expect(files.has(f), `duplicate file for byte ${c}`).toBe(false);
      files.add(f);
    }
    expect(files.size).toBe(52);
  });

  it("carries the four white-outlined backs", () => {
    expect(manifest.backs).toHaveLength(4);
  });

  it("every referenced file exists on disk", () => {
    const dir = join("public", "assets", "decks", "english");
    const onDisk = new Set(readdirSync(dir));
    for (let c = 0; c < 52; c++) {
      expect(onDisk.has(faces[String(c)]), faces[String(c)]).toBe(true);
    }
    for (const b of manifest.backs) expect(onDisk.has(b), b).toBe(true);
  });

  it("records the native page, aspect, and structured credit", () => {
    expect(manifest.page.width).toBeCloseTo(361.5);
    expect(manifest.page.height).toBeCloseTo(541.5);
    expect(manifest.aspect).toBeCloseTo(541.5 / 361.5);
    expect(manifest.credit.name).toBe("English Pattern playing Cards");
    expect(manifest.credit.author).toMatch(/Loren Osborn/);
    expect(manifest.credit.license).toBe("CC0");
    expect(manifest.credit.source).toMatch(/Wikimedia/);
  });

  it("deckFromManifest resolves bytes and wraps back indexes", () => {
    const deck = deckFromManifest("assets/decks/english", manifest);
    expect(deck.faceFor(0).file).toBe("assets/decks/english/as.svg");
    expect(deck.faceFor(51).file).toBe("assets/decks/english/kc.svg");
    expect(deck.backFor(0).file).toBe("assets/decks/english/blue_back.svg");
    expect(deck.backFor(4).file).toBe("assets/decks/english/blue_back.svg");
  });
});