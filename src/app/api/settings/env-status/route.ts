import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/** Known env keys — status only, never values. */
const ENV_KEYS = [
  { key: "GITHUB_TOKEN", label: "GitHub token", required: true },
  { key: "NEXTAUTH_URL", label: "NextAuth URL", required: true },
  { key: "NEXTAUTH_SECRET", label: "NextAuth secret", required: true },
  { key: "RESEND_API_KEY", label: "Resend API key", required: true },
  { key: "RESEND_FROM", label: "Resend from address", required: false },
  { key: "RESEND_REPLY_TO", label: "Resend reply-to", required: false },
  { key: "MINIMAX_API_KEY", label: "Minimax API key", required: true },
  { key: "MINIMAX_MODEL", label: "Minimax model", required: false },
  { key: "MINIMAX_BASE_URL", label: "Minimax base URL", required: false },
  { key: "GITHUB_ID", label: "GitHub OAuth client ID", required: false },
  { key: "GITHUB_SECRET", label: "GitHub OAuth secret", required: false },
  { key: "HUNTER_API_KEY", label: "Hunter API key", required: false },
  { key: "SQLITE_DB_PATH", label: "SQLite DB path", required: false },
  { key: "EMAIL_SEND_GAP_MINUTES", label: "Email send gap (minutes)", required: false },
] as const;

function isSet(value: string | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Treat common placeholders as unset
  if (/^your_|^replace_with_/i.test(trimmed)) return false;
  return true;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = ENV_KEYS.map(({ key, label, required }) => ({
    key,
    label,
    required,
    set: isSet(process.env[key]),
  }));

  const requiredMissing = keys.filter((k) => k.required && !k.set).length;

  return NextResponse.json({
    source: ".env.local (loaded into process.env)",
    note: "Values are never returned — only whether each key is set.",
    requiredMissing,
    keys,
  });
}
