import fs from "fs";

const path = "data/templates.json";
const templates = JSON.parse(fs.readFileSync(path, "utf8"));

const FOOTER = `
            <p style="margin:24px 0 4px;">Best regards,</p>
            <p style="margin:0 0 2px;font-weight:700;color:#0f172a;">Faber Ceron</p>
            <p style="margin:0 0 14px;font-size:13px;color:#6b7280;">HR Recruiter · PivotalStacks</p>
            <p style="margin:0;font-size:11px;line-height:1.5;color:#9ca3af;">
              PivotalStacks · careers@pivotalstacks.com ·
              <a href="https://pivotalstacks.com" style="color:#0f766e;text-decoration:none;">pivotalstacks.com</a><br/>
              If this is not relevant, reply with "unsubscribe" and we will stop contacting you.
            </p>`;

function refreshBody(body) {
  let b = body;
  b = b.replace(/curriculum vitae/gi, "resume");
  b = b.replace(
    /your CV and a few times that work for a short 15–20 minute conversation/gi,
    "your resume and 2–3 times that work for a short intro call (15–20 minutes)"
  );
  b = b.replace(
    /your CV and availability for a brief 15–20 minute call/gi,
    "your resume and 2–3 times that work for a short intro call"
  );
  b = b.replace(
    /To discuss further, reply with your CV and preferred times for a 15–20 minute call\./gi,
    "If this looks relevant, reply with your resume and 2–3 times that work for a short intro call."
  );
  b = b.replace(
    /We would welcome the opportunity to speak with you\. Kindly reply with your resume and availability for a brief introductory call\./gi,
    "If you are open to it, reply with your resume and a couple of times that work for a short intro call."
  );
  b = b.replace(
    /Reply with CV \+ timing for a 15–20 min call/gi,
    "Reply with resume + 2–3 times for a 15–20 min call"
  );
  b = b.replace(
    /If useful, reply with your CV and availability for a short call:/gi,
    "If useful, reply with your resume and a couple of times for a short call:"
  );
  b = b.replace(
    /If this message is not relevant, reply with [“"]unsubscribe[”"] and we will stop contacting you\./gi,
    'If this is not relevant, reply with "unsubscribe" and we will stop contacting you.'
  );
  return b;
}

const subjects = {
  classic: "{{ROLE_TITLE}} at PivotalStacks",
  executive: "{{ROLE_TITLE}} — conversation with PivotalStacks",
  corporate: "Open role: {{ROLE_TITLE}} at PivotalStacks",
  "formal-invite": "Invitation: {{ROLE_TITLE}} at PivotalStacks",
  "modern-card": "{{ROLE_TITLE}} overview · PivotalStacks Careers",
  compact: "{{ROLE_TITLE}} at PivotalStacks",
  "outlook-safe": "{{ROLE_TITLE}} at PivotalStacks",
};

for (const t of templates) {
  t.body = refreshBody(t.body);
  if (subjects[t.id]) t.subject = subjects[t.id];
}

if (!templates.find((t) => t.id === "friendly-note")) {
  templates.push({
    id: "friendly-note",
    name: "Friendly Note",
    description: "Warmer, shorter note — still includes full role details",
    subject: "Quick note about {{ROLE_TITLE}} at PivotalStacks",
    body: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>{{ROLE_TITLE}}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e2e8f0;">
<tr><td style="padding:22px 26px;background:#ecfdf5;border-bottom:1px solid #d1fae5;">
<p style="margin:0;font-size:12px;color:#047857;letter-spacing:.06em;text-transform:uppercase;">PivotalStacks Careers</p>
<p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#064e3b;">{{ROLE_TITLE}}</p>
<p style="margin:6px 0 0;font-size:13px;color:#059669;">{{TRACK_LABEL}} · {{STYLE_LABEL}}</p>
</td></tr>
<tr><td style="padding:24px 26px;font-size:15px;line-height:1.65;color:#334155;">
<p style="margin:0 0 12px;">{{GREETING}}</p>
<p style="margin:0 0 16px;">{{OPENING}}</p>
<p style="margin:0 0 16px;">{{ROLE_BLURB}}</p>
<p style="margin:0 0 6px;font-weight:700;color:#0f172a;">What you would work on</p>
{{RESPONSIBILITIES}}
<p style="margin:16px 0 6px;font-weight:700;color:#0f172a;">Stack</p>
{{TECH_STACK}}
<p style="margin:16px 0 6px;font-weight:700;color:#0f172a;">What we look for</p>
{{LOOKING_FOR}}
<p style="margin:16px 0 6px;font-weight:700;color:#0f172a;">What we offer</p>
{{OFFER}}
<p style="margin:16px 0 18px;">{{WHY_US}}</p>
<p style="margin:0 0 14px;">If this resonates, just reply with your resume and a couple of times that work for a short call — happy to share more.</p>
<p style="margin:0 0 8px;"><a href="mailto:careers@pivotalstacks.com" style="color:#047857;font-weight:700;text-decoration:none;">careers@pivotalstacks.com</a></p>
${FOOTER}
</td></tr></table></td></tr></table></body></html>`,
  });
}

if (!templates.find((t) => t.id === "hiring-manager")) {
  templates.push({
    id: "hiring-manager",
    name: "Hiring Manager",
    description: "Direct, product-team tone — less corporate, still complete",
    subject: "{{ROLE_TITLE}} on the PivotalStacks team",
    body: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>{{ROLE_TITLE}}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #cbd5e1;">
<tr><td style="padding:20px 28px;border-bottom:2px solid #0f172a;">
<p style="margin:0;font-size:12px;color:#64748b;">From PivotalStacks recruiting</p>
<h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">{{ROLE_TITLE}}</h1>
<p style="margin:6px 0 0;font-size:13px;color:#475569;">Focus: {{TRACK_LABEL}} · Tone: {{STYLE_LABEL}}</p>
</td></tr>
<tr><td style="padding:24px 28px;font-size:15px;line-height:1.65;color:#334155;">
<p style="margin:0 0 12px;">{{GREETING}}</p>
<p style="margin:0 0 16px;">{{OPENING}}</p>
<p style="margin:0 0 16px;">{{ROLE_BLURB}}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#f8fafc;border:1px solid #e2e8f0;"><tr><td style="padding:14px 16px;">
<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;">Day-to-day</p>
{{RESPONSIBILITIES}}
</td></tr></table>
<p style="margin:0 0 6px;font-weight:700;">Technical focus</p>
{{TECH_STACK}}
<p style="margin:16px 0 6px;font-weight:700;">You will likely thrive if</p>
{{LOOKING_FOR}}
<p style="margin:16px 0 6px;font-weight:700;">Practical details</p>
{{OFFER}}
<p style="margin:16px 0 18px;">{{WHY_US}}</p>
<p style="margin:0 0 14px;">Interested? Reply with your resume and availability for a short conversation. Happy to answer questions about the team and stack.</p>
<p style="margin:0 0 8px;"><a href="mailto:careers@pivotalstacks.com" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 16px;">Email careers@pivotalstacks.com</a></p>
${FOOTER}
</td></tr></table></td></tr></table></body></html>`,
  });
}

fs.writeFileSync(path, JSON.stringify(templates, null, 2));
console.log(
  "ok",
  templates.length,
  templates.map((t) => t.id).join(", ")
);
