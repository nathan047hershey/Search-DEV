import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "fs";
import path from "path";
import {
  detectTrack,
  generateMatchedMessage,
  listHireTemplates,
  rebuildHireHtml,
} from "./minimax-message";
import { TRACK_PACKS, TRACK_OPTIONS, MESSAGE_STYLES } from "./message-packs";

describe("message packs + templates", () => {
  it("has packs for every track option", () => {
    for (const track of TRACK_OPTIONS) {
      const pack = TRACK_PACKS[track.id];
      assert.ok(pack, `missing pack ${track.id}`);
      assert.ok(pack.responsibilities.length >= 3);
      assert.ok(pack.lookingFor.length >= 3);
      assert.ok(pack.offer.length >= 3);
      assert.ok(pack.whyUs.length > 20);
      assert.ok(pack.techLines.length >= 3);
    }
  });

  it("exposes message styles including technical", () => {
    assert.ok(MESSAGE_STYLES.length >= 6);
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "technical"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "professional"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "direct"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "formal"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "short"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "curious"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "peer"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "followup"));
    assert.ok(MESSAGE_STYLES.some((s) => s.id === "followup-close"));
  });

  it("lists many platform / stack tracks", () => {
    assert.ok(TRACK_OPTIONS.length >= 20);
    for (const id of [
      "react",
      "nodejs",
      "python",
      "golang",
      "rust",
      "ml",
      "security",
      "flutter",
      "dotnet",
    ] as const) {
      assert.ok(
        TRACK_OPTIONS.some((t) => t.id === id),
        `missing track ${id}`
      );
    }
  });

  it("lists hire templates including auto and 15+ shells", () => {
    const templates = listHireTemplates();
    assert.ok(templates.some((t) => t.id === "auto"));
    assert.ok(templates.filter((t) => t.id !== "auto").length >= 25);
    assert.ok(templates.some((t) => t.id === "outlook-safe"));
    assert.ok(templates.some((t) => t.id === "two-column"));
    assert.ok(templates.some((t) => t.id === "dark-mode"));
    assert.ok(templates.some((t) => t.id === "newspaper"));
    assert.ok(templates.some((t) => t.id === "quiet-note"));
    assert.ok(templates.some((t) => t.id === "hire-brief"));
    assert.ok(templates.some((t) => t.id === "inbox-clean"));
    assert.ok(templates.some((t) => t.id === "simple-serif"));
  });

  it("templates contain LAYOUT_BODY and structural variety fields", () => {
    const raw = fs.readFileSync(
      path.join(process.cwd(), "data", "templates.json"),
      "utf8"
    );
    const templates = JSON.parse(raw) as Array<{
      id: string;
      body: string;
      contentLayout?: string;
    }>;
    assert.ok(templates.length >= 15);

    const layouts = new Set(
      templates.map((t) => t.contentLayout).filter(Boolean)
    );
    assert.ok(
      layouts.size >= 4,
      "templates should map to multiple content layouts"
    );

    for (const t of templates) {
      assert.ok(
        t.body.includes("{{LAYOUT_BODY}}"),
        `${t.id} missing {{LAYOUT_BODY}}`
      );
      assert.ok(t.contentLayout, `${t.id} missing contentLayout`);
    }
  });
});

