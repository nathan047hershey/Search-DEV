import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assessMessageQuality, htmlToPlainApprox } from "./message-quality";

describe("message quality", () => {
  it("scores specific short outreach higher than slop", () => {
    const strong = assessMessageQuality({
      subject: "Senior Go at PivotalStacks",
      greeting: "Hi, Alex,",
      opening:
        "I'm Faber with PivotalStacks Careers. We're hiring a Senior Go Developer, and your work on tiny-cache looked close to what the team needs.",
      whyUs: "You'd own Go services other teams depend on.",
      closingLine:
        "Reply with your resume and 2 times to careers@pivotalstacks.com.",
      bodyText:
        "Hi, Alex, I'm Faber... tiny-cache... You'd own Go services. Reply with resume careers@pivotalstacks.com",
      style: "short",
      hasRepoSignal: true,
      hasFirstNameGreeting: true,
    });
    assert.equal(strong.label, "Strong");
    assert.ok(strong.score >= 78);

    const weak = assessMessageQuality({
      subject: "Exciting opportunity",
      greeting: "Hi,",
      opening:
        "I came across your impressive profile and was excited by your passion for cutting-edge solutions.",
      bodyText: "Exciting passionate cutting-edge strong fit opportunity",
      style: "short",
    });
    assert.ok(weak.score < strong.score);
    assert.ok(weak.issues.length >= 1);
  });

  it("strips html for word estimates", () => {
    assert.match(htmlToPlainApprox("<p>Hello <b>world</b></p>"), /Hello world/);
  });
});
