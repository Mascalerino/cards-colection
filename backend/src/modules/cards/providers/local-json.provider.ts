import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../../../data');

function readJson<T>(fileName: string): T {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

export interface RawMagicSet {
  id: string;
  name: string;
  setCode: string;
  cardmarketUrl: string;
  ownedCards: number;
  cardMarketExpansionId: number;
}

export interface RawPokemonSet {
  id: string;
  name: string;
  cardmarketUrl: string;
  totalCards?: number;
  ownedCards: number;
}

export interface NarutoRarity {
  code: string;
  start: number;
  end: number;
}

export interface RawNarutoSeries {
  id: string;
  name: string;
  box: string;
  rarities: NarutoRarity[];
}

export function loadMagicSets(): RawMagicSet[] {
  return readJson<RawMagicSet[]>('magic-sets.json');
}

export function loadPokemonSets(): RawPokemonSet[] {
  return readJson<RawPokemonSet[]>('pokemon-sets.json');
}

export function loadNarutoSeries(): RawNarutoSeries[] {
  return readJson<{ series: RawNarutoSeries[] }>('naruto-sets.json').series;
}

/**
 * Genera las cartas "virtuales" de una serie de Naruto a partir de sus rangos
 * de rareza (no existe catálogo externo para este juego, es un checklist).
 */
export function generateNarutoCards(series: RawNarutoSeries) {
  const cards: { externalId: string; name: string; rarity: string }[] = [];

  for (const rarity of series.rarities) {
    for (let num = rarity.start; num <= rarity.end; num++) {
      // Mismo formato que generateCardCode() en el frontend: SERIE-RAREZA-NUM (3 dígitos)
      const code = `${series.id}-${rarity.code}-${String(num).padStart(3, '0')}`;
      cards.push({ externalId: code, name: code, rarity: rarity.code });
    }
  }

  return cards;
}
