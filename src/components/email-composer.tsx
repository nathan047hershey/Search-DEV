"use client";

import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface EmailComposerProps {
  favoriteId?: number;
  isOpen: boolean;
  onClose: () => void;
  developer: any;
}

export function EmailComposer({ isOpen, onClose, developer, favoriteId }: EmailComposerProps) {
  const [to, setTo] = useState(developer.email);
  const [subject, setSubject] = useState(`Connection from GitHub - ${developer.login}`);
  const [body, setBody] = useState(`Hi ${developer.name || developer.login},

I came across your GitHub profile and was impressed by your work. I would love to connect and discuss potential opportunities.

Looking forward to hearing from you!

Best regards`);
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          body,
          favoriteId,
        }),
      });

      const data = await response.json();
      const result = data;
      if (response.ok) {
        setStatus({ type: "success", message: "Email sent successfully!" });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (response.status === 409) {
        // Duplicate email — not really an error
        setStatus({ type: "success", message: result.message || "Email already sent to this recipient." });
      } else {
        setStatus({ type: "error", message: data.error || result.error || "Failed to send email" });
      }
    } catch (error) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Compose Email</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {status && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                status.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {status.message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to || !subject || !body}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
