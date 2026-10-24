/**
 * The control bar — six always-visible buttons (spec E14): the Book alone on
 * the left, the five actions on the right, every one exactly card-sized by
 * the solver's one-size law; context changes labels and state, never presence.
 */
import type { TableLayout } from "../../layout/table.ts";
import type { Command, CommandKind } from "./bus.ts";
import type { CommandBus } from "./bus.ts";
import { registerObject } from "../domshell.ts";

/** The bar's context: idle (Deal only), play, insurance, or busy (a round in flight). */
export type ControlMode = "idle" | "play" | "insurance" | "busy";

/** Legality flags the round driver passes alongside the play mode. */
export interface ControlLegality {
  double?: boolean;
  split?: boolean;
  surrender?: boolean;
  rescue?: boolean;
}

/** One context's binding: the key chip, the label, and the command. */
export interface Binding {
  label: string;
  key: string;
  kind: CommandKind;
  /** payload for the insurance pair */
  take?: boolean;
}

interface Spec {
  id: string;
  /** the rest identity, shown (disabled) whenever the context has no binding */
  base: { label: string; key: string };
  /** bindings per context; a context without a binding disables at base */
  bindings: Partial<Record<ControlMode | "rescue", Binding>>;
}

/** The five-button law table: D dual Deal/Double, H dual Hit/Take, S dual Stand/Pass, R dual Surrender/Forfeit. */
export const CONTROL_SPECS: Spec[] = [
  {
    id: "deal-double",
    base: { label: "Deal", key: "D" },
    bindings: {
      idle: { label: "Deal", key: "D", kind: "deal" },
      play: { label: "Double", key: "D", kind: "double" },
    },
  },
  {
    id: "hit-take",
    base: { label: "Hit", key: "H" },
    bindings: {
      play: { label: "Hit", key: "H", kind: "hit" },
      insurance: { label: "Take Insurance", key: "Y", kind: "insurance", take: true },
    },
  },
  {
    id: "stand-pass",
    base: { label: "Stand", key: "S" },
    bindings: {
      play: { label: "Stand", key: "S", kind: "stand" },
      insurance: { label: "Pass Insurance", key: "N", kind: "insurance", take: false },
    },
  },
  {
    id: "split",
    base: { label: "Split", key: "P" },
    bindings: { play: { label: "Split", key: "P", kind: "split" } },
  },
  {
    id: "surrender-forfeit",
    base: { label: "Surrender", key: "R" },
    bindings: {
      play: { label: "Surrender", key: "R", kind: "surrender" },
      rescue: { label: "Forfeit", key: "F", kind: "rescue" },
    },
  },
];

/** The Book: the sixth button — always enabled, alone on the panel's left. */
export const BOOK = { id: "book", label: "Book", key: "B", kind: "book" } as const;

/** A resolved button: its current binding plus legality. */
export interface ResolvedButton {
  id: string;
  label: string;
  key: string;
  kind: CommandKind;
  /** payload for the insurance pair */
  take?: boolean;
  enabled: boolean;
}

/** Resolve the five buttons for a mode — pure, unit-tested, no DOM. */
export function resolveButtons(mode: ControlMode, legal: ControlLegality = {}): ResolvedButton[] {
  return CONTROL_SPECS.map((spec) => {
    const ctx: ControlMode | "rescue" =
      mode === "play" && legal.rescue === true && spec.bindings.rescue ? "rescue" : mode;
    const binding = spec.bindings[ctx];
    let enabled = false;
    if (binding) {
      if (mode === "play") {
        enabled =
          ctx === "rescue" ||
          binding.kind === "hit" ||
          binding.kind === "stand" ||
          (binding.kind === "double" && legal.double === true) ||
          (binding.kind === "split" && legal.split === true) ||
          (binding.kind === "surrender" && legal.surrender === true);
      } else {
        enabled = true;
      }
    }
    return {
      id: spec.id,
      label: binding?.label ?? spec.base.label,
      key: binding?.key ?? spec.base.key,
      kind: binding?.kind ?? "hit",
      take: binding?.take,
      enabled,
    };
  });
}

/** The mounted bar: mode switching, layout, and teardown. */
export interface ControlsHandle {
  /** Enable exactly the legal actions for a table mode. */
  setMode(mode: ControlMode, legal?: ControlLegality): void;
  /** Position the bar from the solved layout. */
  layout(l: TableLayout): void;
  /** Remove the bar and its keyboard listener. */
  destroy(): void;
}

