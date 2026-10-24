/**
 * The control bar — the DOM twin of the felt (goal 4): real buttons with
 * visible keyboard chips, SR labels, and one command destination. The round
 * driver enables exactly the legal actions; keys respect the same state.
 */
import type { TableLayout } from "../../layout/table.ts";
import type { Command, CommandKind } from "./bus.ts";
import type { CommandBus } from "./bus.ts";
import { registerObject } from "../domshell.ts";

interface Spec {
  id: string;
  label: string;
  key: string;
  group: "round" | "play" | "insurance";
  kind: CommandKind;
  /** payload for the insurance pair */
  take?: boolean;
}

const SPECS: Spec[] = [
  { id: "deal", label: "Deal", key: "↵", group: "round", kind: "deal" },
  { id: "hit", label: "Hit", key: "H", group: "play", kind: "hit" },
  { id: "stand", label: "Stand", key: "S", group: "play", kind: "stand" },
  { id: "double", label: "Double", key: "D", group: "play", kind: "double" },
  { id: "split", label: "Split", key: "P", group: "play", kind: "split" },
  { id: "surrender", label: "Surrender", key: "R", group: "play", kind: "surrender" },
  { id: "insurance-yes", label: "Take insurance", key: "Y", group: "insurance", kind: "insurance", take: true },
  { id: "insurance-no", label: "Pass insurance", key: "N", group: "insurance", kind: "insurance", take: false },
];

export type ControlMode = "idle" | "play" | "insurance";

/** The mounted bar: mode switching, layout, and teardown. */
export interface ControlsHandle {
  /** Enable exactly the legal actions for a table mode. */
  setMode(mode: ControlMode, legal?: { double?: boolean; split?: boolean; surrender?: boolean }): void;
  /** Position the bar from the solved layout. */
  layout(l: TableLayout): void;
  /** Remove the bar and its keyboard listener. */
  destroy(): void;
}

/** Mount the control bar and wire its keyboard map to the bus. */
export function mountControls(bus: CommandBus): ControlsHandle {
  const bar = document.createElement("div");
  bar.id = "bj-controls";
  document.body.appendChild(bar);

  const buttons = new Map<string, HTMLButtonElement>();
  for (const spec of SPECS) {
    const b = document.createElement("button");
    b.className = "bj-btn";
    b.id = `bj-btn-${spec.id}`;
    b.type = "button";
    b.dataset.group = spec.group;
    b.setAttribute("aria-label", `${spec.label} (key ${spec.key === "↵" ? "Enter" : spec.key})`);
    const kbd = document.createElement("kbd");
    kbd.textContent = spec.key;
    const span = document.createElement("span");
    span.textContent = spec.label;
    b.append(kbd, span);
    b.addEventListener("click", () => emit(spec));
    bar.appendChild(b);
    buttons.set(spec.id, b);
    registerObject(`control ${spec.label}`, "button", `${spec.label} (key ${spec.key}).`);
  }

  function emit(spec: Spec): void {
    if (buttons.get(spec.id)?.disabled) return;
    const c: Command = spec.kind === "insurance" ? { kind: "insurance", take: spec.take ?? false } : { kind: spec.kind };
    bus.emit(c);
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
    const spec = SPECS.find((s) => (s.key === "↵" ? e.key === "Enter" : s.key.toLowerCase() === e.key.toLowerCase()));
    if (!spec) return;
    e.preventDefault();
    emit(spec);
  };
  window.addEventListener("keydown", onKey);

  return {
    setMode(mode, legal = {}) {
      for (const spec of SPECS) {
        const b = buttons.get(spec.id);
        if (!b) continue;
        // insurance mode shows only the pair; the round and play groups hide
        b.style.display = mode === "insurance" && spec.group !== "insurance" ? "none" : "";
        let enabled = false;
        if (mode === "idle") enabled = spec.kind === "deal";
        else if (mode === "insurance") enabled = spec.group === "insurance";
        else
          enabled =
            spec.kind === "hit" ||
            spec.kind === "stand" ||
            (spec.kind === "double" && (legal.double ?? false)) ||
            (spec.kind === "split" && (legal.split ?? false)) ||
            (spec.kind === "surrender" && (legal.surrender ?? false));
        b.disabled = !enabled;
      }
    },
    layout(l: TableLayout) {
      const c = l.controls;
      bar.classList.toggle("portrait", l.orientation === "portrait");
      bar.classList.toggle("flipped", l.axisFlip);
      Object.assign(bar.style, {
        left: `${c.x}px`,
        top: `${c.y}px`,
        width: `${c.w}px`,
        height: `${c.h}px`,
      });
    },
    destroy() {
      window.removeEventListener("keydown", onKey);
      bar.remove();
    },
  };
}