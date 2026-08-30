import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPokemonSpriteUrl(pokemonId: string | null | undefined) {
  // Default to Porygon if no ID provided
  const id = pokemonId || "137";
  const pokemonNames: Record<string, string> = {
    "137": "porygon",
    "233": "porygon2",
    "474": "porygon-z",
    "374": "beldum",
    "375": "metang",
    "376": "metagross",
    "343": "baltoy",
    "344": "claydol",
    "436": "bronzor",
    "437": "bronzong",
    "462": "magnezone",
    "785": "tapu-koko",
    "081": "magnemite",
    "082": "magneton",
    "379": "registeel",
    "385": "jirachi"
  };

  const pokemonName = pokemonNames[id] || "porygon";
  return `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokemonName}.png`;
}

// A list of tech-themed Pokemon IDs that make sense for AI agents
export const techPokemonIds = [
  "137", // Porygon
  "233", // Porygon2
  "474", // Porygon-Z
  "374", // Beldum
  "375", // Metang
  "376", // Metagross
  "343", // Baltoy
  "344", // Claydol
  "436", // Bronzor
  "437", // Bronzong
  "462", // Magnezone
  "785", // Tapu Koko (Electric)
  "081", // Magnemite
  "082", // Magneton
  "379", // Registeel
  "385", // Jirachi
];

export function getRandomTechPokemonId() {
  return techPokemonIds[Math.floor(Math.random() * techPokemonIds.length)];
}

/**
 * Deterministic creature for entities without a stored sprite (e.g. wild
 * actors from the field guide): the same id always maps to the same sprite,
 * so cards don't shuffle creatures on every re-render.
 */
export function getStableTechPokemonId(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return techPokemonIds[hash % techPokemonIds.length];
}