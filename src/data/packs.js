import PACKS from "./packs.json";

export function getPack(lang) {
  return PACKS[lang] || [];
}

export function getAvailableLanguages() {
  return Object.keys(PACKS);
}

export default PACKS;
