/**
 * The English deck builder — validates the separated card files, moves them
 * into public/assets/decks/english/, and emits the runtime manifest plus the
 * calibration contact sheet. One run per deck refresh; the source folder is
 * consumed (moved) on success.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join("card images", "wikimediaimages", "english pattern individuals");
const OUT = join("public", "assets", "decks", "english");
const MANIFEST = join("src", "ui", "decks", "english-manifest.json");

const RANK_FILES = ["a", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"];
const SUIT_FILES = ["s", "h", "d", "c"];
const BACKS = ["blue_back.svg", "red_back.svg", "violet_back.svg", "yellow_back.svg"];

// every expected file name, in deck order
const EXPECTED: string[] = [];
for (const r of RANK_FILES) for (const s of SUIT_FILES) EXPECTED.push(`${r}${s}.svg`);
for (const b of BACKS) EXPECTED.push(b);

function fail(msg: string): never {
  console.error(`build-deck: ${msg}`);
  process.exit(1);
}

if (!existsSync(SRC)) {
  const populated = existsSync(OUT) && readdirSync(OUT).filter((f) => f.endsWith(".svg")).length >= EXPECTED.length;
  if (!populated) fail(`source folder missing and ${OUT} is not populated — nothing to build from`);
  console.log("build-deck: source already consumed; rebuilding manifest + calibration from the moved files");
}

if (existsSync(SRC)) {
  const found = new Set(readdirSync(SRC));
  for (const f of EXPECTED) if (!found.has(f)) fail(`missing card file: ${f}`);
  const extra = [...found].filter((f) => !EXPECTED.includes(f));
  if (extra.length > 0) fail(`unexpected files in source: ${extra.join(", ")}`);

  // per-file page check: every card carries its own near-identical page
  // (Inkscape selection bounds vary by ~0.2% per card — recorded, not policed)
  for (const f of EXPECTED) {
    const head = readFileSync(join(SRC, f), "utf8").slice(0, 600);
    if (!/width="[\d.]+"/.exec(head) || !/height="[\d.]+"/.exec(head)) fail(`${f}: no width/height on the root svg`);
  }

  mkdirSync(OUT, { recursive: true });
  for (const f of EXPECTED) cpSync(join(SRC, f), join(OUT, f));
  rmSync(SRC, { recursive: true });
}

// the page comes from the first face of the moved deck
let pw = 0;
let ph = 0;
{
  const head = readFileSync(join(OUT, EXPECTED[0]!), "utf8").slice(0, 600);
  const w = /width="([\d.]+)"/.exec(head);
  const h = /height="([\d.]+)"/.exec(head);
  if (!w || !h) fail(`${EXPECTED[0]}: no width/height on the root svg`);
  pw = Number(w[1]);
  ph = Number(h[1]);
}

// manifest: card byte -> file (byte = rankIdx * 4 + suit; suits in s,h,d,c order)
const faces: Record<string, string> = {};
RANK_FILES.forEach((r, ri) => {
  SUIT_FILES.forEach((s, si) => {
    faces[String(ri * 4 + si)] = `${r}${s}.svg`;
  });
});

const manifest = {
  id: "english",
  name: "English Pattern (PLUS)",
  credit: "English pattern playing cards · Loren Osborn · CC0 · via Wikimedia Commons",
  page: { width: pw, height: ph },
  aspect: ph / pw,
  faces,
  backs: BACKS,
};

mkdirSync(join("src", "ui", "decks"), { recursive: true });
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

// calibration contact sheet
const cards = EXPECTED.map((f) => `<figure><img src="${f}" alt="${f}" /><figcaption>${f}</figcaption></figure>`).join("\n");
writeFileSync(
  join(OUT, "calibration.html"),
  `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>english deck calibration</title>\n<style>body{background:#123322;color:#eee;font-family:monospace}figure{display:inline-block;margin:4px;text-align:center}img{height:180px;display:block;border:1px solid #333;border-radius:8px}figcaption{font-size:11px}</style>\n</head><body>\n<h1>english deck calibration — confirm each file's art matches its name</h1>\n${cards}\n</body></html>\n`,
);

console.log(`build-deck: moved ${EXPECTED.length} files -> ${OUT}`);
console.log(`build-deck: manifest -> ${MANIFEST}`);
console.log(`build-deck: calibration sheet -> ${OUT}/calibration.html (open it and confirm the identities)`);