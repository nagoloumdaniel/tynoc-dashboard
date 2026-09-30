const DAY_MS = 24 * 3_600_000;

/**
 * Uploaded files no product lists: the tab was closed between the upload
 * and the attach. Recent files are kept, as they may be attaching right now;
 * files of unknown age are kept too.
 */
export function orphanKeys(
  objects: readonly { key: string; lastModified?: Date }[],
  referenced: ReadonlySet<string>,
  now: Date,
  minAgeMs = DAY_MS,
): string[] {
  return objects
    .filter(
      ({ key, lastModified }) =>
        key.startsWith("products/") &&
        !referenced.has(key) &&
        lastModified !== undefined &&
        now.getTime() - lastModified.getTime() >= minAgeMs,
    )
    .map(({ key }) => key);
}
