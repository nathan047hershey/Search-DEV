import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  htmlToPlainText,
  isDisposableEmail,
  isRoleAddress,
  isValidEmailFormat,
  normalizeEmail,
  sanitizeSubject,
  suggestEmailCorrection,
  validateRecipientEmail,
} from "./email-validate";

describe("email-validate", () => {
  it("normalizes emails", () => {
    assert.equal(normalizeEmail("  Alex@Gmail.COM "), "alex@gmail.com");
  });

  it("accepts valid formats", () => {
    assert.equal(isValidEmailFormat("jane.doe+hire@company.co.uk"), true);
    assert.equal(isValidEmailFormat("dev@outlook.com"), true);
  });

  it("rejects bad formats", () => {
    assert.equal(isValidEmailFormat(""), false);
    assert.equal(isValidEmailFormat("not-an-email"), false);
    assert.equal(isValidEmailFormat("a@@b.com"), false);
    assert.equal(isValidEmailFormat("a@b"), false);
  });

  it("suggests common typos", () => {
    assert.equal(suggestEmailCorrection("me@gmial.com"), "me@gmail.com");
    assert.equal(suggestEmailCorrection("me@outlok.com"), "me@outlook.com");
  });

  it("flags disposable and role addresses", () => {
    assert.equal(isDisposableEmail("x@mailinator.com"), true);
    assert.equal(isRoleAddress("noreply@company.com"), true);
    assert.equal(isRoleAddress("jane@company.com"), false);
  });

  it("sanitizes subjects for deliverability", () => {
    assert.match(
      sanitizeSubject("Frontend role matched to your profile!!!"),
      /PivotalStacks|Frontend/i
    );
    assert.ok(!/matched to your profile/i.test(sanitizeSubject("Role matched to your profile")));
    assert.equal(sanitizeSubject(""), "Engineering role at PivotalStacks");
  });

  it("converts html to readable plain text", () => {
    const text = htmlToPlainText(
      '<p>Hi Alex,</p><p>We are hiring.</p><a href="https://pivotalstacks.com">PivotalStacks</a><script>bad()</script>'
    );
    assert.match(text, /Hi Alex/);
    assert.match(text, /We are hiring/);
    assert.match(text, /PivotalStacks \(https:\/\/pivotalstacks.com\)/);
    assert.ok(!/bad\(\)/.test(text));
  });

  it("validates live MX for gmail.com", async () => {
    const result = await validateRecipientEmail("someone@gmail.com", {
      checkMx: true,
    });
    assert.equal(result.formatOk, true);
    assert.equal(result.mxOk, true);
    assert.equal(result.valid, true);
  });

  it("accepts yahoo.com even when local DNS returns empty MX", async () => {
    const result = await validateRecipientEmail("ebunilo@yahoo.com", {
      checkMx: true,
    });
    assert.equal(result.formatOk, true);
    assert.equal(result.mxOk, true);
    assert.equal(result.valid, true);
  });

  it("fails MX for invented domains", async () => {
    const result = await validateRecipientEmail(
      "person@this-domain-should-not-exist-xyz123.invalid",
      { checkMx: true }
    );
    assert.equal(result.valid, false);
    assert.equal(result.mxOk, false);
  });

  it("warns for Outlook recipients", async () => {
    const result = await validateRecipientEmail("person@outlook.com", {
      checkMx: true,
    });
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => /Outlook/i.test(w)));
  });
});
