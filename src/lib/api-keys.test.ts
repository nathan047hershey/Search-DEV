import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseApiTokenList } from "./api-keys";

describe("parseApiTokenList", () => {
  it("splits comma-separated tokens and ignores blanks", () => {
    assert.deepEqual(parseApiTokenList("abc, def , ,ghi"), ["abc", "def", "ghi"]);
  });

  it("accepts a single token with surrounding whitespace", () => {
    assert.deepEqual(parseApiTokenList("  token-123  "), ["token-123"]);
  });
});
