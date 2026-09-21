import { NextResponse } from "next/server";

/** Public registration is disabled. Accounts are provisioned by an administrator. */
export async function POST() {
  return NextResponse.json(
    { error: "Sign up is disabled. Contact an administrator for access." },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Sign up is disabled." },
    { status: 403 }
  );
}
