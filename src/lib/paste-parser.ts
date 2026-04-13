export function parsePastedNames(text: string): {
  names: string[];
  duplicates: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);

  const seen = new Set<string>();
  const names: string[] = [];
  const duplicates: string[] = [];

  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(line);
    } else {
      seen.add(key);
      names.push(line);
    }
  }

  return { names, duplicates };
}
