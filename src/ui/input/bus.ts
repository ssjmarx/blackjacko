/**
 * The command bus — one vocabulary for the whole table: every input surface
 * (buttons, keys, pointers) emits the same commands, and the round driver is
 * the only listener that acts on them. Pure routing, no DOM.
 */

/** Everything the player can tell the table, in one union. */
export type Command =
  | { kind: "deal" }
  | { kind: "hit" }
  | { kind: "stand" }
  | { kind: "double" }
  | { kind: "split" }
  | { kind: "surrender" }
  | { kind: "insurance"; take: boolean };

export type CommandKind = Command["kind"];

type Handler = (c: Command) => void;

/** The bus: emit a command, every registered handler hears it once. */
export class CommandBus {
  private handlers = new Set<Handler>();

  /** Register a handler; returns the unsubscribe function. */
  on(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  /** Broadcast a command to all registered handlers. */
  emit(c: Command): void {
    for (const h of this.handlers) h(c);
  }
}