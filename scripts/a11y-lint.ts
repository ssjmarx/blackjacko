/**
 * The a11y lint — the hard gate behind the kit law (spec E8). Fails when any
 * file outside the kit creates Phaser objects or wires interactivity
 * directly: `this.add.` and `setInteractive` may appear only in
 * src/ui/kit.ts. Wired into `npm run check` after the docstring audit.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const KIT = join("src", "ui", "kit.ts");
const FORBIDDEN = [/this\.add\./, /setInteractive/];

/** Every .ts file under a directory, any depth, sorted for stable output. */
function walk(dir: string): string[] {
  const paths: string[] = [];
  const dive = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, entry.name);
      if (entry.isFile() && entry.name.endsWith(".ts")) paths.push(p);
      else if (entry.isDirectory()) dive(p);
    }
  };
  dive(dir);
  return paths.sort();
}

function main(): void {
  const files = [...walk(join("src", "scenes")), ...walk(join("src", "ui"))].filter((f) => f !== KIT);
  const violations: string[] = [];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const pat of FORBIDDEN) {
        if (pat.test(lines[i]!)) violations.push(`${f}:${i + 1} — /${pat.source}/ outside the kit`);
      }
    }
  }
  if (violations.length > 0) {
    console.error("a11y-lint: kit law violations — game objects must be created via src/ui/kit.ts:");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log(`a11y-lint: kit law holds (${files.length} files checked)`);
}

main();