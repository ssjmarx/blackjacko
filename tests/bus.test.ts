/**
 * The command bus law: one emit reaches every handler exactly once, and
 * unsubscribed handlers fall silent — the whole vocabulary, one destination.
 */
import { describe, it, expect } from "vitest";
import { CommandBus } from "../src/ui/input/bus.ts";
import { BOOK, resolveButtons } from "../src/ui/input/controls.ts";

describe("command bus", () => {
  it("delivers a command to every registered handler", () => {
    const bus = new CommandBus();
    const seen: string[] = [];
    bus.on((c) => seen.push(`${c.kind}#1`));
    bus.on((c) => seen.push(`${c.kind}#2`));
    bus.emit({ kind: "deal" });
    expect(seen).toEqual(["deal#1", "deal#2"]);
  });

  it("stops delivering after unsubscribe", () => {
    const bus = new CommandBus();
    const seen: string[] = [];
    const off = bus.on((c) => seen.push(c.kind));
    bus.on((c) => seen.push(`${c.kind}#2`));
    off();
    bus.emit({ kind: "hit" });
    expect(seen).toEqual(["hit#2"]);
  });

  it("delivers the full vocabulary, payloads intact", () => {
    const bus = new CommandBus();
    const seen: string[] = [];
    bus.on((c) => seen.push(c.kind === "insurance" ? `insurance:${c.take}` : c.kind));
    bus.emit({ kind: "insurance", take: true });
    bus.emit({ kind: "surrender" });
    bus.emit({ kind: "rescue" });
    expect(seen).toEqual(["insurance:true", "surrender", "rescue"]);
  });
});

describe("the five-button law table (always visible)", () => {
  it("idle: Deal enabled on D; the other four visible and disabled at base labels", () => {
    const r = resolveButtons("idle");
    expect(r.map((b) => b.label)).toEqual(["Deal", "Hit", "Stand", "Split", "Surrender"]);
    expect(r.map((b) => b.key)).toEqual(["D", "H", "S", "P", "R"]);
    expect(r.find((b) => b.id === "deal-double")).toMatchObject({ enabled: true, kind: "deal" });
    expect(r.filter((b) => b.enabled)).toHaveLength(1);
  });

  it("play: five visible; H and S always legal, the rest by flag", () => {
    const none = resolveButtons("play", {});
    expect(none.map((b) => b.label)).toEqual(["Double", "Hit", "Stand", "Split", "Surrender"]);
    expect(none.filter((b) => b.enabled).map((b) => b.kind)).toEqual(["hit", "stand"]);
    const all = resolveButtons("play", { double: true, split: true, surrender: true });
    expect(all.filter((b) => b.enabled)).toHaveLength(5);
    expect(all.find((b) => b.kind === "double")).toMatchObject({ key: "D", label: "Double" });
  });

  it("insurance: the Y/N pair rebinds onto buttons 2 and 3; the rest disabled at base labels", () => {
    const r = resolveButtons("insurance");
    expect(r.map((b) => b.label)).toEqual(["Deal", "Take Insurance", "Pass Insurance", "Split", "Surrender"]);
    expect(r.map((b) => b.key)).toEqual(["D", "Y", "N", "P", "R"]);
    expect(r.filter((b) => b.enabled).map((b) => b.label)).toEqual(["Take Insurance", "Pass Insurance"]);
  });

  it("a rescue-legal doubled hand rebinds R to F Forfeit", () => {
    const r = resolveButtons("play", { rescue: true });
    const fifth = r.find((b) => b.id === "surrender-forfeit");
    expect(fifth).toMatchObject({ label: "Forfeit", key: "F", kind: "rescue", enabled: true });
  });

  it("rescue legality alone does not enable double/split/surrender", () => {
    const r = resolveButtons("play", { rescue: true });
    expect(r.find((b) => b.kind === "double")?.enabled).toBe(false);
    expect(r.filter((b) => b.enabled).map((b) => b.kind)).toEqual(["hit", "stand", "rescue"]);
  });
});

describe("the book button (spec E14)", () => {
  it("is a sixth, always-enabled button: key B, alone on the panel's left", () => {
    expect(BOOK).toEqual({ id: "book", label: "Book", key: "B", kind: "book" });
  });

  it("the bus carries the book command to every handler", () => {
    const bus = new CommandBus();
    const seen: string[] = [];
    bus.on((c) => seen.push(c.kind));
    bus.emit({ kind: "book" });
    expect(seen).toEqual(["book"]);
  });

  it("the five-button law table is untouched by the book", () => {
    expect(resolveButtons("idle")).toHaveLength(5);
    expect(resolveButtons("idle").map((b) => b.key)).toEqual(["D", "H", "S", "P", "R"]);
  });
});