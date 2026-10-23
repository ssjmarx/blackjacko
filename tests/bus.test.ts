/**
 * The command bus law: one emit reaches every handler exactly once, and
 * unsubscribed handlers fall silent — the whole vocabulary, one destination.
 */
import { describe, it, expect } from "vitest";
import { CommandBus } from "../src/ui/input/bus.ts";

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
    expect(seen).toEqual(["insurance:true", "surrender"]);
  });
});