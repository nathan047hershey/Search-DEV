import { NextRequest, NextResponse } from "next/server";

// In-memory storage for tokens (in production, use a database)
let tokens: string[] = [];
let tokenStatuses: Map<string, { remaining: number; resetTime: number }> = new Map();

export async function GET() {
  // Initialize tokens from environment variable if not already loaded
  if (tokens.length === 0) {
    const envTokens = process.env.GITHUB_TOKEN || "";
    tokens = envTokens.split(",").map(t => t.trim()).filter(t => t.length > 0);
  }

  // Build statuses from tracked data
  const statuses = tokens.map(token => {
    const status = tokenStatuses.get(token);
    return {
      token,
      remaining: status?.remaining ?? 5000,
      resetTime: status?.resetTime ?? 0,
      isActive: (status?.remaining ?? 5000) > 0,
    };
  });

  return NextResponse.json({
    tokens,
    statuses,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token } = body;

    if (action === "add" && token) {
      // Add token to in-memory storage (for runtime use)
      if (!tokens.includes(token)) {
        tokens.push(token);
        tokenStatuses.set(token, { remaining: 5000, resetTime: 0 });
      }
      
      return NextResponse.json({ success: true, message: "Token added" });
    }

    if (action === "remove" && token) {
      // Remove token from in-memory storage
      tokens = tokens.filter(t => t !== token);
      tokenStatuses.delete(token);
      
      return NextResponse.json({ success: true, message: "Token removed" });
    }

    if (action === "updateStatus") {
      // Update token status (called by github.ts)
      const { token: t, remaining, resetTime } = body;
      if (t && tokens.includes(t)) {
        tokenStatuses.set(t, { remaining, resetTime });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
