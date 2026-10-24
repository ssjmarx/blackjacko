/**
 * The control bar — five context-rebinding buttons, one row, right-aligned:
 * D deals/doubles, H hits/takes, S stands/passes, R surrenders/forfeits.
 * resolveButtons is the tested law table; mountControls renders and wires it.
 */
import type { TableLayout } from "../../layout/table.ts";
import type { Command, CommandKind } from "./bus.ts";
import type { CommandBus } from "./bus.ts";
import { registerObject } from "../domshell.ts";

export type ControlMode = "idle" | "play" | "insurance";

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
  /** bindings per context; a context without a binding hides the button */
  bindings: Partial<Record<ControlMode | "rescue", Binding>>;
}

/** The five-button law table: D dual Deal/Double, H dual Hit/Take, S dual Stand/Pass, R dual Surrender/Forfeit. */
export const CONTROL_SPECS: Spec[] = [
  {
    id: "deal-double",
    bindings: {
      idle: { label: "Deal", key: "D", kind: "deal" },
      play: { label: "Double", key: "D", kind: "double" },
    },
  },
  {
    id: "hit-take",
    bindings: {
      play: { label: "Hit", key: "H", kind: "hit" },
      insurance: { label: "Take Insurance", key: "Y", kind: "insurance", take: true },
    },
  },
  {
    id: "stand-pass",
    bindings: {
      play: { label: "Stand", key: "S", kind: "stand" },
      insurance: { label: "Pass Insurance", key: "N", kind: "insurance", take: false },
    },
  },
  { id: "split", bindings: { play: { label: "Split", key: "P", kind: "split" } } },
  {
    id: "surrender-forfeit",
    bindings: {
      play: { label: "Surrender", key: "R", kind: "surrender" },
      rescue: { label: "Forfeit", key: "F", kind: "rescue" },
    },
  },
];

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
    if (mode === "play") {
      if (binding)
        enabled =
          ctx === "rescue" ||
          binding.kind === "hit" ||
          binding.kind === "stand" ||
          (binding.kind === "double" && legal.double === true) ||
          (binding.kind === "split" && legal.split === true) ||
          (binding.kind === "surrender" && legal.surrender === true);
    } else {
      enabled = binding !== undefined;
    }
    return {
      id: spec.id,
      label: binding?.label ?? "",
      key: binding?.key ?? "",
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

/** Mount the control bar: five buttons, keyboard map, SR registration. */
export function mountControls(bus: CommandBus): ControlsHandle {
  const bar = document.createElement("div");
  bar.id = "bj-controls";
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

  /** Repaint all five buttons from the law table. */
  function render(): void {
    for (const r of resolveButtons(mode, legal)) {
      const b = buttons.get(r.id);
      if (!b) continue;
      b.style.display = r.label ? "" : "none";
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
    bar.appendChild(b);
    buttons.set(spec.id, b);
    registerObject(`control ${i + 1} of ${CONTROL_SPECS.length}`, "button", "Context action; its label and key follow the table state.");
  }

  const onKey = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
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