// Fictitious customers for local development and screenshots.
const NAMES = [
  "Camille Martin",
  "Lucas Bernard",
  "Léa Dubois",
  "Hugo Thomas",
  "Chloé Robert",
  "Louis Richard",
  "Manon Petit",
  "Gabriel Durand",
  "Inès Leroy",
  "Arthur Moreau",
  "Jade Simon",
  "Nathan Laurent",
  "Louise Lefebvre",
  "Jules Michel",
  "Emma Garcia",
  "Raphaël David",
  "Alice Bertrand",
  "Adam Roux",
  "Lina Vincent",
  "Tom Fournier",
  "Zoé Morel",
  "Théo Girard",
  "Anna André",
  "Noah Lefèvre",
  "Rose Mercier",
  "Paul Dupont",
  "Sarah Lambert",
  "Maël Bonnet",
  "Juliette François",
  "Ethan Martinez",
];

export const DEMO_CUSTOMERS = NAMES.map((name, index) => ({
  name,
  email: `${name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(" ", ".")}@exemple.fr`,
  // A few suspended accounts so every status shows up.
  status: index % 11 === 10 ? ("SUSPENDED" as const) : ("ACTIVE" as const),
}));
