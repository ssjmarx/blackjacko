/**
 * The session seed law: `?seed=` parses ints, hashes strings, defaults to 1;
 * child streams are deterministic, salt-separated, and never collide.
 */
import { describe, it, expect } from "vitest";
import { deriveStream, sessionSeed } from "../src/ui/session.ts";

describe("sessionSeed — the seed parser", () => {
  it("parses an integer seed, defaults to 1, hashes strings", () => {
    expect(sessionSeed("")).toBe(1);
    expect(sessionSeed("?seed=42")).toBe(42);
    expect(sessionSeed("?seed=table7")).toBeGreaterThan(0);
    expect(sessionSeed("?seed=table7")).toBe(sessionSeed("?seed=table7"));
    expect(sessionSeed("?seed=42&x=1")).toBe(42);
  });
});

describe("deriveStream — the child-stream law", () => {
  it("is deterministic per (seed, salt) and separated by salt", () => {
    const a = deriveStream(42, 1);
    const b = deriveStream(42, 1);
    const c = deriveStream(42, 2);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);
  });

  it("the wood rail's salt walks a different path than any other salt", () => {
    const wood = deriveStream(123456, 0x776f6f64);
    const other = deriveStream(123456, 0x12345678);
    expect(wood()).not.toBe(other());
  });
});