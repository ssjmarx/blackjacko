/**
 * The DOM bridge — one side of the two-surface layout, and the home of the
 * accessibility registry. Zones go to CSS variables; objects register their
 * SR text here; the announcer and captions are one string, two sinks.
 */
import type { Rect, TableLayout } from "../layout/table.ts";
import { CAPTIONS, LOWER_THIRD } from "../config.ts";

interface Entry {
  role: string;
  sr: string;
}

const state = {
  announcer: null as HTMLElement | null,
  statePanel: null as HTMLElement | null,
  captions: null as HTMLElement | null,
  probes: null as HTMLElement | null,
  lowerThird: null as HTMLElement | null,
  objects: new Map<string, Entry>(),
  captionTimer: undefined as ReturnType<typeof setTimeout> | undefined,
  creditShown: false,
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
      top: "50%",
      transform: "translate(-50%, -50%)",
      maxWidth: `${CAPTIONS.maxWidthPct * 100}%`,
      background: CAPTIONS.background,
      color: CAPTIONS.color,
      font: "600 16px/1.35 system-ui, sans-serif",
      textAlign: "center",
      padding: "6px 14px",
      borderRadius: "6px",
      display: "none",
      pointerEvents: "none",
      zIndex: "90",
    });
    document.body.appendChild(state.captions);
  }
}

/** Every named zone of a layout, as a plain map for var/probe iteration. */
function zoneMap(l: TableLayout): Record<string, Rect> {
  return {
    safe: l.safe,
    pit: l.pit,
    discard: l.discard,
    shoe: l.shoe,
    deckExtra: l.deckExtra,
    dealer: l.dealer,
    player: l.player,
    countHud: l.countHud,
    controls: l.controls,
    chipTray: l.chipTray,
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
  // the captions center on the player/control-panel border (spec E14)
  if (state.captions) {
    state.captions.style.left = `${l.captionPoint.x}px`;
    state.captions.style.top = `${l.captionPoint.y}px`;
  }
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

/** Show the lower-third credit once; later calls reposition it silently. */
export function showLowerThird(text: string, l: TableLayout): void {
  if (!state.lowerThird) {
    state.lowerThird = document.createElement("div");
    state.lowerThird.id = "bj-lower-third";
    Object.assign(state.lowerThird.style, {
      position: "fixed",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      color: "#f5f0e1",
      font: "italic 600 20px/1.4 Georgia, serif",
      textAlign: "left",
      whiteSpace: "pre-line",
      WebkitTextStroke: "max(1.5px, 0.16em) #000",
      paintOrder: "stroke fill",
      textShadow:
        "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000",
      zIndex: "45",
      opacity: "0",
      transition: `opacity ${LOWER_THIRD.inMs}ms ease`,
      pointerEvents: "none",
    });
    document.body.appendChild(state.lowerThird);
  }
  // the credit sprouts up from the player zone's bottom-outer corner (spec E14)
  const p = l.player;
  const anchorX = l.axisFlip ? p.x + p.w : p.x;
  Object.assign(state.lowerThird.style, {
    left: l.axisFlip ? "auto" : `${anchorX}px`,
    right: l.axisFlip ? `${window.innerWidth - anchorX}px` : "auto",
    bottom: `${window.innerHeight - (p.y + p.h)}px`,
    maxWidth: `${l.axisFlip ? anchorX - l.safe.x : l.safe.x + l.safe.w - anchorX}px`,
    fontSize: `${Math.max(11, Math.min(28, Math.round(p.h * 0.08)))}px`,
  });
  if (state.creditShown) return;
  state.creditShown = true;
  state.lowerThird.textContent = text;
  requestAnimationFrame(reveal);
  setTimeout(hide, LOWER_THIRD.inMs + LOWER_THIRD.holdMs);
}

/** The fade-in half of the television credit. */
function reveal(): void {
  if (state.lowerThird) state.lowerThird.style.opacity = "1";
}

/** The fade-out half: after the hold, the credit leaves the screen. */
function hide(): void {
  if (!state.lowerThird) return;
  state.lowerThird.style.transition = `opacity ${LOWER_THIRD.outMs}ms ease`;
  state.lowerThird.style.opacity = "0";
  setTimeout(() => {
    if (state.lowerThird) state.lowerThird.style.display = "none";
  }, LOWER_THIRD.outMs);
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