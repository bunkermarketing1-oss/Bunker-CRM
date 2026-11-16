/**
 * Utilidad para asignar y obtener fotos de perfil reales para prospectos y usuarios.
 */

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const FEMALE_NAMES = new Set([
  "aimee",
  "mary",
  "nena",
  "mia",
  "karina",
  "carmen",
  "luz",
  "mercedes",
  "pilar",
  "rocio",
  "consuelo",
  "monica",
  "guadalupe",
  "valeria",
  "valentina",
  "sofia",
  "camila",
  "lucia",
  "mariana",
  "daniela",
  "fernanda",
  "alejandra",
  "paula",
  "andrea",
  "natalia",
  "gabriela",
  "elena",
  "rosa",
  "patricia",
  "claudia",
  "adriana",
  "janellie",
  "pau",
  "magnolia",
  "karen",
  "marina",
  "lorena",
  "isabel",
  "susana",
  "teresa",
  "maria",
  "ana",
  "laura",
  "paola",
  "diana",
  "jessica",
  "vanessa",
  "carolina",
  "veronica",
  "catalina",
  "alicia",
  "beatriz",
  "gloria",
  "ines",
  "juana",
  "luisa",
  "marta",
  "olga",
  "sandra",
  "silvia",
  "soledad",
  "victoria",
  "angela",
  "esperanza",
  "blanca",
  "rebeca",
  "ximena",
  "jimena",
  "marisol",
  "clara",
  "miriam",
  "loreto",
]);

const MALE_EXCEPTIONS = new Set([
  "joshua",
  "elias",
  "lucas",
  "matias",
  "borja",
  "bautista",
  "luca",
  "gallo",
  "pelea",
]);

/**
 * Normaliza nombres quitando acentos y diacríticos.
 */
function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Retorna la URL de foto de perfil para un prospecto o contacto.
 * 1. Si ya tiene `customAvatarUrl` válido almacenado, lo utiliza directamente.
 * 2. Si no tiene foto, asigna una fotografía de persona real consistente en alta resolución
 *    de acuerdo con su nombre y género estimado.
 */
export function getLeadAvatarUrl(
  name?: string | null,
  customAvatarUrl?: string | null
): string {
  if (customAvatarUrl && customAvatarUrl.trim().length > 0) {
    return customAvatarUrl;
  }

  const cleanName = (name || "Lead").trim();
  const rawFirstWord = cleanName.split(" ")[0] || "";
  const firstWord = normalizeWord(rawFirstWord);

  const isFemale =
    FEMALE_NAMES.has(firstWord) ||
    (firstWord.endsWith("a") && !MALE_EXCEPTIONS.has(firstWord));

  const gender = isFemale ? "women" : "men";
  // Modulo 90 para obtener una foto consistente entre 1 y 90
  const photoId = (hashString(cleanName) % 90) + 1;

  return `https://randomuser.me/api/portraits/med/${gender}/${photoId}.jpg`;
}
