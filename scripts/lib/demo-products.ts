import type { ProductCreateInput } from "../../src/features/products/schemas";
import { slugify } from "../../src/lib/format";

type Demo = {
  name: string;
  category: string;
  price: number;
  sale?: number;
  stock: number;
  status?: "DRAFT" | "ACTIVE";
  archived?: boolean;
};

// Varied on purpose: every status and stock level appears in the list.
const DEMO: Demo[] = [
  {
    name: "Chaise en chêne massif",
    category: "mobilier",
    price: 12990,
    stock: 24,
  },
  {
    name: "Table basse en noyer",
    category: "mobilier",
    price: 34900,
    sale: 29900,
    stock: 6,
  },
  {
    name: "Fauteuil velours vert",
    category: "mobilier",
    price: 45900,
    stock: 3,
  },
  {
    name: "Bibliothèque modulable",
    category: "mobilier",
    price: 28900,
    stock: 0,
  },
  {
    name: "Tabouret de bar métal",
    category: "mobilier",
    price: 7990,
    stock: 42,
  },
  {
    name: "Console d'entrée",
    category: "mobilier",
    price: 19900,
    stock: 11,
    status: "DRAFT",
  },
  {
    name: "Banc en pin brut",
    category: "mobilier",
    price: 15900,
    stock: 8,
    archived: true,
  },
  {
    name: "Lampe de bureau articulée",
    category: "luminaires",
    price: 5990,
    stock: 35,
  },
  {
    name: "Suspension en rotin",
    category: "luminaires",
    price: 8990,
    sale: 6990,
    stock: 14,
  },
  {
    name: "Lampadaire arc laiton",
    category: "luminaires",
    price: 24900,
    stock: 2,
  },
  {
    name: "Applique murale opaline",
    category: "luminaires",
    price: 6490,
    stock: 0,
  },
  {
    name: "Guirlande lumineuse 10 m",
    category: "luminaires",
    price: 2490,
    stock: 120,
  },
  {
    name: "Lampe de chevet céramique",
    category: "luminaires",
    price: 4590,
    stock: 9,
    status: "DRAFT",
  },
  {
    name: "Vase en grès émaillé",
    category: "decoration",
    price: 3490,
    stock: 27,
  },
  {
    name: "Miroir rond doré 60 cm",
    category: "decoration",
    price: 11900,
    stock: 5,
  },
  {
    name: "Cadre photo chêne A4",
    category: "decoration",
    price: 1990,
    stock: 64,
  },
  {
    name: "Horloge murale silencieuse",
    category: "decoration",
    price: 3990,
    sale: 2990,
    stock: 18,
  },
  {
    name: "Bougie parfumée figue",
    category: "decoration",
    price: 1890,
    stock: 1,
  },
  {
    name: "Plateau marbre blanc",
    category: "decoration",
    price: 4290,
    stock: 0,
    archived: true,
  },
  {
    name: "Plaid en laine mérinos",
    category: "textile",
    price: 8990,
    stock: 16,
  },
  {
    name: "Housse de coussin lin",
    category: "textile",
    price: 2290,
    stock: 48,
  },
  {
    name: "Tapis berbère 160x230",
    category: "textile",
    price: 32900,
    stock: 4,
  },
  {
    name: "Rideaux occultants gris",
    category: "textile",
    price: 5490,
    sale: 4490,
    stock: 22,
  },
  {
    name: "Parure de lit percale",
    category: "textile",
    price: 11900,
    stock: 0,
  },
  {
    name: "Nappe en coton enduit",
    category: "textile",
    price: 3990,
    stock: 13,
    status: "DRAFT",
  },
  {
    name: "Service de table 18 pièces",
    category: "cuisine",
    price: 8990,
    stock: 7,
  },
  {
    name: "Cocotte en fonte 24 cm",
    category: "cuisine",
    price: 12900,
    stock: 12,
  },
  {
    name: "Planche à découper acacia",
    category: "cuisine",
    price: 2990,
    stock: 31,
  },
  {
    name: "Carafe en verre soufflé",
    category: "cuisine",
    price: 2490,
    stock: 2,
  },
  {
    name: "Set de couteaux japonais",
    category: "cuisine",
    price: 18900,
    sale: 15900,
    stock: 5,
  },
  {
    name: "Moulin à poivre en hêtre",
    category: "cuisine",
    price: 2790,
    stock: 0,
  },
  {
    name: "Théière en fonte",
    category: "cuisine",
    price: 4990,
    stock: 10,
    archived: true,
  },
  {
    name: "Panier en jonc de mer",
    category: "rangement",
    price: 2990,
    stock: 38,
  },
  {
    name: "Boîtes de rangement x3",
    category: "rangement",
    price: 3490,
    stock: 26,
  },
  {
    name: "Étagère murale flottante",
    category: "rangement",
    price: 4990,
    stock: 4,
  },
  { name: "Portemanteau mural", category: "rangement", price: 3990, stock: 15 },
  { name: "Commode 4 tiroirs", category: "rangement", price: 39900, stock: 0 },
  {
    name: "Malle en bois vintage",
    category: "rangement",
    price: 14900,
    stock: 3,
    status: "DRAFT",
  },
  {
    name: "Range-bouteilles 12 places",
    category: "rangement",
    price: 3290,
    stock: 20,
  },
  {
    name: "Organiseur de tiroir bambou",
    category: "rangement",
    price: 1590,
    stock: 57,
  },
];

export const DEMO_PRODUCTS = DEMO.map((demo, index) => {
  const input: ProductCreateInput = {
    name: demo.name,
    slug: slugify(demo.name),
    sku: `DEMO-${String(index + 1).padStart(3, "0")}`,
    description: undefined,
    categoryId: `cat_${demo.category}`,
    priceInCents: demo.price,
    salePriceInCents: demo.sale,
    stock: demo.stock,
    lowStockThreshold: 5,
    status: demo.status ?? "ACTIVE",
  };
  return { input, archived: demo.archived ?? false };
});
