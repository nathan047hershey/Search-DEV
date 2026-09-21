import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPANY,
  OFFER_POOL,
  enrichWhyUs,
  pickCta,
  pickOfferBullets,
  pickPersonalizedSubject,
} from "./company-voice";

describe("company voice", () => {
  it("exposes concrete company and process copy", () => {
    assert.match(COMPANY.about, /product platforms/i);
    assert.match(COMPANY.process, /hiring engineer/i);
    assert.ok(OFFER_POOL.length >= 8);
  });

  it("picks rich offer subsets", () => {
    const offer = pickOfferBullets("ruby-dev", 4);
    assert.equal(offer.length, 4);
    assert.match(offer[0], /pay|experience|market/i);
    assert.match(offer.join(" "), /Remote|ownership|hiring engineer|AWS|async/i);
  });

  it("enriches whyUs without inventing fluff alone", () => {
    const why = enrichWhyUs("Ruby engineers ship product with quality", "Ruby");
    assert.match(why, /Ruby engineers/);
    assert.ok(why.length > 20);
    assert.ok(why.length < 120);
  });

  it("builds role-specific CTAs", () => {
    const cta = pickCta("Senior Ruby Developer", "seed-1");
    assert.match(cta, /careers@pivotalstacks\.com/);
    assert.match(cta, /resume|chat|call|Reply/i);
    assert.match(cta, /15-20 minutes|hiring engineer|cover letter|short no|availability/i);
  });

  it("personalized subjects always use available signals", () => {
    for (let i = 0; i < 12; i++) {
      const withRepo = pickPersonalizedSubject("Senior Go Developer", `seed-${i}`, {
        repo: "tiny-cache",
        language: "Go",
        company: "Acme",
      });
      assert.match(withRepo, /tiny-cache|Acme|Go/);
      assert.doesNotMatch(withRepo, /exciting opportunity/i);
    }
    const langOnly = pickPersonalizedSubject("Backend Engineer", "lang-only", {
      language: "Rust",
    });
    assert.match(langOnly, /Rust/);
  });
});
