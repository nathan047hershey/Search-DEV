/**
 * Greeting helpers shared by generate path and email composer UI.
 */

export function extractFirstName(
  name?: string | null,
  login?: string | null
): string | null {
  const raw = String(name || "").trim();
  if (!raw) return null;
  const loginNorm = String(login || "")
    .trim()
    .toLowerCase();
  if (loginNorm && raw.toLowerCase() === loginNorm) return null;

  const parts = raw.split(/\s+/).filter(Boolean);
  let first = parts[0] || "";
  if (/^(the|dr\.?|mr\.?|mrs\.?|ms\.?|miss)$/i.test(first) && parts[1]) {
    first = parts[1];
  }
  first = first.replace(/[^A-Za-zÀ-ÿ'-]/g, "");
  if (first.length < 2 || first.length > 24) return null;
  if (/\d/.test(first)) return null;
  if (loginNorm && first.toLowerCase() === loginNorm) return null;
  // All-lowercase long tokens are usually handles, not given names
  if (first === first.toLowerCase() && first.length > 14) return null;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function firstNameFromGreeting(
  raw?: string | null,
  login?: string | null
): string | null {
  const m = String(raw || "")
    .trim()
    .match(/^(?:hi|hello)\s*,?\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]{1,23})\s*,?\s*$/i);
  if (!m) return null;
  // Keep only capitalized name tokens from the greeting (rejects github handles)
  if (m[1][0] !== m[1][0].toUpperCase()) return null;
  return extractFirstName(m[1], login);
}

/**
 * Normalize greeting to "Hi," / "Hello," or "Hi, Jane," / "Hello, Jane,".
 * Never keeps GitHub usernames.
 */
export function normalizeGreeting(
  raw?: string | null,
  opts?: { firstName?: string | null; login?: string | null; name?: string | null }
): string {
  const login = opts?.login;
  const firstName =
    extractFirstName(opts?.firstName || opts?.name, login) ||
    firstNameFromGreeting(raw, login);
  const isHello = /^\s*hello\b/i.test(String(raw || "").trim());
  const base = isHello ? "Hello" : "Hi";
  if (firstName) return `${base}, ${firstName},`;
  return `${base},`;
}
