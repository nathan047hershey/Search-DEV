import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTIVE_CONTENT_TYPE_IDS,
  pickEmailLayout,
  renderLayoutBody,
  type LayoutContent,
} from "./email-layouts";

const sample: LayoutContent = {
  greeting: "Hello,",
  openingHtml: "I'm writing from PivotalStacks Careers about a Senior Ruby role.",
  roleTitle: "Senior Ruby Developer",
  roleBlurb: "We are seeking a <strong>Senior Ruby Developer</strong> for Rails services.",
  trackLabel: "Ruby",
  styleLabel: "Professional",
  responsibilities: [
    "Design high-availability Rails services",
    "Deliver RESTful API specifications",
    "Drive TDD and CI pipelines",
    "Operate Sidekiq and production habits",
  ],
  techFocus: ["Core: Ruby, Rails, RSpec", "Secondary: Go, JavaScript", "Platform: AWS, Kubernetes"],
  lookingFor: [
    "4–6 years of relevant Ruby experience",
    "Proficiency in Rails and REST APIs",
    "Strong mentoring skills",
  ],
  offer: [
    "Competitive compensation matched to experience",
    "Remote-first collaboration",
    "Transparent hiring process",
    "Real ownership of services",
  ],
  whyUs: "PivotalStacks focuses on scaling Ruby services with clear ownership.",
  processNote: "Short intro, then a technical conversation with the hiring engineer.",
  companyNote: "We build cloud-native product platforms and internal developer tooling.",
  closingLine:
    "If this Senior Ruby Developer role looks relevant, reply with your resume and 2–3 times for a short intro at careers@pivotalstacks.com.",
};

describe("email layouts", () => {
  it("uses a single active content type", () => {
    assert.deepEqual(
      [...ACTIVE_CONTENT_TYPE_IDS],
      ["short"],
      "add new types to ACTIVE_CONTENT_TYPE_IDS when ready"
    );
    assert.equal(pickEmailLayout("same-user"), "short");
    assert.equal(pickEmailLayout("other-user"), "short");
    // Legacy preferred layouts are ignored until activated
    assert.equal(pickEmailLayout("x", "brief"), "short");
    assert.equal(pickEmailLayout("x", "short"), "short");
  });

  it("keeps legacy renderers available for future types", () => {
    const classic = renderLayoutBody("classic", sample, "t");
    const letter = renderLayoutBody("letter", sample, "t");
    const brief = renderLayoutBody("brief", sample, "t");
    const pitch = renderLayoutBody("pitch", sample, "t");
    const checklist = renderLayoutBody("checklist", sample, "t");
    const invite = renderLayoutBody("invite", sample, "t");

    assert.match(classic, /Responsibilities/);
    assert.match(classic, /What we look for/);
    assert.match(classic, /What we offer/);

    assert.match(letter, /Key points/);
    assert.ok(!/What we look for/i.test(letter));

    assert.match(brief, /Stack:/);
    assert.match(brief, /What we offer/);
    assert.match(brief, /Senior Ruby Developer/);

    assert.match(pitch, /Role summary\./);
    assert.match(pitch, /Why we contacted you\./);
    assert.match(pitch, /What we offer/);

    assert.match(checklist, /What we offer/);
    assert.match(invite, /Responsibilities/);
    assert.match(invite, /Requirements/);
    assert.match(invite, /What we offer/);
    assert.match(invite, /Technical focus/);

    const timeline = renderLayoutBody("timeline", sample, "t");
    const split = renderLayoutBody("split", sample, "t");
    const spotlight = renderLayoutBody("spotlight", sample, "t");
    assert.match(timeline, /1\. Introduction/);
    assert.match(timeline, /Responsibilities/);
    assert.match(split, /Background/);
    assert.match(split, /Responsibilities/);
    assert.match(spotlight, /Responsibilities/);
    assert.match(spotlight, /Stack:/);

    const short = renderLayoutBody("short", sample, "t");
    assert.match(short, /Senior Ruby Developer/);
    assert.match(short, /Day-to-day|Stack:|What we're looking for/i);
    assert.match(short, /careers@pivotalstacks/i);
    assert.ok(!/What we look for/i.test(short));
  });
});
