import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildKeywordClause,
  buildRepoSearchQuery,
  buildUserSearchQuery,
  compactSearchText,
  normalizeSearchText,
} from "./search-query";

describe("search query normalization", () => {
  it("collapses whitespace", () => {
    assert.equal(normalizeSearchText("  john   kevin  "), "john kevin");
    assert.equal(compactSearchText("john kevin"), "johnkevin");
  });

  it("makes spaced and compact name queries overlap", () => {
    const spaced = buildKeywordClause("john kevin");
    const compact = buildKeywordClause("johnkevin");
    assert.match(spaced, /johnkevin/);
    assert.match(spaced, /"john kevin"/);
    assert.match(compact, /johnkevin/);
    // Both should be able to hit the compact login form
    assert.ok(spaced.includes("johnkevin"));
    assert.ok(compact.includes("johnkevin"));
  });

  it("supports search scope qualifiers", () => {
    assert.match(buildKeywordClause("ada", "login"), /in:login/);
    assert.match(buildKeywordClause("ada", "fullname"), /in:fullname/);
  });

  it("builds repo queries with name + pushed window", () => {
    const q = buildRepoSearchQuery({
      repoName: "react query",
      pushedWithinDays: "30",
      languages: ["TypeScript"],
    });
    assert.match(q, /in:name/);
    assert.match(q, /pushed:>=/);
    assert.match(q, /language:TypeScript/);
    assert.match(q, /fork:false/);
  });

  it("builds user queries with created window", () => {
    const q = buildUserSearchQuery({
      q: "john kevin",
      location: "Nigeria",
      createdWithinDays: "365",
      minFollowers: "10",
    });
    assert.match(q, /johnkevin/);
    assert.match(q, /location:"?Nigeria"?/);
    assert.match(q, /created:>=/);
    assert.match(q, /followers:>=10/);
  });
});
