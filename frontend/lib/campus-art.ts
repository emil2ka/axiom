/** One art-directed campus cut-out per program. Adding a program without a
 * cut-out is not allowed: the catalog shows only universities with a real
 * campus visual, so every card renders the same way. */
export const BUILDINGS: Record<string, string> = {
  "pw-cs": "warsaw-tech-full",
  "uw-cs": "warsaw-uni",
  "swps-design": "swps-campus",
  "swps-psych": "swps-campus",
  "cuni-cs": "charles",
  "ctu-cs": "ctu-campus",
  "rwth-cs": "rwth",
  "polimi-ce": "polimi-campus",
  "unibo-econ": "unibo-campus",
  "upc-ds": "upc",
  "utwente-cs": "twente-campus",
  "aalto-sci": "aalto",
  "bme-cs": "bme",
  "rug-psych": "groningen-campus",
};

/** Мягкий цветовой фон под каждым кампусом — чтобы карточки не читались как одна обоина. */
export const TINTS: Record<string, string> = {
  "pw-cs": "#31251e",
  "uw-cs": "#242b31",
  "swps-design": "#282b2c",
  "swps-psych": "#282b2c",
  "cuni-cs": "#2d2927",
  "ctu-cs": "#242b31",
  "rwth-cs": "#232c32",
  "polimi-ce": "#2b2826",
  "unibo-econ": "#332b27",
  "upc-ds": "#2d2925",
  "utwente-cs": "#252d30",
  "aalto-sci": "#292b2d",
  "bme-cs": "#2e2924",
  "rug-psych": "#282a2d",
};

export const CAMPUS_FALLBACK = "bme";
