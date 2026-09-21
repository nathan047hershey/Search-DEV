import { NextRequest, NextResponse } from "next/server";
import { parseApiTokenList } from "@/lib/api-keys";

const ENV_TOKEN_KEY = "GITHUB_TOKEN";

function getEnvTokens(): string[] {
  return parseApiTokenList(process.env[ENV_TOKEN_KEY]);
}

export async function GET() {
  const tokens = getEnvTokens();

  return NextResponse.json({
    tokens,
    count: tokens.length,
    source: "environment variable",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, tokens: rawTokens } = body;

    if (action === "add" && typeof token === "string") {
      const normalized = token.trim();
      if (!normalized) {
        return NextResponse.json({ error: "Token is required" }, { status: 400 });
      }

      const existing = getEnvTokens();
      const next = Array.from(new Set([...existing, normalized]));
      process.env[ENV_TOKEN_KEY] = next.join(",");

      return NextResponse.json({ success: true, message: "Token added to runtime environment" });
    }

    if (action === "replace" && Array.isArray(rawTokens)) {
      const next = [...new Set(rawTokens.map((item: string) => item.trim()).filter(Boolean))];
      process.env[ENV_TOKEN_KEY] = next.join(",");
      return NextResponse.json({ success: true, tokens: next });
    }

    if (action === "remove" && typeof token === "string") {
      const existing = getEnvTokens();
      const next = existing.filter((item) => item !== token.trim());
      process.env[ENV_TOKEN_KEY] = next.join(",");
      return NextResponse.json({ success: true, tokens: next });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
