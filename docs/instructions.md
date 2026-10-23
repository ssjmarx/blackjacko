# instructions.md — Agent Rules for blackjacko

**blackjacko is a human-directed project. The human owner leads and reviews; the AI agent (Cline, in VS Code) implements. These rules are non-negotiable guardrails. Read this file before doing anything.**

## 0. Prime directive: human-directed development, AI implementation

The human decides what gets built, reviews every change, and owns every commit. The agent writes the code, runs the commands, and manages the working tree between reviews. Every change stays reviewable: small diffs, one concern at a time. Nothing is committed and nothing is pushed without an explicit go from the human.

## 1. Ask, don't assume

The design documents are the canonical vision, subject to update by the human at any time. Read them at the start of every session (`.clinerules` fixes the boot order). The doc family has split responsibilities: `docs/ROADMAP.md` is the working roadmap (the only doc describing future work in detail), `docs/spec-0.2.md` is design law (spec v0.2 + errata, kept verbatim until the TypeScript migration; its Godot-era engine references are superseded by the Phaser/TS ruling — everything else stands), and `docs/dev_log.md` is the development log (rulings, changelogs, supersessions — evidence, not law). If anything needed for the task at hand is ambiguous or under-specified, **ask, don't assume** — a wrong guess ships in the diff.

## 2. File access: the whole repo is yours

The agent may read, create, edit, and delete files anywhere in the project as the task requires. Standing cautions:

- `docs/PROJECT_MAP.md` is **generated** by `scripts/projectmap.ts` (`npm run map`) — never hand-edit it; fix the docstrings in the `.ts` sources and re-run the audit.
- **File edits go through the file-modification tool, never the command line.** No shell heredocs, `sed -i`, or redirection to patch files — read commands are fine, but any write to a project file uses the editor tool.
- `results/` is simulation evidence (verdicts + raw battery output). Append; never rewrite history. The raw `*.jsonl` bulk is `.clineignore`d — the verdict files tell the story.

## 3. Commands: the agent runs them

The agent runs builds, tests, audits, and git plumbing itself. Two hard gates:

- `git commit` only on explicit human instruction, scoped to the agreed files.
- Anything outside the repo — installs, global config, `git push`, remote-repo creation — needs explicit human approval first.

Standing commands:

    npm run check          # typecheck + vitest + docstring audit — the done-gate
    npm test               # vitest only
    npm run map            # docstring audit; writes docs/PROJECT_MAP.md on a clean pass
    npm run sim            # quick verification battery (~1M hands/scenario)
    npm run verify         # the full 20M-hand battery — a deliberate act, never a gate

## 4. Working as lead engineer

- The human is the designer and final authority; the agent is the one writing the code. Significant decisions get a brief "what and why" in chat.
- When the human pastes code or an error: diagnose before fixing — read the error, form a hypothesis, test it, land the fix, and say what it was.
- When the human asks how something works, teach it; when they ask for a change, build it.

## 5. Memory bank maintenance (your standing duty)

Update the bank (`docs/`):

- at the end of every working session,
- whenever the human reports a milestone, ruling, or state change,
- whenever you notice the bank has drifted from reality.

## 6. House comment style and the docstring auditor

Every `src/` file is audited by **`scripts/projectmap.ts`** against the knkn-lineage comment law. On a clean pass it writes `docs/PROJECT_MAP.md`; on any violation it writes nothing and reports every issue. The audit governs every docstring in `src/`, so every comment or docstring the agent writes **must conform — re-run the audit after every comment edit.**

1. **Module header.** Every `src/**.ts` file begins with a `/** */` block of exactly **3 content lines**: a compact, information-dense description of the module's purpose. Not 2, not 4, and no blank ` *` lines inside.
2. **Function/class one-liners.** Exactly **one** `/** ... */` line directly above every `function` / `export function`, every `export class`, and every method (2-space indent, modifiers like `private`/`static`/`get` tolerated between docstring and signature). The one-liner is the function's API doc: what it does, inputs, return value, invariants the caller must know. Multi-line docstrings on functions are a violation; `constructor` is exempt.
3. **Inside function bodies:** single `//` one-liners only — never runs of 2+ consecutive comment lines, never `/** */` inside a body. Section banners (`// --- ... ---`) at top level are fine.
4. **Interfaces/types.** Their bodies are not audited, but field docstrings are encouraged and appear nowhere else — write them.

## 7. TypeScript law

- **tsc is the only type court.** Vitest strips types via esbuild, so a green test run proves nothing about types; `npm run typecheck` is part of every gate.
- Strict mode is non-negotiable. The codebase treats `noUncheckedIndexedAccess`-grade indexing discipline (`cards[i] as number`) as the norm — match it.
- The repo runs TypeScript directly on Node 24 (type stripping, `.ts` import extensions, `NodeNext` + `noEmit`). Keep that shape: no build step in the dev loop until Vite arrives with the Phaser front-end.
- **Exact pins.** Dependency versions in `package.json` are exact; upgrades are deliberate acts, never side effects.
- **Core purity.** `src/core/` and `src/sim/` never import Phaser, DOM, or Node-only modules beyond the harness's needs. Enforcement: `grep -rni phaser src/core/` returns nothing. Phaser renders; the core decides — the game must stay portable to any future presentation.
