"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { EmailComposer } from "@/components/email-composer";
import { Mail, User, Loader2, CheckCircle2 } from "lucide-react";

export default function SendMessagePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [developerLogin, setDeveloperLogin] = useState("");
  const [developerName, setDeveloperName] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [emailStatus, setEmailStatus] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/signin?callbackUrl=/messages");
    }
  }, [status, router]);

  const validatePrefillEmail = async (email: string) => {
    const value = email.trim();
    if (!value) {
      setEmailStatus(null);
      return false;
    }
    setValidating(true);
    try {
      const res = await fetch("/api/email/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json();
      if (data.valid) {
        setEmailStatus({
          valid: true,
          message: data.mxOk
            ? "Email validated · mail server found"
            : "Email validated",
        });
        return true;
      }
      setEmailStatus({
        valid: false,
        message: data.errors?.[0] || data.error || "Invalid email address",
      });
      return false;
    } catch {
      setEmailStatus({
        valid: false,
        message: "Could not validate email right now.",
      });
      return false;
    } finally {
      setValidating(false);
    }
  };

  const openComposer = async () => {
    if (emailHint.trim()) {
      const ok = await validatePrefillEmail(emailHint);
      if (!ok) return;
    }
    setOpen(true);
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const developer = {
    login: developerLogin.trim() || "candidate",
    name: developerName.trim() || null,
    email: emailHint.trim() || null,
    bio: null,
    company: null,
    location: null,
    blog: "",
    html_url: developerLogin.trim()
      ? `https://github.com/${developerLogin.trim()}`
      : null,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Send Message</h1>
          <p className="mt-1 text-sm text-gray-600">
            Recipient email is validated (format + mail server) before you can send.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <User className="h-4 w-4 text-blue-600" />
            Developer details (optional)
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                GitHub username
              </label>
              <input
                value={developerLogin}
                onChange={(e) => setDeveloperLogin(e.target.value)}
                placeholder="e.g. octocat"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                Display name
              </label>
              <input
                value={developerName}
                onChange={(e) => setDeveloperName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Recipient email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailHint}
                onChange={(e) => {
                  setEmailHint(e.target.value);
                  setEmailStatus(null);
                }}
                onBlur={() => {
                  if (emailHint.trim()) void validatePrefillEmail(emailHint);
                }}
                placeholder="name@company.com"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 ${
                  emailStatus && !emailStatus.valid
                    ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                    : emailStatus?.valid
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              <button
                type="button"
                onClick={() => void validatePrefillEmail(emailHint)}
                disabled={validating || !emailHint.trim()}
                className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {validating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Validate"
                )}
              </button>
            </div>
            {emailStatus && (
              <p
                className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                  emailStatus.valid ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {emailStatus.valid && <CheckCircle2 className="h-3.5 w-3.5" />}
                {emailStatus.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => void openComposer()}
            disabled={validating}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            <Mail className="h-4 w-4" />
            Open message composer
          </button>
        </div>
      </main>

      {open && (
        <EmailComposer
          isOpen={true}
          onClose={() => setOpen(false)}
          developer={developer}
        />
      )}
    </div>
  );
}
