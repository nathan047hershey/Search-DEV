import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import EmailSettings from "@/lib/models/email-settings";
import { connectToDatabase } from "@/lib/db";
import nodemailer from "nodemailer";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();

    const settings = await EmailSettings.findOne({ userId: session.user.email });

    if (!settings) {
      return NextResponse.json({ configured: false });
    }

    return NextResponse.json({
      configured: true,
      email: settings.email,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpSecure: settings.smtpSecure,
      isActive: settings.isActive,
    });
  } catch (error) {
    console.error("Error getting email settings:", error);
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { email, smtpHost, smtpPort, smtpSecure, smtpPassword } = await request.json();

    if (!email || !smtpHost || !smtpPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || 587,
      secure: smtpSecure || false,
      auth: {
        user: email,
        pass: smtpPassword,
      },
    });

    await new Promise<void>((resolve, reject) => {
      transporter.verify((error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });

    await EmailSettings.findOneAndUpdate(
      { userId: session.user.email },
      {
        userId: session.user.email,
        email,
        smtpHost,
        smtpPort: smtpPort || 587,
        smtpSecure: smtpSecure || false,
        smtpPassword,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: "Email settings saved and verified" });
  } catch (error) {
    console.error("Error saving email settings:", error);
    return NextResponse.json({
      error: "Failed to save settings",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectToDatabase();
    await EmailSettings.deleteOne({ userId: session.user.email });

    return NextResponse.json({ success: true, message: "Email settings removed" });
  } catch (error) {
    console.error("Error deleting email settings:", error);
    return NextResponse.json({ error: "Failed to delete settings" }, { status: 500 });
  }
}