describe("track detection + generation", () => {
  it("detects frontend vs backend and stack-specific tracks", () => {
    assert.equal(
      detectTrack({
        login: "ui-dev",
        bio: "React TypeScript frontend engineer",
        language: "TypeScript",
      }),
      "react"
    );
    assert.equal(
      detectTrack({
        login: "api-dev",
        bio: "Senior backend engineer building APIs with Node.js and PostgreSQL",
        language: "JavaScript",
      }),
      "nodejs"
    );
    assert.equal(
      detectTrack({
        login: "py-dev",
        bio: "Django and FastAPI services",
        language: "Python",
      }),
      "python"
    );
    assert.equal(
      detectTrack({
        login: "ml-dev",
        bio: "PyTorch LLM engineer",
        language: "Python",
      }),
      "ml"
    );
  });

  it("personalizes tech stack from developer language", async () => {
    delete process.env.MINIMAX_API_KEY;
    const msg = await generateMatchedMessage(
      {
        login: "octocat",
        name: "Octo Cat",
        bio: "React and Next.js",
        language: "TypeScript",
        company: "GitHub",
        created_at: "2015-01-01T00:00:00.000Z",
        public_repos: 50,
        followers: 200,
        earliest_repo_at: "2015-06-01T00:00:00.000Z",
      },
      {
        templateId: "outlook-safe",
        track: "react",
        style: "technical",
      }
    );
    assert.equal(msg.track, "react");
    assert.match(msg.body, /Relevant to your stack|TypeScript/i);
    assert.match(msg.body, /React Developer/);
    assert.match(msg.opening || msg.body, /PivotalStacks|relevant match|useful fit|hiring|Faber/i);
    assert.ok((msg.experienceYears || 0) >= 4 && (msg.experienceYears || 0) <= 10);
    assert.equal(msg.requiredYearsText, "4–6 years");
    assert.ok(!/17\+ years/i.test(msg.body));
    assert.ok(!/Profile signals|Fit for you|Role match:/i.test(msg.body));
    assert.ok(!/your profile suggests your/i.test(msg.body));
    assert.equal(msg.generatedBy, "template");
  });

  it("generates full html without Minimax key", async () => {
    delete process.env.MINIMAX_API_KEY;
    const msg = await generateMatchedMessage(
      {
        login: "octocat",
        name: "Octo Cat",
        bio: "React and Next.js",
        language: "TypeScript",
        company: "GitHub",
        created_at: "2014-01-01T00:00:00.000Z",
        public_repos: 40,
        followers: 100,
        earliest_repo_at: "2014-06-01T00:00:00.000Z",
      },
      {
        templateId: "outlook-safe",
        track: "frontend",
        style: "professional",
      }
    );

    assert.match(msg.subject, /Frontend|PivotalStacks/i);
    assert.equal(msg.track, "frontend");
    assert.equal(msg.templateId, "outlook-safe");
    assert.ok(msg.body.includes("Hi,") || msg.body.includes("Hello,"));
    assert.ok(!/Hi\s+octocat/i.test(msg.body));
    assert.ok(msg.body.includes("Frontend Developer"));
    assert.match(msg.opening || msg.body, /PivotalStacks|relevant match|useful fit|hiring|Faber|Details are below/i);
    assert.ok(!/framed the experience|aligned with your estimated|Fit for you|Profile signals/i.test(msg.body));
    assert.ok(!/Staff Full-Stack/i.test(msg.body));
    assert.ok(!/your profile suggests your|Given your .* background|Came across|stood out|if it's useful|strong fit|exciting opportunity/i.test(msg.body));
    assert.ok(!/Relevant to your stack:<\/strong> nodejs/i.test(msg.body));
    assert.ok(msg.layoutId);
    assert.ok(msg.offerHtml);
    assert.ok(msg.whyUs);
    assert.ok(msg.closingLine || /careers@pivotalstacks\.com/i.test(msg.body));
    assert.match(msg.body, /What we offer|Compensation|Remote-first|Pay set/i);
    assert.match(msg.opening || msg.body, /PivotalStacks|Faber Ceron/i);
    assert.ok(!/display\s*:\s*none/i.test(msg.body));
  });

  it("short first-touch includes a real role brief", async () => {
    delete process.env.MINIMAX_API_KEY;
    const msg = await generateMatchedMessage(
      {
        login: "octocat",
        bio: "Ruby engineer at GitHub",
        language: "Ruby",
        company: "GitHub",
        created_at: "2014-01-01T00:00:00.000Z",
        public_repos: 20,
      },
      {
        templateId: "outlook-safe",
        track: "ruby",
        style: "short",
      }
    );
    assert.equal(msg.layoutId, "short");
    assert.ok(msg.body.includes("Hi,") || msg.body.includes("Hello,"));
    assert.match(msg.body, /Senior Ruby Developer|Ruby/);
    assert.match(msg.body, /Day-to-day|Stack:|What we're looking for/i);
    assert.ok((msg.responsibilities || []).length >= 2);
    assert.ok(String(msg.roleBlurb || "").length > 20);
    assert.match(msg.body, /careers@pivotalstacks\.com/);
    assert.ok(!/https?:\/\/kiri/i.test(msg.opening || ""));
  });

  it("short openings always include a personalization signal", async () => {
    delete process.env.MINIMAX_API_KEY;
    const msg = await generateMatchedMessage(
      {
        login: "devlang",
        name: "Alex Kim",
        bio: "Backend engineer",
        language: "Go",
        featured_repo: "tiny-cache",
        featured_repo_description: "A small in-memory cache for Go services",
        created_at: "2016-01-01T00:00:00.000Z",
        public_repos: 25,
      },
      { templateId: "outlook-safe", track: "golang", style: "short" }
    );
    assert.equal(msg.layoutId, "short");
    assert.match(msg.greeting || "", /Hi, Alex,|Hello, Alex,/);
    assert.match(msg.opening || msg.body, /tiny-cache|Go|golang|in-memory cache/i);
    assert.match(msg.body, /Day-to-day|Stack:/i);
  });

  it("does not treat website URLs as employer names", async () => {
    delete process.env.MINIMAX_API_KEY;
    const { extractOpeningSignals, sanitizeEmployerName } = await import(
      "./minimax-message"
    );
    assert.equal(sanitizeEmployerName("https://kiri.ng"), "");
    assert.equal(sanitizeEmployerName("kiri.ng"), "");
    assert.equal(sanitizeEmployerName("Mezie Labs"), "Mezie Labs");
    const signals = extractOpeningSignals({
      login: "onyeka",
      company: "https://kiri.ng",
      language: "JavaScript",
      bio: "Full-stack developer",
    });
    assert.equal(signals.company, "");
    assert.ok(!/kiri\.ng|https?:\/\//i.test(signals.signals.join(" ")));
  });

  it("follow-up styles stay compact with a soft close option", async () => {
    delete process.env.MINIMAX_API_KEY;
    const bump = await generateMatchedMessage(
      {
        login: "devlang",
        name: "Alex Kim",
        language: "Go",
        featured_repo: "tiny-cache",
        created_at: "2016-01-01T00:00:00.000Z",
        public_repos: 25,
      },
      { templateId: "outlook-safe", track: "golang", style: "followup" }
    );
    assert.equal(bump.layoutId, "short");
    assert.match(bump.subject, /follow|Re:|Still hiring|Checking in|bump/i);
    assert.match(bump.opening || bump.body, /follow|bump|Circling|Still/i);
    assert.ok(!/Day-to-day|What we're looking for/i.test(bump.body));

    const close = await generateMatchedMessage(
      {
        login: "devlang",
        name: "Alex Kim",
        language: "Go",
        created_at: "2016-01-01T00:00:00.000Z",
        public_repos: 25,
      },
      { templateId: "outlook-safe", track: "golang", style: "followup-close" }
    );
    assert.equal(close.layoutId, "short");
    assert.match(close.opening || close.body, /Last note|leave it/i);
  });

  it("uses one active content type for all tones", async () => {
    delete process.env.MINIMAX_API_KEY;
    const { pickEmailLayout, ACTIVE_CONTENT_TYPE_IDS } = await import(
      "./email-layouts"
    );
    assert.deepEqual([...ACTIVE_CONTENT_TYPE_IDS], ["short"]);
    assert.equal(pickEmailLayout("alice"), "short");
    assert.equal(pickEmailLayout("bob", "classic"), "short");

    for (const style of ["short", "professional", "warm", "followup"] as const) {
      const msg = await generateMatchedMessage(
        {
          login: `one-type-${style}`,
          bio: "Ruby on Rails backend engineer",
          language: "Ruby",
          company: "Acme",
          created_at: "2015-01-01T00:00:00.000Z",
          public_repos: 30,
          followers: 40,
          earliest_repo_at: "2015-06-01T00:00:00.000Z",
        },
        { templateId: "outlook-safe", track: "ruby", style }
      );
      assert.equal(msg.layoutId, "short");
      if (style === "followup") {
        assert.ok(!/Day-to-day/i.test(msg.body));
      } else {
        assert.match(msg.body, /Day-to-day|Stack:/i);
      }
    }
  });

  it("rebuilds across templates preserving greeting", () => {
    const rebuilt = rebuildHireHtml(
      "Hello,",
      "I noticed your backend work and wanted to share a role.",
      "Senior Backend role at PivotalStacks",
      {
        templateId: "outlook-safe",
        track: "backend",
        style: "warm",
      }
    );
    assert.equal(rebuilt.greeting, "Hello,");
    assert.ok(rebuilt.body.includes("Hello,"));
    assert.ok(rebuilt.body.includes("backend") || rebuilt.body.includes("Backend"));
    assert.equal(rebuilt.templateId, "outlook-safe");
    assert.equal(rebuilt.track, "backend");
  });

  it("uses first name in greeting when profile has a real name", async () => {
    const { normalizeGreeting, extractFirstName, generateMatchedMessage } =
      await import("./minimax-message");
    assert.equal(extractFirstName("Jane Doe", "janed"), "Jane");
    assert.equal(extractFirstName("The Octocat", "otheruser"), "Octocat");
    assert.equal(extractFirstName("The Octocat", "octocat"), null);
    assert.equal(extractFirstName("segunajibola", "segunajibola"), null);
    assert.equal(normalizeGreeting("Hi segunajibola,", { login: "segunajibola" }), "Hi,");
    assert.equal(
      normalizeGreeting("Hello,", { name: "Jane Doe", login: "janed" }),
      "Hello, Jane,"
    );
    assert.equal(normalizeGreeting("Hi, Jane,", {}), "Hi, Jane,");
    assert.equal(normalizeGreeting("hi there"), "Hi,");

    delete process.env.MINIMAX_API_KEY;
    const msg = await generateMatchedMessage(
      {
        login: "janed",
        name: "Jane Doe",
        bio: "Ruby engineer",
        language: "Ruby",
        created_at: "2014-01-01T00:00:00.000Z",
        public_repos: 20,
      },
      { templateId: "outlook-safe", track: "ruby", style: "short" }
    );
    assert.match(msg.greeting || "", /Hi, Jane,|Hello, Jane,/);
    assert.match(msg.body, /Hi, Jane,|Hello, Jane,/);
  });

  it("normalizes username greetings to Hi or Hello only", async () => {
    const { normalizeGreeting, humanizeOpening } = await import("./minimax-message");
    assert.equal(normalizeGreeting("Hi segunajibola,"), "Hi,");
    assert.equal(normalizeGreeting("Hello Jane,"), "Hello, Jane,");
    assert.equal(normalizeGreeting("hi there"), "Hi,");
    const cleaned = humanizeOpening(
      "I am reaching out from PivotalStacks — in particular your backend work — Below you will find details."
    );
    assert.ok(!/[—–]/.test(cleaned));
    assert.match(cleaned, /I'm writing from/i);
  });

  it("does not quote LinkedIn-style bio banners in openings", async () => {
    const { extractOpeningSignals, generateMatchedMessage } = await import(
      "./minimax-message"
    );
    const signals = extractOpeningSignals({
      login: "resolutefemi",
      name: "Ariyo Oluwafemi Stephen",
      bio: "Ariyo Oluwafemi Stephen (Resolute Femi) | Software Engineer, Founder of Renance | FUTA CBT",
      language: null,
    });
    assert.equal(signals.company, "Renance");
    assert.match(signals.roleHint, /software engineer/i);
    assert.ok(signals.signals.some((s) => /Renance/i.test(s)));
    assert.ok(!signals.signals.some((s) => /Ariyo Oluwafemi/i.test(s)));

    delete process.env.MINIMAX_API_KEY;
    const msg = await generateMatchedMessage(
      {
        login: "resolutefemi",
        name: "Ariyo Oluwafemi Stephen",
        bio: "Ariyo Oluwafemi Stephen (Resolute Femi) | Software Engineer, Founder of Renance | FUTA CBT",
      },
      { track: "fullstack", style: "professional", templateId: "personal-letter" }
    );
    assert.ok(!/Ariyo Oluwafemi Stephen/i.test(msg.opening || ""));
    assert.ok(!/focus around/i.test(msg.opening || ""));
    assert.match(msg.opening || "", /Renance|software engineering|GitHub/i);
  });
});