/** Mount the control bar: the Book alone left, the five actions right, keyboard map, SR registration. */
export function mountControls(bus: CommandBus): ControlsHandle {
  const bar = document.createElement("div");
  bar.id = "bj-controls";
  const group = document.createElement("div");
  group.id = "bj-actions";
  bar.append(group);
  document.body.appendChild(bar);

  const buttons = new Map<string, HTMLButtonElement>();
  let mode: ControlMode = "idle";
  let legal: ControlLegality = {};

  /** Send one resolved button's command if it is currently legal. */
  function emit(r: ResolvedButton): void {
    if (!r.enabled) return;
    const c: Command = r.kind === "insurance" ? { kind: "insurance", take: r.take ?? false } : { kind: r.kind };
    bus.emit(c);
  }

  /** Repaint all five action buttons from the law table. */
  function render(): void {
    for (const r of resolveButtons(mode, legal)) {
      const b = buttons.get(r.id);
      if (!b) continue;
      b.disabled = !r.enabled;
      b.setAttribute("aria-label", `${r.label} (key ${r.key})`);
      const kbd = b.querySelector("kbd");
      const span = b.querySelector("span");
      if (kbd) kbd.textContent = r.key;
      if (span) span.textContent = r.label;
    }
  }

  for (const [i, spec] of CONTROL_SPECS.entries()) {
    const b = document.createElement("button");
    b.className = "bj-btn";
    b.id = `bj-btn-${spec.id}`;
    b.type = "button";
    b.disabled = true;
    const kbd = document.createElement("kbd");
    const span = document.createElement("span");
    b.append(kbd, span);
    b.addEventListener("click", () => {
      const r = resolveButtons(mode, legal).find((x) => x.id === spec.id);
      if (r) emit(r);
    });
    group.appendChild(b);
    buttons.set(spec.id, b);
    registerObject(`control ${i + 1} of ${CONTROL_SPECS.length}`, "button", "Context action; its label and key follow the table state.");
  }

  // the Book: always enabled, alone on the panel's outer side (spec E14)
  const book = document.createElement("button");
  book.className = "bj-btn";
  book.id = `bj-btn-${BOOK.id}`;
  book.type = "button";
  const bookKbd = document.createElement("kbd");
  const bookSpan = document.createElement("span");
  bookKbd.textContent = BOOK.key;
  bookSpan.textContent = BOOK.label;
  book.append(bookKbd, bookSpan);
  book.setAttribute("aria-label", `${BOOK.label} — the strategy card (key ${BOOK.key})`);
  book.addEventListener("click", () => bus.emit({ kind: BOOK.kind }));
  bar.prepend(book);
  registerObject("control book", "button", "Book — open the strategy card (key B). It arrives in pt6.");

  const onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
    if (e.key.toLowerCase() === BOOK.key.toLowerCase()) {
      e.preventDefault();
      bus.emit({ kind: BOOK.kind });
      return;
    }
    const r = resolveButtons(mode, legal).find((x) => x.enabled && x.key.toLowerCase() === e.key.toLowerCase());
    if (!r) return;
    e.preventDefault();
    emit(r);
  };
  window.addEventListener("keydown", onKey);

  return {
    setMode(m, l = {}) {
      mode = m;
      legal = l;
      render();
    },
    layout(l: TableLayout) {
      const c = l.controls;
      bar.classList.toggle("flipped", l.axisFlip);
      Object.assign(bar.style, {
        left: `${c.x}px`,
        top: `${c.y}px`,
        width: `${c.w}px`,
        height: `${c.h}px`,
      });
      // the one-size law (spec E14): the buttons ARE the cards — one solver value
      bar.style.setProperty("--bjz-btn-w", `${l.metrics.cardW}px`);
      bar.style.setProperty("--bjz-btn-h", `${l.metrics.cardH}px`);
      bar.style.setProperty("--bjz-btn-font", `${Math.max(9, l.metrics.cardH * 0.14)}px`);
      bar.style.setProperty("--bjz-btn-gap", `${l.metrics.buttonGap}px`);
    },
    destroy() {
      window.removeEventListener("keydown", onKey);
      bar.remove();
    },
  };
}