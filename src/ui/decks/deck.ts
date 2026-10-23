/**
 * The Deck contract — swappable card art (spec E8/E9). A deck is pure data:
 * files, credit line, and the card byte to art mapping. Per-property decks
 * and the large-number option slot in without touching the felt.
 */

/** A deck's generated manifest (emitted by scripts/build-deck.ts). */
export interface DeckManifest {
  id: string;
  name: string;
  credit: string;
  page: { width: number; height: number };
  aspect: number;
  /** card byte (as a string key) -> art file name */
  faces: Record<string, string>;
  backs: string[];
}

/** One piece of deck art, addressed for the loader and the registry. */
export interface DeckFrame {
  key: string;
  file: string;
}

/** The deck as the felt sees it: byte-addressed art plus its credit line. */
export interface Deck {
  id: string;
  name: string;
  credit: string;
  /** native height over width — cards render at this aspect, fit in their box */
  aspect: number;
  backCount: number;
  faceFor(card: number): DeckFrame;
  backFor(index: number): DeckFrame;
}

/** Build a Deck from its manifest; art paths resolve against the deck dir. */
export function deckFromManifest(dir: string, m: DeckManifest): Deck {
  return {
    id: m.id,
    name: m.name,
    credit: m.credit,
    aspect: m.aspect,
    backCount: m.backs.length,
    faceFor: (card: number) => ({ key: `${m.id}:${card}`, file: `${dir}/${m.faces[String(card)]}` }),
    backFor: (index: number) => ({
      key: `${m.id}:back${index % m.backs.length}`,
      file: `${dir}/${m.backs[index % m.backs.length]}`,
    }),
  };
}