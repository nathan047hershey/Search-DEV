"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Mail, Check, AlertCircle, Loader2, Trash2, KeyRound } from "lucide-react";

const SMTP_PRESETS = [
  { name: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
  { name: "Outlook", host: "smtp-mail.outlook.com", port: 587, secure: false },
  { name: "Office 365", host: "smtp.office365.com", port: 587, secure: false },
  { name: "Yahoo", host: "smtp.mail.yahoo.com", port: 587, secure: false },
  { name: "Custom", host: "", port: 587, secure: false },
];

type EnvKeyStatus = {
  key: string;
  label: string;
  required: boolean;
  set: boolean;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Gmail");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [envKeys, setEnvKeys] = useState<EnvKeyStatus[]>([]);
  const [envRequiredMissing, setEnvRequiredMissing] = useState(0);
  const [envError, setEnvError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmailSettings();
    fetchEnvStatus();
  }, []);

  const fetchEnvStatus = async () => {
    try {
      const res = await fetch("/api/settings/env-status");
      const data = await res.json();
      if (!res.ok) {
        setEnvError(data.error || "Could not load env status");
        setEnvKeys([]);
        return;
      }
      setEnvError(null);
      setEnvKeys(data.keys || []);
      setEnvRequiredMissing(data.requiredMissing ?? 0);
    } catch {
      setEnvError("Could not load env status");
      setEnvKeys([]);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const res = await fetch("/api/email/settings");
      const data = await res.json();
      if (data.configured) {
        setIsConfigured(true);
        setEmail(data.email || "");
        setSmtpHost(data.smtpHost || "");
        setSmtpPort(data.smtpPort?.toString() || "587");
        setSmtpSecure(data.smtpSecure || false);
      }
    } catch (error) {
      console.error("Failed to fetch email settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    const selected = SMTP_PRESETS.find((p) => p.name === preset);
    if (selected && selected.name !== "Custom") {
      setSmtpHost(selected.host);
      setSmtpPort(selected.port.toString());
      setSmtpSecure(selected.secure);
    }
  };

  const handleSave = async () => {
    if (!email || !smtpHost || !smtpPassword) {
      setStatus({ type: "error", message: "Please fill in all required fields" });
      return;
    }

    setIsSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/email/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          smtpHost,
          smtpPort: parseInt(smtpPort),
          smtpSecure,
          smtpPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: "success", message: "Email settings saved and verified successfully!" });
        setIsConfigured(true);
        setSmtpPassword("");
      } else {
        setStatus({ type: "error", message: data.error || "Failed to save settings" });
      }
    } catch (error) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete your email settings?")) return;

    try {
      const res = await fetch("/api/email/settings", { method: "DELETE" });
      if (res.ok) {
        setIsConfigured(false);
        setEmail("");
        setSmtpHost("");
        setSmtpPort("587");
        setSmtpPassword("");
        setStatus({ type: "success", message: "Email settings deleted" });
      }
    } catch (error) {
      setStatus({ type: "error", message: "Failed to delete settings" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl space-y-6 px-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Local env status</h1>
          </div>
          <p className="mb-4 text-sm text-gray-600">
            Shows whether keys from <code className="rounded bg-gray-100 px-1">.env.local</code> are
            loaded — never the secret values themselves. Edit the file on disk and restart the
            server after changes.
          </p>
          {!session ? (
            <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
              Sign in to view env configuration status.
            </div>
          ) : envError ? (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">{envError}</div>
          ) : (
            <>
              {envRequiredMissing > 0 ? (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-amber-800">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>
                    {envRequiredMissing} required key{envRequiredMissing === 1 ? "" : "s"} missing
                    or empty
                  </span>
                </div>
              ) : envKeys.length > 0 ? (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700">
                  <Check className="h-5 w-5 shrink-0" />
                  <span>All required keys are set</span>
                </div>
              ) : null}
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {envKeys.map((item) => (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="truncate font-mono text-xs text-gray-500">{item.key}</div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.set
                          ? "bg-green-100 text-green-800"
                          : item.required
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.set ? "Set" : item.required ? "Missing" : "Optional"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          </div>

          {status && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {status.type === "success" ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              <span>{status.message}</span>
            </div>
          )}

          {!session ? (
            <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
              Please sign in to configure email settings.
            </div>
          ) : (
            <>
              {isConfigured && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700">
                  <Check className="h-5 w-5" />
                  <span>Email configured and ready to send</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email Service</label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  >
                    {SMTP_PRESETS.map((preset) => (
                      <option key={preset.name} value={preset.name}>{preset.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Your Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">SMTP Host *</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => {
                      setSmtpHost(e.target.value);
                      setSelectedPreset("Custom");
                    }}
                    placeholder="smtp.example.com"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Port</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      placeholder="587"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Secure (SSL/TLS)</label>
                    <label className="flex items-center gap-2 pt-7">
                      <input
                        type="checkbox"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-600">Enable SSL/TLS</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Password / App Password *</label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    placeholder={isConfigured ? "Leave empty to keep current" : "Enter your password"}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    For Gmail, use an App Password (16 characters). Generate at: myaccount.google.com/security → 2-Step Verification → App Passwords
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Testing & Saving...
                      </span>
                    ) : (
                      isConfigured ? "Update Settings" : "Save & Test Connection"
                    )}
                  </button>
                  {isConfigured && (
                    <button
                      onClick={handleDelete}
                      className="rounded-lg border border-red-300 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
