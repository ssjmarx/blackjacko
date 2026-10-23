/**
 * The DOM bridge — one side of the two-surface layout, and the home of the
 * accessibility registry. Zones go to CSS variables; objects register their
 * SR text here; the announcer and captions are one string, two sinks.
 */
import type { Rect, TableLayout } from "../layout/table.ts";
import { CAPTIONS } from "../config.ts";

interface Entry {
  role: string;
  sr: string;
}

const state = {
  announcer: null as HTMLElement | null,
  statePanel: null as HTMLElement | null,
  captions: null as HTMLElement | null,
  probes: null as HTMLElement | null,
  objects: new Map<string, Entry>(),
  captionTimer: undefined as ReturnType<typeof setTimeout> | undefined,
};

/** Grab the shell elements and create the captions band; safe to re-call. */
export function mountDomShell(): void {
  state.announcer = document.getElementById("sr-announcer");
  state.statePanel = document.getElementById("sr-state");
  if (!state.captions) {
    state.captions = document.createElement("div");
    state.captions.id = "bj-captions";
    state.captions.setAttribute("aria-hidden", "true");
    Object.assign(state.captions.style, {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "14%",
      maxWidth: `${CAPTIONS.maxWidthPct * 100}%`,
      background: CAPTIONS.background,
      color: CAPTIONS.color,
      font: "600 16px/1.35 system-ui, sans-serif",
      textAlign: "center",
      padding: "6px 14px",
      borderRadius: "6px",
      display: "none",
      pointerEvents: "none",
      zIndex: "40",
    });
    document.body.appendChild(state.captions);
  }
}

/** Every named zone of a layout, as a plain map for var/probe iteration. */
function zoneMap(l: TableLayout): Record<string, Rect> {
  return {
    safe: l.safe,
    penBar: l.penBar,
    chipTray: l.chipTray,
    dealer: l.dealer,
    shoe: l.shoe,
    player: l.player,
    insurance: l.insuranceSpot,
    countHud: l.countHud,
    context: l.contextPanel,
    contextButton: l.contextButton,
    lowerThird: l.lowerThird,
  };
}

/** Apply the solved zones to CSS custom properties on the root element. */
export function applyZones(l: TableLayout): void {
  const root = document.documentElement.style;
  root.setProperty("--bjz-orientation", l.orientation);
  root.setProperty("--bjz-card-w", `${l.metrics.cardW}px`);
  root.setProperty("--bjz-card-h", `${l.metrics.cardH}px`);
  root.setProperty("--bjz-chip-r", `${l.metrics.chipR}px`);
  for (const [name, r] of Object.entries(zoneMap(l))) {
    root.setProperty(`--bjz-${name}-x`, `${r.x}px`);
    root.setProperty(`--bjz-${name}-y`, `${r.y}px`);
    root.setProperty(`--bjz-${name}-w`, `${r.w}px`);
    root.setProperty(`--bjz-${name}-h`, `${r.h}px`);
  }
  l.lineSlots.forEach((s, i) => {
    root.setProperty(`--bjz-slot${i + 1}-x`, `${s.x}px`);
    root.setProperty(`--bjz-slot${i + 1}-y`, `${s.y}px`);
    root.setProperty(`--bjz-slot${i + 1}-w`, `${s.w}px`);
    root.setProperty(`--bjz-slot${i + 1}-h`, `${s.h}px`);
  });
}

/** Register a game object's SR description; the kit calls this on creation. */
export function registerObject(id: string, role: string, sr: string): void {
  state.objects.set(id, { role, sr });
  renderState();
}

/** Drop a game object from the registry. */
export function unregisterObject(id: string): void {
  state.objects.delete(id);
  renderState();
}

/** Announce text to the SR layer and print it as a caption (one string, two sinks). */
export function announce(text: string, opts: { speaker?: string } = {}): void {
  if (text.length === 0) return;
  const line = opts.speaker ? `${opts.speaker}: ${text}` : text;
  if (state.announcer) state.announcer.textContent = line;
  if (state.captions) {
    state.captions.textContent = line;
    state.captions.style.display = "block";
    if (state.captionTimer) clearTimeout(state.captionTimer);
    state.captionTimer = setTimeout(() => {
      if (state.captions) state.captions.style.display = "none";
    }, CAPTIONS.displayMs);
  }
}

/** Replace the SR state panel summary text. */
export function setStateSummary(text: string): void {
  if (state.statePanel) state.statePanel.textContent = text;
}

/** (Debug) Draw dashed probe divs for every zone, proving the shared solve. */
export function showProbes(l: TableLayout): void {
  clearProbes();
  state.probes = document.createElement("div");
  state.probes.id = "bj-probes";
  for (const [name, r] of Object.entries(zoneMap(l))) {
    if (r.w <= 0 || r.h <= 0) continue;
    const d = document.createElement("div");
    d.textContent = name;
    Object.assign(d.style, {
      position: "fixed",
      left: `${r.x}px`,
      top: `${r.y}px`,
      width: `${r.w}px`,
      height: `${r.h}px`,
      border: "1px dashed rgba(255,255,255,0.55)",
      color: "rgba(255,255,255,0.75)",
      font: "10px monospace",
      pointerEvents: "none",
      zIndex: "30",
    });
    state.probes.appendChild(d);
  }
  document.body.appendChild(state.probes);
}

/** Remove the debug probe divs. */
export function clearProbes(): void {
  state.probes?.remove();
  state.probes = null;
}

/** Re-render the SR state panel from the registry (debug entries stay silent). */
function renderState(): void {
  if (!state.statePanel) return;
  const lines: string[] = [];
  for (const [id, e] of state.objects) {
    if (e.role === "debug") continue;
    lines.push(`${id} (${e.role}): ${e.sr}`);
  }
  state.statePanel.textContent = lines.length > 0 ? lines.join(" · ") : "Table ready.";
}