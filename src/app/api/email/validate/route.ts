import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateRecipientEmail } from "@/lib/email-validate";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await request.json();
    const result = await validateRecipientEmail(String(email || ""), {
      checkMx: true,
    });

    return NextResponse.json(result, {
      status: result.valid ? 200 : 400,
    });
  } catch (error) {
    console.error("Email validate error:", error);
    return NextResponse.json(
      { error: "Failed to validate email" },
      { status: 500 }
    );
  }
}
