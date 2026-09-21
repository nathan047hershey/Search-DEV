export function parseApiTokenList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);
}

export function normalizeApiTokenInput(value: string): string {
  return value.trim();
}
