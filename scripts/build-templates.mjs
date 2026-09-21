/**
 * Builds structurally different HTML templates (not color-only variants).
 * Each shell declares contentLayout so AI text shape also differs.
 * Run: node scripts/build-templates.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "data", "templates.json");

const layouts = [
  "classic",
  "letter",
  "brief",
  "pitch",
  "checklist",
  "invite",
  "timeline",
  "split",
  "spotlight",
];

function doc(titleInner, bodyInner) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${titleInner}</title></head>
${bodyInner}
</html>`;
}

function ctaBar(bg = "#0f766e") {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:18px 0 8px;"><tr>
<td style="background:${bg};padding:12px 18px;">
<a href="mailto:careers@pivotalstacks.com" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">Reply with resume · careers@pivotalstacks.com</a>
</td></tr></table>`;
}

function sigBlock(color = "#0f766e") {
  return `<p style="margin:22px 0 4px;">Best regards,</p>
<p style="margin:0 0 2px;font-weight:700;color:#0f172a;">Faber Ceron</p>
<p style="margin:0 0 12px;font-size:13px;color:#6b7280;">HR Recruiter · PivotalStacks</p>
<p style="margin:0;font-size:11px;line-height:1.5;color:#9ca3af;">
  PivotalStacks · <a href="https://pivotalstacks.com" style="color:${color};text-decoration:none;">pivotalstacks.com</a><br/>
  Reply "unsubscribe" to stop recruiting notes.
</p>`;
}

const defs = [
  {
    id: "outlook-safe",
    name: "Plain Outlook",
    description: "No card — plain text-like email (best for Outlook)",
    contentLayout: "classic",
    subject: "{{ROLE_TITLE}} at PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#222;font-size:15px;line-height:1.6;">
{{LAYOUT_BODY}}
<p style="margin:16px 0 2px;">Best regards,</p>
<p style="margin:0 0 2px;"><strong>Faber Ceron</strong></p>
<p style="margin:0 0 14px;color:#555;">HR Recruiter · PivotalStacks</p>
<p style="margin:0;font-size:12px;color:#777;">https://pivotalstacks.com · Tone: {{STYLE_LABEL}}<br/>Reply “unsubscribe” if you prefer not to receive recruiting notes.</p>
</body>`
    ),
  },
  {
    id: "memo",
    name: "Internal Memo",
    description: "Memo header block — To/From/Re lines, no marketing banner",
    contentLayout: "checklist",
    subject: "Re: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:20px 12px;"><tr><td align="center">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #d1d5db;">
<tr><td style="padding:16px 22px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;line-height:1.7;">
<strong>From:</strong> Faber Ceron · PivotalStacks Careers<br/>
<strong>Re:</strong> {{ROLE_TITLE}} ({{TRACK_LABEL}})<br/>
<strong>Tone:</strong> {{STYLE_LABEL}}
</td></tr>
<tr><td style="padding:22px;font-size:15px;line-height:1.65;color:#1f2937;">{{LAYOUT_BODY}}${sigBlock("#111827")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "personal-letter",
    name: "Personal Letter",
    description: "No role title in header — reads like a personal note first",
    contentLayout: "letter",
    subject: "A role that may fit your background",
    body: doc(
      "PivotalStacks",
      `<body style="margin:0;padding:28px 16px;background:#fff;font-family:Georgia,'Times New Roman',serif;color:#1c1917;font-size:16px;line-height:1.75;">
<p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#a8a29e;">PivotalStacks Careers</p>
{{LAYOUT_BODY}}
<p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#78716c;">— Faber Ceron · HR Recruiter<br/>careers@pivotalstacks.com · pivotalstacks.com</p>
</body>`
    ),
  },
  {
    id: "two-column",
    name: "Two Column Brief",
    description: "Left rail with role meta + right column body",
    contentLayout: "brief",
    subject: "{{ROLE_TITLE}} · brief",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 10px;"><tr><td align="center">
<table width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#fff;">
<tr>
<td width="200" valign="top" style="background:#312e81;color:#e0e7ff;padding:22px 16px;font-size:13px;line-height:1.5;">
<p style="margin:0 0 10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;">Role</p>
<p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#fff;">{{ROLE_TITLE}}</p>
<p style="margin:0 0 6px;"><strong>Track</strong><br/>{{TRACK_LABEL}}</p>
<p style="margin:12px 0 6px;"><strong>Tone</strong><br/>{{STYLE_LABEL}}</p>
<p style="margin:18px 0 0;font-size:11px;opacity:.85;">PivotalStacks Careers</p>
</td>
<td valign="top" style="padding:22px 20px;font-size:14px;line-height:1.65;color:#1e293b;">{{LAYOUT_BODY}}${ctaBar("#312e81")}${sigBlock("#312e81")}</td>
</tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "cta-first",
    name: "CTA First",
    description: "Reply button at the top, then content",
    contentLayout: "pitch",
    subject: "Quick intro call? {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #cbd5e1;">
<tr><td style="padding:20px 24px;background:#0f172a;color:#fff;">
<p style="margin:0 0 10px;font-size:18px;font-weight:700;">{{ROLE_TITLE}}</p>
${ctaBar("#0f766e")}
<p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">Or read the overview below · {{TRACK_LABEL}}</p>
</td></tr>
<tr><td style="padding:22px 24px;font-size:15px;line-height:1.65;color:#334155;">{{LAYOUT_BODY}}${sigBlock()}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "footer-title",
    name: "Title in Footer",
    description: "Opens as a note; role title appears after the body",
    contentLayout: "invite",
    subject: "Invitation from PivotalStacks Careers",
    body: doc(
      "PivotalStacks invitation",
      `<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center">
<table width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:#fff;border:1px solid #e5e7eb;">
<tr><td style="padding:24px 26px;font-size:15px;line-height:1.65;color:#374151;">
<p style="margin:0 0 14px;font-size:12px;color:#6b7280;">PivotalStacks Careers · personal invitation</p>
{{LAYOUT_BODY}}
<table width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 8px;border-top:1px solid #e5e7eb;"><tr><td style="padding-top:16px;">
<p style="margin:0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;">Role referenced</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#111827;">{{ROLE_TITLE}}</p>
<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">{{TRACK_LABEL}} · {{STYLE_LABEL}}</p>
</td></tr></table>
${sigBlock("#111827")}
</td></tr></table></td></tr></table></body>`
    ),
  },
  {
    id: "strip-stack",
    name: "Stacked Strips",
    description: "Horizontal strips: brand / role / body / footer",
    contentLayout: "classic",
    subject: "{{ROLE_TITLE}} at PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:16px;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0ea5e9;padding:10px 20px;color:#fff;font-size:12px;font-weight:700;letter-spacing:.08em;">PIVOTALSTACKS CAREERS</td></tr>
<tr><td style="background:#0369a1;padding:16px 20px;color:#fff;">
<p style="margin:0;font-size:20px;font-weight:700;">{{ROLE_TITLE}}</p>
<p style="margin:4px 0 0;font-size:13px;opacity:.9;">{{TRACK_LABEL}}</p>
</td></tr>
<tr><td style="background:#fff;padding:22px 20px;font-size:15px;line-height:1.65;color:#0f172a;">{{LAYOUT_BODY}}</td></tr>
<tr><td style="background:#e2e8f0;padding:16px 20px;font-size:12px;color:#475569;">Faber Ceron · HR Recruiter · careers@pivotalstacks.com · {{STYLE_LABEL}}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "quote-frame",
    name: "Quote Frame",
    description: "Body indented as a quoted overview block",
    contentLayout: "letter",
    subject: "Overview: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:24px 12px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
<p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Hello from PivotalStacks Careers</p>
<p style="margin:0 0 16px;font-size:20px;font-weight:700;">{{ROLE_TITLE}}</p>
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;"><tr>
<td width="4" style="background:#a855f7;font-size:0;">&nbsp;</td>
<td style="padding:4px 0 4px 16px;font-size:15px;line-height:1.65;">{{LAYOUT_BODY}}</td>
</tr></table>
${ctaBar("#7e22ce")}
${sigBlock("#7e22ce")}
</body>`
    ),
  },
  {
    id: "card-stack",
    name: "Card Stack",
    description: "Separate cards for intro chrome vs body",
    contentLayout: "pitch",
    subject: "{{ROLE_TITLE}} · PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:20px 12px;"><tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;margin-bottom:12px;background:#fff;border-radius:8px;border:1px solid #e4e4e7;">
<tr><td style="padding:18px 20px;">
<p style="margin:0;font-size:12px;color:#71717a;">PivotalStacks · {{STYLE_LABEL}}</p>
<p style="margin:6px 0 0;font-size:19px;font-weight:700;color:#18181b;">{{ROLE_TITLE}}</p>
<p style="margin:4px 0 0;font-size:13px;color:#52525b;">{{TRACK_LABEL}}</p>
</td></tr></table>
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fff;border-radius:8px;border:1px solid #e4e4e7;">
<tr><td style="padding:20px;font-size:15px;line-height:1.65;color:#3f3f46;">{{LAYOUT_BODY}}${sigBlock("#18181b")}</td></tr>
</table>
</td></tr></table></body>`
    ),
  },
  {
    id: "narrow-phone",
    name: "Narrow Mobile",
    description: "420px narrow column — mobile-first feel",
    contentLayout: "brief",
    subject: "{{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:12px;background:#ecfdf5;font-family:Arial,Helvetica,sans-serif;">
<table width="420" cellspacing="0" cellpadding="0" align="center" style="max-width:420px;width:100%;background:#fff;border:1px solid #a7f3d0;">
<tr><td style="padding:14px 16px;background:#059669;color:#fff;font-size:16px;font-weight:700;">{{ROLE_TITLE}}</td></tr>
<tr><td style="padding:16px;font-size:14px;line-height:1.55;color:#064e3b;">{{LAYOUT_BODY}}
<p style="margin:16px 0 0;font-size:12px;">Faber Ceron · careers@pivotalstacks.com</p>
</td></tr></table></body>`
    ),
  },
  {
    id: "wide-report",
    name: "Wide Report",
    description: "720px report-style document",
    contentLayout: "classic",
    subject: "Hiring brief: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:20px 8px;"><tr><td align="center">
<table width="720" cellspacing="0" cellpadding="0" style="max-width:720px;width:100%;background:#fff;border:1px solid #cbd5e1;">
<tr><td style="padding:12px 24px;border-bottom:2px solid #0f172a;">
<table width="100%"><tr>
<td><span style="font-size:11px;font-weight:700;letter-spacing:.1em;">HIRING BRIEF</span></td>
<td align="right" style="font-size:12px;color:#64748b;">{{TRACK_LABEL}} / {{STYLE_LABEL}}</td>
</tr></table>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;">{{ROLE_TITLE}}</p>
</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.65;">{{LAYOUT_BODY}}${sigBlock("#0f172a")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "dark-mode",
    name: "Dark Mode",
    description: "Dark background email — inverted contrast",
    contentLayout: "invite",
    subject: "{{ROLE_TITLE}} · PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#0b1220;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#111827;border:1px solid #1f2937;">
<tr><td style="padding:22px 26px;border-bottom:1px solid #1f2937;">
<p style="margin:0;font-size:12px;color:#94a3b8;">PivotalStacks Careers</p>
<p style="margin:8px 0 0;font-size:21px;font-weight:700;color:#f8fafc;">{{ROLE_TITLE}}</p>
<p style="margin:6px 0 0;font-size:13px;color:#64748b;">{{TRACK_LABEL}}</p>
</td></tr>
<tr><td style="padding:24px 26px;font-size:15px;line-height:1.65;color:#e2e8f0;">{{LAYOUT_BODY}}
<p style="margin:22px 0 4px;color:#f8fafc;">Best regards,</p>
<p style="margin:0 0 2px;font-weight:700;color:#f8fafc;">Faber Ceron</p>
<p style="margin:0;font-size:12px;color:#94a3b8;">HR Recruiter · careers@pivotalstacks.com</p>
</td></tr></table></td></tr></table></body>`
    ),
  },
  {
    id: "newspaper",
    name: "Broadsheet",
    description: "Dense newspaper-style top masthead + rules",
    contentLayout: "checklist",
    subject: "{{TRACK_LABEL}} | {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:16px;background:#fff;font-family:Georgia,serif;color:#111;">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;margin:0 auto;">
<tr><td style="border-top:3px solid #111;border-bottom:1px solid #111;padding:8px 0;text-align:center;">
<p style="margin:0;font-size:11px;letter-spacing:.2em;text-transform:uppercase;font-family:Arial,sans-serif;">The PivotalStacks Careers Desk</p>
</td></tr>
<tr><td style="padding:14px 0 6px;border-bottom:1px solid #111;">
<p style="margin:0;font-size:26px;line-height:1.2;font-weight:700;">{{ROLE_TITLE}}</p>
<p style="margin:6px 0 0;font-size:12px;font-family:Arial,sans-serif;color:#444;">{{TRACK_LABEL}} · {{STYLE_LABEL}}</p>
</td></tr>
<tr><td style="padding:16px 0;font-size:15px;line-height:1.65;">{{LAYOUT_BODY}}</td></tr>
<tr><td style="border-top:1px solid #111;padding-top:12px;font-size:12px;font-family:Arial,sans-serif;color:#444;">
Faber Ceron · careers@pivotalstacks.com · pivotalstacks.com
</td></tr></table></body>`
    ),
  },
  {
    id: "sidebar-note",
    name: "Sticky Note Sidebar",
    description: "Main column + yellow sticky note column",
    contentLayout: "pitch",
    subject: "Note: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#fafaf9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:20px 10px;"><tr><td align="center">
<table width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;">
<tr>
<td valign="top" style="padding:18px;background:#fff;border:1px solid #e7e5e4;font-size:14px;line-height:1.6;color:#292524;">
<p style="margin:0 0 12px;font-size:18px;font-weight:700;">{{ROLE_TITLE}}</p>
{{LAYOUT_BODY}}
${sigBlock("#78716c")}
</td>
<td width="16"></td>
<td width="180" valign="top" style="background:#fef08a;padding:14px;font-size:12px;line-height:1.45;color:#713f12;border:1px solid #fde047;">
<p style="margin:0 0 8px;font-weight:700;">Sticky note</p>
<p style="margin:0 0 8px;">Track: {{TRACK_LABEL}}</p>
<p style="margin:0 0 8px;">Tone: {{STYLE_LABEL}}</p>
<p style="margin:0;">Reply: careers@pivotalstacks.com</p>
</td>
</tr></table></td></tr></table></body>`
    ),
  },
  {
    id: "sequential-blocks",
    name: "Sequential Blocks",
    description: "Three stacked bordered blocks (brand / body / sign-off)",
    contentLayout: "classic",
    subject: "{{ROLE_TITLE}} opening",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:20px 12px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="580" align="center" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;">
<tr><td style="padding:14px 16px;border:2px solid #0f766e;background:#fff;margin-bottom:10px;">
<p style="margin:0;font-size:12px;color:#0f766e;font-weight:700;">BLOCK 1 · BRAND</p>
<p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#0f172a;">{{ROLE_TITLE}}</p>
</td></tr>
<tr><td style="height:10px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:16px;border:2px solid #cbd5e1;background:#fff;font-size:14px;line-height:1.6;">
<p style="margin:0 0 10px;font-size:12px;color:#64748b;font-weight:700;">BLOCK 2 · MESSAGE</p>
{{LAYOUT_BODY}}
</td></tr>
<tr><td style="height:10px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:14px 16px;border:2px solid #e2e8f0;background:#fff;">
<p style="margin:0;font-size:12px;color:#64748b;font-weight:700;">BLOCK 3 · SIGN-OFF</p>
<p style="margin:8px 0 0;">Faber Ceron · HR Recruiter<br/>careers@pivotalstacks.com · {{STYLE_LABEL}}</p>
</td></tr>
</table></body>`
    ),
  },
  {
    id: "center-hero",
    name: "Centered Hero",
    description: "Centered hero title, then left-aligned body",
    contentLayout: "invite",
    subject: "{{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:linear-gradient(#ecfeff,#ffffff);font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;"><tr><td align="center">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;">
<tr><td align="center" style="padding:20px 16px 8px;">
<p style="margin:0;font-size:12px;color:#0e7490;letter-spacing:.14em;text-transform:uppercase;">PivotalStacks</p>
<p style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:700;color:#164e63;">{{ROLE_TITLE}}</p>
<p style="margin:8px 0 0;font-size:13px;color:#155e75;">{{TRACK_LABEL}} · {{STYLE_LABEL}}</p>
</td></tr>
<tr><td style="padding:18px 8px 8px;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #a5f3fc;">
<tr><td style="padding:22px;font-size:15px;line-height:1.65;color:#334155;text-align:left;">{{LAYOUT_BODY}}${ctaBar("#0e7490")}${sigBlock("#0e7490")}</td></tr>
</table>
</td></tr></table></td></tr></table></body>`
    ),
  },
  {
    id: "compact-threads",
    name: "Thread Style",
    description: "Looks like a short email thread reply",
    contentLayout: "brief",
    subject: "Re: {{ROLE_TITLE}} opportunity",
    body: doc(
      "Re: {{ROLE_TITLE}}",
      `<body style="margin:0;padding:16px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.55;">
<p style="margin:0 0 12px;color:#6b7280;font-size:12px;">On a recruiting note from PivotalStacks Careers —</p>
{{LAYOUT_BODY}}
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
<p style="margin:0;color:#6b7280;font-size:12px;">
<strong style="color:#111;">{{ROLE_TITLE}}</strong> · {{TRACK_LABEL}}<br/>
Faber Ceron &lt;careers@pivotalstacks.com&gt;
</p>
</body>`
    ),
  },
  {
    id: "badge-header",
    name: "Badge Header",
    description: "Pill badge + underline, then full width body",
    contentLayout: "letter",
    subject: "{{ROLE_TITLE}} match",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:24px 14px;background:#fff;font-family:Arial,Helvetica,sans-serif;">
<p style="margin:0 0 12px;">
<span style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:4px 10px;border-radius:999px;">HIRING · {{TRACK_LABEL}}</span>
</p>
<p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0f172a;border-bottom:3px solid #ef4444;padding-bottom:10px;">{{ROLE_TITLE}}</p>
<div style="padding-top:16px;font-size:15px;line-height:1.65;color:#334155;">{{LAYOUT_BODY}}</div>
${ctaBar("#b91c1c")}
${sigBlock("#b91c1c")}
</body>`
    ),
  },
  {
    id: "executive",
    name: "Executive Top Rule",
    description: "Formal letter with thick top rule only (no colored banner)",
    contentLayout: "letter",
    subject: "{{ROLE_TITLE}} — conversation with PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center">
<table width="620" cellspacing="0" cellpadding="0" style="max-width:620px;width:100%;background:#fff;border-top:4px solid #0f766e;">
<tr><td style="padding:28px 36px;font-size:15px;line-height:1.7;color:#334155;">
<p style="margin:0 0 4px;font-size:12px;color:#0f766e;letter-spacing:.1em;text-transform:uppercase;">PivotalStacks</p>
<p style="margin:0 0 18px;font-size:13px;color:#64748b;">Regarding: {{ROLE_TITLE}} · {{TRACK_LABEL}}</p>
{{LAYOUT_BODY}}
${sigBlock()}
</td></tr></table></td></tr></table></body>`
    ),
  },
  {
    id: "reply-first",
    name: "Reply First",
    description: "CTA button above the message — action before details",
    contentLayout: "brief",
    subject: "Quick reply: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:20px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #cbd5e1;">
<tr><td style="padding:20px 24px;background:#0f766e;color:#fff;">
<p style="margin:0;font-size:12px;opacity:.85;">PivotalStacks Careers</p>
<p style="margin:8px 0 0;font-size:20px;font-weight:700;">{{ROLE_TITLE}}</p>
${ctaBar("#134e4a")}
</td></tr>
<tr><td style="padding:22px 24px;font-size:15px;line-height:1.65;color:#334155;">{{LAYOUT_BODY}}${sigBlock()}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "dossier",
    name: "Role Dossier",
    description: "Labeled dossier fields (Role / Track / Tone) then body",
    contentLayout: "checklist",
    subject: "Dossier: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:18px 12px;background:#eef2ff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #c7d2fe;">
<tr><td style="padding:18px 22px;background:#312e81;color:#e0e7ff;font-size:12px;letter-spacing:.1em;text-transform:uppercase;">Candidate dossier · confidential</td></tr>
<tr><td style="padding:18px 22px;border-bottom:1px solid #e0e7ff;font-size:14px;line-height:1.8;color:#312e81;">
<strong>Role:</strong> {{ROLE_TITLE}}<br/>
<strong>Track:</strong> {{TRACK_LABEL}}<br/>
<strong>Tone:</strong> {{STYLE_LABEL}}
</td></tr>
<tr><td style="padding:22px;font-size:15px;line-height:1.65;color:#1e1b4b;">{{LAYOUT_BODY}}${sigBlock("#312e81")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "left-rail",
    name: "Left Accent Rail",
    description: "Full-height left color bar, single column content",
    contentLayout: "classic",
    subject: "{{ROLE_TITLE}} · PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:16px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;">
<tr>
<td width="8" style="background:#ea580c;font-size:0;line-height:0;">&nbsp;</td>
<td style="padding:24px 22px;font-size:15px;line-height:1.65;color:#292524;">
<p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.12em;color:#c2410c;">PIVOTALSTACKS CAREERS</p>
<p style="margin:0 0 16px;font-size:22px;font-weight:700;color:#9a3412;">{{ROLE_TITLE}}</p>
{{LAYOUT_BODY}}
${ctaBar("#ea580c")}
${sigBlock("#ea580c")}
</td>
</tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "mono-spec",
    name: "Mono Spec Sheet",
    description: "Monospace / spec-sheet engineering look",
    contentLayout: "timeline",
    subject: "[spec] {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:16px;background:#0c0a09;font-family:Consolas,'Courier New',monospace;color:#e7e5e4;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="620" cellspacing="0" cellpadding="0" style="max-width:620px;width:100%;background:#1c1917;border:1px solid #44403c;">
<tr><td style="padding:14px 18px;border-bottom:1px solid #44403c;font-size:12px;color:#a8a29e;">
// pivotalstacks.careers · track={{TRACK_LABEL}} · tone={{STYLE_LABEL}}
</td></tr>
<tr><td style="padding:20px 18px;font-size:14px;line-height:1.6;color:#e7e5e4;">
<p style="margin:0 0 12px;font-size:18px;color:#fdba74;">{{ROLE_TITLE}}</p>
{{LAYOUT_BODY}}
<p style="margin:20px 0 4px;color:#a8a29e;">— Faber Ceron · HR Recruiter</p>
<p style="margin:0;font-size:12px;color:#78716c;">careers@pivotalstacks.com</p>
</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "calendar-invite",
    name: "Calendar Invite",
    description: "Looks like a meeting invite teaser before the role overview",
    contentLayout: "invite",
    subject: "Hold: intro for {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:20px 12px;background:#ecfdf5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #6ee7b7;">
<tr><td style="padding:16px 20px;background:#059669;color:#fff;">
<p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">Proposed intro call</p>
<p style="margin:8px 0 0;font-size:18px;font-weight:700;">{{ROLE_TITLE}}</p>
<p style="margin:6px 0 0;font-size:13px;opacity:.9;">15–20 min · careers@pivotalstacks.com · {{TRACK_LABEL}}</p>
</td></tr>
<tr><td style="padding:22px 20px;font-size:15px;line-height:1.65;color:#064e3b;">{{LAYOUT_BODY}}${sigBlock("#047857")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "split-banner",
    name: "Split Banner",
    description: "Half header band + white body — role in the color zone",
    contentLayout: "split",
    subject: "{{ROLE_TITLE}} opening",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#fff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr><td style="background:#1e3a8a;padding:28px 24px;color:#fff;">
<p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#93c5fd;">PivotalStacks</p>
<p style="margin:10px 0 0;font-size:24px;font-weight:700;">{{ROLE_TITLE}}</p>
<p style="margin:8px 0 0;font-size:14px;color:#bfdbfe;">{{TRACK_LABEL}} · {{STYLE_LABEL}}</p>
</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.65;color:#1e3a8a;">{{LAYOUT_BODY}}${ctaBar("#1e3a8a")}${sigBlock("#1e40af")}</td></tr>
</table></body>`
    ),
  },
  {
    id: "numbered-steps",
    name: "Numbered Steps Shell",
    description: "Chrome shows Step 1 / Step 2 labels around the body",
    contentLayout: "timeline",
    subject: "{{ROLE_TITLE}} — three steps",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:18px 12px;background:#faf5ff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #e9d5ff;">
<tr><td style="padding:16px 20px;background:#7c3aed;color:#fff;font-size:13px;">
<strong>STEP 0 · CONTEXT</strong> · {{ROLE_TITLE}} · {{TRACK_LABEL}}
</td></tr>
<tr><td style="padding:8px 20px;font-size:12px;color:#6b21a8;background:#f3e8ff;">STEP 1–3 are in the message body below</td></tr>
<tr><td style="padding:22px 20px;font-size:15px;line-height:1.65;color:#3b0764;">{{LAYOUT_BODY}}${sigBlock("#7c3aed")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "soft-bands",
    name: "Soft Band Stack",
    description: "Alternating soft background bands for sections",
    contentLayout: "spotlight",
    subject: "About the {{ROLE_TITLE}} role",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#fff;font-family:Georgia,serif;color:#1f2937;">
<table width="100%" cellspacing="0" cellpadding="0">
<tr><td style="padding:22px 24px;background:#fef3c7;">
<p style="margin:0;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#92400e;">PivotalStacks Careers</p>
<p style="margin:8px 0 0;font-size:22px;font-weight:700;color:#78350f;">{{ROLE_TITLE}}</p>
</td></tr>
<tr><td style="padding:22px 24px;background:#fffbeb;font-size:15px;line-height:1.7;color:#451a03;">{{LAYOUT_BODY}}</td></tr>
<tr><td style="padding:16px 24px;background:#fde68a;font-size:12px;color:#78350f;">Faber Ceron · HR Recruiter · careers@pivotalstacks.com · {{STYLE_LABEL}}</td></tr>
</table></body>`
    ),
  },
  {
    id: "product-sheet",
    name: "Product Sheet",
    description: "Product one-pager: title row, meta row, then body",
    contentLayout: "split",
    subject: "Product sheet: {{ROLE_TITLE}}",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:16px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#fff;border:1px solid #e2e8f0;">
<tr><td style="padding:16px 20px;border-bottom:2px solid #0ea5e9;">
<table width="100%" cellspacing="0" cellpadding="0"><tr>
<td style="font-size:20px;font-weight:700;color:#0c4a6e;">{{ROLE_TITLE}}</td>
<td align="right" style="font-size:12px;color:#0369a1;">v1 · hiring</td>
</tr></table>
</td></tr>
<tr><td style="padding:10px 20px;background:#f0f9ff;font-size:12px;color:#075985;">
Track: {{TRACK_LABEL}} &nbsp;|&nbsp; Tone: {{STYLE_LABEL}} &nbsp;|&nbsp; From: Faber Ceron
</td></tr>
<tr><td style="padding:22px 20px;font-size:15px;line-height:1.65;color:#0f172a;">{{LAYOUT_BODY}}${ctaBar("#0284c7")}${sigBlock("#0284c7")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "quiet-note",
    name: "Quiet Note",
    description: "Minimal note — no banner, no CTA button (best for short first-touch)",
    contentLayout: "letter",
    subject: "{{ROLE_TITLE}} - short note",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:24px 18px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1f2937;font-size:15px;line-height:1.65;">
<p style="margin:0 0 18px;font-size:12px;color:#6b7280;">PivotalStacks Careers · {{STYLE_LABEL}}</p>
{{LAYOUT_BODY}}
<p style="margin:24px 0 4px;">Best,</p>
<p style="margin:0 0 2px;font-weight:700;">Faber Ceron</p>
<p style="margin:0;font-size:13px;color:#6b7280;">HR Recruiter · careers@pivotalstacks.com</p>
</body>`
    ),
  },
  {
    id: "hire-brief",
    name: "Hire Brief",
    description: "Clean one-column hire brief with soft header rule",
    contentLayout: "brief",
    subject: "{{ROLE_TITLE}} brief",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:20px 12px;"><tr><td align="center">
<table width="580" cellspacing="0" cellpadding="0" style="max-width:580px;width:100%;background:#fff;border:1px solid #e5e7eb;">
<tr><td style="padding:18px 22px 12px;border-bottom:3px solid #0f766e;">
<p style="margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#0f766e;">Hiring brief</p>
<p style="margin:6px 0 0;font-size:18px;font-weight:700;color:#111827;">{{ROLE_TITLE}}</p>
<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">{{TRACK_LABEL}} · {{STYLE_LABEL}}</p>
</td></tr>
<tr><td style="padding:20px 22px;font-size:15px;line-height:1.65;color:#1f2937;">{{LAYOUT_BODY}}${sigBlock("#0f766e")}</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "inbox-clean",
    name: "Inbox Clean",
    description: "Gmail-like clean column — readable on phone and desktop",
    contentLayout: "classic",
    subject: "{{ROLE_TITLE}} at PivotalStacks",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:0;background:#eceff1;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="padding:16px 8px;"><tr><td align="center">
<table width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:2px;">
<tr><td style="padding:14px 20px;border-bottom:1px solid #e8eaed;font-size:13px;color:#5f6368;">
From Faber Ceron &lt;careers@pivotalstacks.com&gt; · {{TRACK_LABEL}}
</td></tr>
<tr><td style="padding:20px;font-size:15px;line-height:1.65;color:#202124;">{{LAYOUT_BODY}}
<p style="margin:22px 0 4px;">Best regards,</p>
<p style="margin:0 0 2px;font-weight:700;">Faber Ceron</p>
<p style="margin:0;font-size:12px;color:#5f6368;">HR Recruiter · PivotalStacks · {{STYLE_LABEL}}</p>
</td></tr>
</table></td></tr></table></body>`
    ),
  },
  {
    id: "simple-serif",
    name: "Simple Serif",
    description: "Readable serif letter — calm, personal, no marketing chrome",
    contentLayout: "letter",
    subject: "About the {{ROLE_TITLE}} role",
    body: doc(
      "{{ROLE_TITLE}}",
      `<body style="margin:0;padding:32px 20px;background:#fafaf9;font-family:Georgia,'Times New Roman',serif;color:#1c1917;font-size:16px;line-height:1.7;">
<table width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table width="520" cellspacing="0" cellpadding="0" style="max-width:520px;width:100%;">
<tr><td>
<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#a8a29e;">PivotalStacks</p>
<p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:13px;color:#78716c;">{{ROLE_TITLE}} · {{STYLE_LABEL}}</p>
{{LAYOUT_BODY}}
<p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#57534e;">
Faber Ceron<br/>HR Recruiter · careers@pivotalstacks.com
</p>
</td></tr>
</table></td></tr></table></body>`
    ),
  },
];

// Fix accidental id with space
for (const d of defs) {
  d.id = d.id.trim().replace(/\s+/g, "-");
  if (!d.contentLayout) {
    d.contentLayout = layouts[Math.abs(d.id.length) % layouts.length];
  }
}

fs.writeFileSync(out, JSON.stringify(defs, null, 2) + "\n", "utf8");
console.log(`Wrote ${defs.length} STRUCTURAL templates`);
for (const d of defs) {
  console.log(`  ${d.id.padEnd(20)} layout=${d.contentLayout} · ${d.name}`);
}
