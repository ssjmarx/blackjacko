/**
 * The command bus law: one emit reaches every handler exactly once, and
 * unsubscribed handlers fall silent — the whole vocabulary, one destination.
 */
import { describe, it, expect } from "vitest";
import { CommandBus } from "../src/ui/input/bus.ts";
import { resolveButtons } from "../src/ui/input/controls.ts";

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

describe("the five-button law table", () => {
  it("idle shows exactly Deal, bound to D", () => {
    const r = resolveButtons("idle");
    const shown = r.filter((b) => b.label);
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ label: "Deal", key: "D", kind: "deal", enabled: true });
    expect(r.filter((b) => b.enabled)).toHaveLength(1);
  });

  it("play shows five buttons; H and S always legal, the rest by flag", () => {
    const none = resolveButtons("play", {});
    expect(none.filter((b) => b.enabled).map((b) => b.kind)).toEqual(["hit", "stand"]);
    const all = resolveButtons("play", { double: true, split: true, surrender: true });
    expect(all.filter((b) => b.enabled)).toHaveLength(5);
    expect(all.find((b) => b.kind === "double")).toMatchObject({ key: "D", label: "Double" });
  });

  it("insurance mode shows only the Y/N pair, rebound onto buttons 2 and 3", () => {
    const r = resolveButtons("insurance");
    const shown = r.filter((b) => b.label);
    expect(shown.map((b) => b.label)).toEqual(["Take Insurance", "Pass Insurance"]);
    expect(shown.map((b) => b.key)).toEqual(["Y", "N"]);
    expect(shown.every((b) => b.enabled)).toBe(true);
  });

  it("a rescue-legal doubled hand rebinds R to F Forfeit", () => {
    const r = resolveButtons("play", { rescue: true });
    const fifth = r.find((b) => b.id === "surrender-forfeit");
    expect(fifth).toMatchObject({ label: "Forfeit", key: "F", kind: "rescue", enabled: true });
  });

  it("rescue legality alone does not enable double/split/surrender", () => {
    const r = resolveButtons("play", { rescue: true });
    expect(r.find((b) => b.kind === "double")?.enabled).toBe(false);
    expect(r.find((b) => b.kind === "split")?.enabled).toBe(false);
    expect(r.filter((b) => b.enabled).map((b) => b.kind)).toEqual(["hit", "stand", "rescue"]);
  });
});