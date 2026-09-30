// Pure rules for product images, shared by the browser and the server.

export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 8;
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(",");

export const isImageType = (type: string): type is ImageType =>
  type in IMAGE_TYPES;

/** Checked in the browser for a quick message; S3 enforces it again. */
export function validateImageFile(file: {
  type: string;
  size: number;
}): string | null {
  if (!isImageType(file.type)) return "Format non accepté : JPEG, PNG ou WebP.";
  if (file.size === 0) return "Le fichier est vide.";
  if (file.size > MAX_IMAGE_BYTES) return "Image trop lourde : 5 Mo maximum.";
  return null;
}

export function imageKey(
  productId: string,
  uuid: string,
  type: ImageType,
): string {
  return `products/${productId}/${uuid}.${IMAGE_TYPES[type]}`;
}

const KEY_PATTERN =
  /^products\/([^/]+)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** A key the server itself issued for this product (no path tricks). */
export function isProductImageKey(productId: string, key: string): boolean {
  return KEY_PATTERN.exec(key)?.[1] === productId;
}

export const imageUrl = (publicBaseUrl: string, key: string) =>
  `${publicBaseUrl}/${key}`;

export function moveImage(
  keys: readonly string[],
  key: string,
  step: -1 | 1,
): string[] {
  const from = keys.indexOf(key);
  const to = from + step;
  if (from === -1 || to < 0 || to >= keys.length) return [...keys];
  const next = [...keys];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

/** The first image is the main one (lists, carts, shop). */
export function makeMain(keys: readonly string[], key: string): string[] {
  return keys.includes(key)
    ? [key, ...keys.filter((k) => k !== key)]
    : [...keys];
}
