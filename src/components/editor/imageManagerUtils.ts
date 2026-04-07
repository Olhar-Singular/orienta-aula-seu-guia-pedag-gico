export type ImageAlign = "left" | "center" | "right";

export type ImageItem = {
  id: string;
  src: string;
  align: ImageAlign;
};

export type ImageRegistry = Record<string, string>;

/**
 * Find the next available image name like "imagem-1", "imagem-2", etc.
 */
export function nextImageName(registry: ImageRegistry): string {
  let n = 1;
  while (registry[`imagem-${n}`]) n++;
  return `imagem-${n}`;
}

/**
 * Register images and return DSL lines with short names.
 * Mutates the registry by adding new entries.
 */
export function registerAndGenerateDsl(
  images: ImageItem[],
  registry: ImageRegistry
): { dsl: string; updatedRegistry: ImageRegistry } {
  const updated = { ...registry };
  const lines: string[] = [];

  for (const img of images) {
    const name = nextImageName(updated);
    updated[name] = img.src;
    const parts = [`[img:${name}`];
    if (img.align !== "left") parts.push(`align=${img.align}`);
    parts[parts.length - 1] += "]";
    lines.push(parts.join(" "));
  }

  return { dsl: lines.join("\n"), updatedRegistry: updated };
}

/**
 * Resolve an image reference: if it's in the registry return the real src,
 * otherwise return the original string (it may be a URL already).
 */
export function resolveImageSrc(
  ref: string,
  registry: ImageRegistry
): string {
  return registry[ref] || ref;
}

/**
 * Scan DSL text for [img:URL] patterns where URL is a raw http/data URL.
 * Registers each in the registry with a short name and returns cleaned text.
 * Returns null if no URLs were found (text is already clean).
 */
export function scanAndRegisterUrls(
  text: string,
  registry: ImageRegistry
): { cleanText: string; updatedRegistry: ImageRegistry } | null {
  // Match [img: followed by http or data: URL, then optional params, then ]
  const pattern = /\[img:((?:https?:\/\/|data:)[^\s\]]+)((?:\s[^\]]*)?)\]/g;
  if (!pattern.test(text)) return null;

  pattern.lastIndex = 0;
  const updated = { ...registry };
  let cleanText = text;
  let match: RegExpExecArray | null;

  // Collect all matches first to avoid index shifting during replacement
  const matches: { full: string; url: string; params: string }[] = [];
  while ((match = pattern.exec(text)) !== null) {
    matches.push({ full: match[0], url: match[1], params: match[2] || "" });
  }

  for (const m of matches) {
    // Check if this URL is already registered
    const existingName = Object.entries(updated).find(([, src]) => src === m.url)?.[0];
    const name = existingName || nextImageName(updated);
    if (!existingName) updated[name] = m.url;
    cleanText = cleanText.replace(m.full, `[img:${name}${m.params}]`);
  }

  return { cleanText, updatedRegistry: updated };
}
