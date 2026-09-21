"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Send, Loader2, Sparkles, RefreshCw, Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { extractFirstName, normalizeGreeting } from "@/lib/greeting";

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  subject: string;
}

interface TrackOption {
  id: string;
  label: string;
}

interface StyleOption {
  id: string;
  label: string;
  description: string;
}

interface EmailValidationState {
  valid: boolean;
  formatOk: boolean;
  mxOk: boolean | null;
  suggestion: string | null;
  errors: string[];
  warnings: string[];
  roleAddress?: boolean;
}

interface SendCooldownState {
  allowed: boolean;
  gapMinutes: number;
  retryAfterSeconds: number | null;
  message: string | null;
  presets: number[];
  recommendedMinutes: number;
}

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  developer: any;
  onSent?: (info: { login?: string | null; email: string }) => void;
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function isValidEmailFormat(value: string): boolean {
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    value.trim()
  );
}

export function EmailComposer({
  isOpen,
  onClose,
  developer,
  onSent,
}: EmailComposerProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [greeting, setGreeting] = useState("Hi,");
  const [opening, setOpening] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [matchNotes, setMatchNotes] = useState<string | null>(null);
  const [generatedBy, setGeneratedBy] = useState<"minimax" | "template" | null>(
    null
  );
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [track, setTrack] = useState<string>("");
  const [style, setStyle] = useState<string>("short");
  const [templateId, setTemplateId] = useState<string>("auto");
  const [roleTitle, setRoleTitle] = useState<string | undefined>();
  const [roleBlurb, setRoleBlurb] = useState<string | undefined>();
  const [responsibilitiesHtml, setResponsibilitiesHtml] = useState<string | undefined>();
  const [techStackHtml, setTechStackHtml] = useState<string | undefined>();
  const [lookingForHtml, setLookingForHtml] = useState<string | undefined>();
  const [offerHtml, setOfferHtml] = useState<string | undefined>();
  const [whyUs, setWhyUs] = useState<string | undefined>();
  const [closingLine, setClosingLine] = useState<string | undefined>();
  const [processNote, setProcessNote] = useState<string | undefined>();
  const [companyNote, setCompanyNote] = useState<string | undefined>();
  const [trackLabel, setTrackLabel] = useState<string | undefined>();
  const [styleLabel, setStyleLabel] = useState<string | undefined>();
  const [layoutId, setLayoutId] = useState<string | undefined>();
  const [layoutLabelText, setLayoutLabelText] = useState<string | undefined>();
  const [quality, setQuality] = useState<{
    score: number;
    label: string;
    issues: Array<{ level: string; message: string }>;
    strengths: string[];
  } | null>(null);
  const [priorSendAt, setPriorSendAt] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailCheck, setEmailCheck] = useState<EmailValidationState | null>(null);
  const [cooldown, setCooldown] = useState<SendCooldownState | null>(null);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const emailInputRef = useRef<HTMLInputElement>(null);
  const validateSeq = useRef(0);
  /** Absolute time when send is allowed again — survives background tab throttling */
  const waitUntilRef = useRef<number>(0);

  const greetingFirstName = useMemo(
    () => extractFirstName(developer.name, developer.login),
    [developer.name, developer.login]
  );
  const greetingOptions = useMemo(() => {
    if (greetingFirstName) {
      return [
        `Hi, ${greetingFirstName},`,
        `Hello, ${greetingFirstName},`,
        "Hi,",
        "Hello,",
      ];
    }
    return ["Hi,", "Hello,"];
  }, [greetingFirstName]);

  const applyWaitSeconds = (seconds: number) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    waitUntilRef.current = s > 0 ? Date.now() + s * 1000 : 0;
    setWaitSeconds(s);
  };

  const syncWaitFromDeadline = () => {
    const until = waitUntilRef.current;
    if (!until) {
      setWaitSeconds(0);
      return 0;
    }
    const next = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    setWaitSeconds(next);
    if (next === 0) {
      waitUntilRef.current = 0;
      setCooldown((c) =>
        c ? { ...c, allowed: true, retryAfterSeconds: null, message: null } : c
      );
    }
    return next;
  };

  const refreshCooldown = async () => {
    try {
      const res = await fetch("/api/email/quota");
      const data = await res.json();
      if (res.ok) {
        setCooldown({
          allowed: !!data.allowed,
          gapMinutes: data.gapMinutes || 10,
          retryAfterSeconds: data.retryAfterSeconds ?? null,
          message: data.message || null,
          presets: data.presets || [3, 5, 8, 10, 15, 20, 30],
          recommendedMinutes: data.recommendedMinutes || 10,
        });
        applyWaitSeconds(data.retryAfterSeconds || 0);
      }
    } catch {
      // ignore
    }
  };

  const saveGapMinutes = async (minutes: number) => {
    try {
      const res = await fetch("/api/email/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gapMinutes: minutes }),
      });
      const data = await res.json();
      if (res.ok) {
        setCooldown({
          allowed: !!data.allowed,
          gapMinutes: data.gapMinutes || minutes,
          retryAfterSeconds: data.retryAfterSeconds ?? null,
          message: data.message || null,
          presets: data.presets || [3, 5, 8, 10, 15, 20, 30],
          recommendedMinutes: data.recommendedMinutes || 10,
        });
        applyWaitSeconds(data.retryAfterSeconds || 0);
      }
    } catch {
      // ignore
    }
  };

  const applyGenerated = (data: any) => {
    setSubject(data.subject || "");
    setGreeting(
      normalizeGreeting(data.greeting || "Hi,", {
        name: developer.name,
        login: developer.login,
      })
    );
    setOpening(data.opening || "");
    setBodyHtml(data.body || "");
    setMatchNotes(data.matchNotes || null);
    setGeneratedBy(data.generatedBy === "minimax" ? "minimax" : "template");
    setAiModel(data.aiModel || null);
    if (data.track) setTrack(data.track);
    if (data.style) setStyle(data.style);
    if (data.templateId) setTemplateId(data.templateId);
    setRoleTitle(data.roleTitle);
    setRoleBlurb(data.roleBlurb);
    setResponsibilitiesHtml(data.responsibilitiesHtml);
    setTechStackHtml(data.techStackHtml);
    setLookingForHtml(data.lookingForHtml);
    setOfferHtml(data.offerHtml);
    setWhyUs(data.whyUs);
    setClosingLine(data.closingLine);
    setProcessNote(data.processNote);
    setCompanyNote(data.companyNote);
    setTrackLabel(data.trackLabel);
    setStyleLabel(data.styleLabel);
    setLayoutId(data.layoutId);
    setLayoutLabelText(data.layoutLabel);
    setQuality(data.quality || null);
    setPriorSendAt(data.priorSendAt || null);
  };

  const validateEmail = async (value: string) => {
    const email = value.trim();
    const seq = ++validateSeq.current;

    if (!email) {
      setEmailCheck(null);
      return null;
    }

    if (!isValidEmailFormat(email)) {
      const result: EmailValidationState = {
        valid: false,
        formatOk: false,
        mxOk: null,
        suggestion: null,
        errors: ["That does not look like a valid email address."],
        warnings: [],
      };
      setEmailCheck(result);
      return result;
    }

    setIsValidatingEmail(true);
    try {
      const response = await fetch("/api/email/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (seq !== validateSeq.current) return null;

      const result: EmailValidationState = {
        valid: !!data.valid,
        formatOk: !!data.formatOk,
        mxOk: data.mxOk ?? null,
        suggestion: data.suggestion || null,
        errors: data.errors || (data.valid ? [] : [data.error || "Invalid email"]),
        warnings: data.warnings || [],
        roleAddress: !!data.roleAddress,
      };
      setEmailCheck(result);
      return result;
    } catch {
      if (seq !== validateSeq.current) return null;
      const result: EmailValidationState = {
        valid: false,
        formatOk: true,
        mxOk: null,
        suggestion: null,
        errors: ["Could not validate email right now. Try again."],
        warnings: [],
      };
      setEmailCheck(result);
      return result;
    } finally {
      if (seq === validateSeq.current) setIsValidatingEmail(false);
    }
  };

  /** Validate recipient first; only then call Minimax / template generation. */
  const generateMessage = async (overrides?: {
    templateId?: string;
    track?: string;
    style?: string;
    autoTrack?: boolean;
    /** Skip re-validation when caller just validated successfully */
    emailAlreadyValid?: boolean;
  }) => {
    setStatus(null);

    if (!overrides?.emailAlreadyValid) {
      const email = to.trim() || developer?.email || "";
      if (!email) {
        setStatus({
          type: "error",
          message: "Enter and validate a recipient email before generating a message.",
        });
        emailInputRef.current?.focus();
        return;
      }

      const check = await validateEmail(email);
      if (!check?.valid) {
        setStatus({
          type: "error",
          message:
            check?.errors?.[0] ||
            "Email validation failed. Fix the address, then generate again.",
        });
        emailInputRef.current?.focus();
        return;
      }
    }

    setIsGenerating(true);
    setStatus(null);
    try {
      const chosenTrack = overrides?.autoTrack
        ? undefined
        : overrides?.track ?? (track || undefined);
      const response = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...developer,
          templateId: overrides?.templateId ?? templateId,
          style: overrides?.style ?? style,
          ...(chosenTrack ? { track: chosenTrack } : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus({
          type: "error",
          message: data.error || "Failed to generate personalized message",
        });
        return;
      }

      applyGenerated(data);
      setStatus(null);
    } catch {
      setStatus({ type: "error", message: "Network error while generating message." });
    } finally {
      setIsGenerating(false);
    }
  };

  const validateThenGenerate = async (emailValue?: string) => {
    const email = (emailValue ?? to).trim();
    if (!email) {
      setStatus({
        type: "error",
        message: "Enter a recipient email to validate.",
      });
      return;
    }
    const check = await validateEmail(email);
    if (!check?.valid) {
      setStatus({
        type: "error",
        message: check?.errors?.[0] || "Email validation failed.",
      });
      return;
    }
    await generateMessage({
      templateId: templateId || "auto",
      style: style || "professional",
      autoTrack: !track,
      emailAlreadyValid: true,
    });
  };

  const rebuildPreview = async (
    nextGreeting: string,
    nextOpening: string,
    nextSubject: string,
    nextTemplateId = templateId,
    nextTrack = track,
    nextStyle = style
  ) => {
    if (!nextGreeting.trim() || !nextOpening.trim()) return;
    setIsRebuilding(true);
    try {
      const response = await fetch("/api/email/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rebuild: true,
          greeting: nextGreeting,
          opening: nextOpening,
          subject: nextSubject,
          templateId: nextTemplateId,
          track: nextTrack,
          style: nextStyle,
          roleTitle,
          roleBlurb,
          responsibilitiesHtml,
          techStackHtml,
          lookingForHtml,
          offerHtml,
          whyUs,
          closingLine,
          processNote,
          companyNote,
          trackLabel,
          styleLabel,
          matchNotes,
          layoutId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setBodyHtml(data.body || "");
        if (data.templateId) setTemplateId(data.templateId);
        if (data.trackLabel) setTrackLabel(data.trackLabel);
        if (data.styleLabel) setStyleLabel(data.styleLabel);
      }
    } catch {
      // keep current preview
    } finally {
      setIsRebuilding(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const boot = async () => {
      setTo(developer?.email || "");
      setSubject("");
      setGreeting("Hi,");
      setOpening("");
      setBodyHtml("");
      setMatchNotes(null);
      setGeneratedBy(null);
      setAiModel(null);
      setTrack("");
      setStyle("short");
      let bootStyle = "short";
      setTemplateId("auto");
      setQuality(null);
      setPriorSendAt(null);
      setEmailCheck(null);
      setStatus(null);
      void refreshCooldown();

      try {
        const contactedRes = await fetch("/api/messages/contacted");
        const contacted = await contactedRes.json();
        if (
          !cancelled &&
          contactedRes.ok &&
          Array.isArray(contacted.logins) &&
          developer?.login &&
          contacted.logins.includes(String(developer.login).toLowerCase())
        ) {
          bootStyle =
            (contacted.nextStyles &&
              contacted.nextStyles[String(developer.login).toLowerCase()]) ||
            "followup";
          setStyle(bootStyle);
        }
      } catch {
        // keep short default
      }

      try {
        const res = await fetch("/api/email/templates");
        const data = await res.json();
        if (!cancelled && res.ok) {
          setTemplates(data.templates || []);
          setTracks(data.tracks || []);
          setStyles(data.styles || []);
          if (data.templates?.length) {
            const preferred =
              data.templates.find((t: TemplateOption) => t.id === "auto") ||
              data.templates.find((t: TemplateOption) => t.id === "outlook-safe") ||
              data.templates[0];
            if (preferred?.id) setTemplateId(preferred.id);
          }
        }
      } catch {
        // defaults remain
      }

      if (cancelled) return;

      // 1) Validate email first  2) Only then generate message
      const email = (developer?.email || "").trim();
      if (!email) {
        setStatus({
          type: "error",
          message: "No email on this profile. Enter an address, validate it, then generate.",
        });
      } else {
        const check = await validateEmail(email);
        if (cancelled) return;
        if (check?.valid) {
          await generateMessage({
            templateId: "auto",
            style: bootStyle,
            autoTrack: true,
            emailAlreadyValid: true,
          });
        } else {
          setStatus({
            type: "error",
            message:
              check?.errors?.[0] ||
              "Email validation failed. Fix the address before generating a message.",
          });
        }
      }

      setTimeout(() => emailInputRef.current?.focus(), 50);
    };

    void boot();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, developer?.login]);

  // Real-time cooldown: use a deadline (not tick-1/sec). Background tabs throttle
  // setInterval, which made the wait appear frozen while you browsed other sites.
  useEffect(() => {
    if (!isOpen) return;

    const tick = () => {
      syncWaitFromDeadline();
    };

    tick();
    const id = window.setInterval(tick, 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshCooldown();
        syncWaitFromDeadline();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    const recipient = to.trim();
    const check = emailCheck?.valid
      ? emailCheck
      : await validateEmail(recipient);

    if (!check?.valid) {
      setStatus({
        type: "error",
        message: check?.errors?.[0] || "Enter a valid recipient email address.",
      });
      emailInputRef.current?.focus();
      return;
    }

    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject,
          body: bodyHtml,
          developerName: developer.name || developer.login,
          developerLogin: developer.login || null,
          style: style || null,
          opening: opening || null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message: `Message sent to ${recipient}.`,
        });
        onSent?.({
          login: developer?.login || null,
          email: recipient,
        });
        if (data.cooldown) {
          setCooldown({
            allowed: !!data.cooldown.allowed,
            gapMinutes: data.cooldown.gapMinutes || cooldown?.gapMinutes || 10,
            retryAfterSeconds: data.cooldown.retryAfterSeconds ?? null,
            message: data.cooldown.message || null,
            presets: data.cooldown.presets || cooldown?.presets || [3, 5, 8, 10, 15],
            recommendedMinutes: data.cooldown.recommendedMinutes || 10,
          });
          applyWaitSeconds(data.cooldown.retryAfterSeconds || 0);
        } else {
          void refreshCooldown();
        }
        setTimeout(() => onClose(), 1200);
      } else {
        setStatus({
          type: "error",
          message:
            data.validation?.errors?.[0] ||
            data.cooldown?.message ||
            data.error ||
            "Failed to send message",
        });
        if (data.cooldown?.retryAfterSeconds) {
          applyWaitSeconds(data.cooldown.retryAfterSeconds);
          setCooldown((c) =>
            c
              ? {
                  ...c,
                  allowed: false,
                  retryAfterSeconds: data.cooldown.retryAfterSeconds,
                  message: data.cooldown.message || c.message,
                }
              : c
          );
        }
      }
    } catch {
      setStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  const canSend =
    !!emailCheck?.valid &&
    !!subject.trim() &&
    !!bodyHtml &&
    !isGenerating &&
    !isSending &&
    !isValidatingEmail &&
    waitSeconds <= 0 &&
    (cooldown?.allowed !== false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Send Message</h2>
            <p className="text-xs text-gray-500">
              Hire message for @{developer.login}
              {developer?.name ? ` · ${developer.name}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-2">
          <div className="space-y-4 overflow-y-auto border-r p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                  <Mail className="h-4 w-4" />
                  Recipient email <span className="font-normal text-amber-800">(required · validated)</span>
                </label>
                <button
                  type="button"
                  onClick={() => void validateThenGenerate(to)}
                  disabled={isValidatingEmail || isGenerating || !to.trim()}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  {isValidatingEmail || isGenerating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isValidatingEmail ? "Validating…" : "Generating…"}
                    </>
                  ) : (
                    "Validate & generate"
                  )}
                </button>
              </div>
              <input
                ref={emailInputRef}
                type="email"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setEmailCheck(null);
                }}
                onBlur={() => {
                  if (to.trim() && !emailCheck?.valid) void validateEmail(to);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void validateThenGenerate(to);
                  }
                }}
                placeholder="name@company.com"
                autoComplete="email"
                required
                className={`w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:ring-2 ${
                  emailCheck && !emailCheck.valid
                    ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                    : emailCheck?.valid
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200"
                      : "border-amber-300 focus:border-amber-500 focus:ring-amber-200"
                }`}
              />
              <div className="mt-2 space-y-1 text-xs">
                {isValidatingEmail && (
                  <p className="inline-flex items-center gap-1 text-amber-900">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Checking format, disposable domains, and mail server (MX)…
                  </p>
                )}
                {!isValidatingEmail && emailCheck?.valid && (
                  <p className="inline-flex items-center gap-1 font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Email validated
                    {emailCheck.mxOk ? " · MX OK" : ""}
                    {isGenerating ? " — generating message…" : bodyHtml ? " — message ready" : ""}
                  </p>
                )}
                {!isValidatingEmail &&
                  emailCheck?.errors?.map((err) => (
                    <p key={err} className="font-medium text-red-700">
                      {err}
                    </p>
                  ))}
                {!isValidatingEmail && emailCheck?.suggestion && (
                  <button
                    type="button"
                    className="font-medium text-blue-800 underline"
                    onClick={() => {
                      setTo(emailCheck.suggestion!);
                      void validateThenGenerate(emailCheck.suggestion!);
                    }}
                  >
                    Use suggested address: {emailCheck.suggestion}
                  </button>
                )}
                {!isValidatingEmail &&
                  emailCheck?.warnings?.map((warn) => (
                    <p
                      key={warn}
                      className="inline-flex items-start gap-1 text-amber-800"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                      <span>{warn}</span>
                    </p>
                  ))}
                {!emailCheck && !isValidatingEmail && (
                  <p className="text-amber-900">
                    Enter an email and click <strong>Validate email</strong> (or press Enter).
                    Send stays disabled until validation passes.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-1 block text-sm font-semibold text-slate-900">
                Send gap (safe spacing)
              </label>
              <p className="mb-2 text-xs text-slate-600">
                Wait this long between messages so the sending account is less likely to get
                blocked. Recommended: {cooldown?.recommendedMinutes || 10} minutes.
              </p>
              <select
                value={String(cooldown?.gapMinutes || 10)}
                onChange={(e) => void saveGapMinutes(parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                {(cooldown?.presets || [3, 5, 8, 10, 15, 20, 30]).map((m) => (
                  <option key={m} value={m}>
                    Every {m} minutes
                    {m === (cooldown?.recommendedMinutes || 10) ? " (recommended)" : ""}
                  </option>
                ))}
              </select>
              {waitSeconds > 0 ? (
                <p className="mt-2 text-xs font-medium text-amber-800">
                  Next send available in {formatWait(waitSeconds)}
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-emerald-700">
                  Ready to send · gap {cooldown?.gapMinutes || 10} min
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Template
                </label>
                <select
                  value={templateId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTemplateId(next);
                    if (greeting.trim() && opening.trim()) {
                      void rebuildPreview(greeting, opening, subject, next, track, style);
                    } else {
                      void generateMessage({ templateId: next });
                    }
                  }}
                  disabled={isGenerating}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                >
                  {(templates.length
                    ? templates
                    : [{ id: "outlook-safe", name: "Plain Outlook", description: "", subject: "" }]
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Role track
                </label>
                <select
                  value={track || "fullstack"}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTrack(next);
                    void generateMessage({ track: next });
                  }}
                  disabled={isGenerating}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                >
                  {(tracks.length
                    ? tracks
                    : [
                        { id: "frontend", label: "Frontend" },
                        { id: "backend", label: "Backend" },
                        { id: "fullstack", label: "Full-stack" },
                        { id: "mobile", label: "Mobile" },
                        { id: "data", label: "Data / ML" },
                        { id: "devops", label: "DevOps / Cloud" },
                      ]
                  ).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Message tone
                </label>
                <select
                  value={style}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStyle(next);
                    void generateMessage({ style: next });
                  }}
                  disabled={isGenerating}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                >
                  {(() => {
                    const list = styles.length
                      ? styles
                      : [
                          { id: "short", label: "Short first-touch", description: "" },
                          { id: "professional", label: "Professional", description: "" },
                          { id: "warm", label: "Warm", description: "" },
                          { id: "concise", label: "Concise", description: "" },
                          { id: "followup", label: "Follow-up (bump)", description: "" },
                          { id: "followup-value", label: "Follow-up (value)", description: "" },
                          { id: "followup-close", label: "Follow-up (close)", description: "" },
                        ];
                    const firstTouch = list.filter(
                      (s) => !String(s.id).startsWith("followup")
                    );
                    const followUps = list.filter((s) =>
                      String(s.id).startsWith("followup")
                    );
                    return (
                      <>
                        <optgroup label="First-touch">
                          {firstTouch.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </optgroup>
                        {followUps.length > 0 && (
                          <optgroup label="Follow-up">
                            {followUps.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
              </div>
            </div>

            {priorSendAt && (
              <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
                Previously contacted{" "}
                {new Date(priorSendAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
                . Prefer a Follow-up tone for the next note.
              </div>
            )}

            {quality && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  quality.label === "Strong"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : quality.label === "OK"
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-rose-200 bg-rose-50 text-rose-950"
                }`}
              >
                <div className="font-medium">
                  Message quality: {quality.score}/100 · {quality.label}
                </div>
                {quality.strengths.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs opacity-90">
                    {quality.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                )}
                {quality.issues.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-xs opacity-90">
                    {quality.issues.map((i) => (
                      <li key={i.message}>
                        {i.level === "warn" ? "Fix: " : "Note: "}
                        {i.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {templates.find((t) => t.id === templateId)?.description && (
              <p className="text-xs text-gray-500">
                {templates.find((t) => t.id === templateId)?.description}
              </p>
            )}

            {matchNotes && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                  generatedBy === "minimax"
                    ? "bg-emerald-50 text-emerald-900"
                    : "bg-amber-50 text-amber-900"
                }`}
              >
                <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  <strong>
                    {generatedBy === "minimax" ? "AI personalized" : "Template"}
                    {trackLabel ? ` · ${trackLabel}` : ""}
                    {styleLabel ? ` · ${styleLabel}` : ""}
                    {layoutLabelText ? ` · ${layoutLabelText}` : ""}:
                  </strong>{" "}
                  {matchNotes}
                </span>
              </div>
            )}

            {generatedBy && (
              <p className="text-xs text-gray-500">
                {generatedBy === "minimax"
                  ? `API wrote message content only; filled into HTML template${templateId === "auto" ? " (auto-picked)" : ""}${aiModel ? ` · ${aiModel}` : ""}.`
                  : "Using static pack content — Minimax empty/failed. Check MINIMAX_API_KEY and regenerate."}
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isGenerating}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Greeting</label>
                <button
                  type="button"
                  onClick={() => void generateMessage()}
                  disabled={isGenerating || isValidatingEmail}
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900 disabled:opacity-50"
                >
                  {isGenerating || isValidatingEmail ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isValidatingEmail ? "Validating…" : "Generating…"}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Validate & regenerate
                    </>
                  )}
                </button>
              </div>
              <select
                value={
                  greetingOptions.includes(greeting)
                    ? greeting
                    : greetingOptions[0]
                }
                onChange={(e) => {
                  const next = e.target.value;
                  setGreeting(next);
                  void rebuildPreview(next, opening, subject);
                }}
                disabled={isGenerating}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              >
                {greetingOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Prefer first name when the profile has a real name; never a
                GitHub username.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Opening (personalized)
              </label>
              <textarea
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                onBlur={() => void rebuildPreview(greeting, opening, subject)}
                rows={5}
                disabled={isGenerating}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
              />
              <p className="mt-1 text-xs text-gray-500">
                Full role details (responsibilities, stack, requirements, offer) follow your
                chosen template below.
              </p>
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

          <div className="flex flex-col bg-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Styled preview
              </p>
              {(isGenerating || isRebuilding) && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </span>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              {bodyHtml ? (
                <iframe
                  title="Email preview"
                  srcDoc={bodyHtml}
                  className="h-[560px] w-full border-0"
                />
              ) : (
                <div className="flex h-[560px] items-center justify-center text-sm text-gray-400">
                  {isGenerating ? "Generating styled hire email..." : "No preview yet"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t px-6 py-4">
          <p className="text-xs text-gray-500">
            {waitSeconds > 0
              ? `Cooldown: wait ${formatWait(waitSeconds)} before next send`
              : !to.trim()
                ? "Enter and validate recipient email to enable send"
                : isValidatingEmail
                  ? "Validating email…"
                  : emailCheck?.valid
                    ? `Validated — will send to ${to.trim()}`
                    : "Validate the email before sending"}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
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
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
