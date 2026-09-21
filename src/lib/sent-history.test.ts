import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextStyleAfterTouchCount } from "./sent-history";

describe("sent history follow-up ladder", () => {
  it("maps touch count to short → bump → value → close", () => {
    assert.equal(nextStyleAfterTouchCount(0), "short");
    assert.equal(nextStyleAfterTouchCount(1), "followup");
    assert.equal(nextStyleAfterTouchCount(2), "followup-value");
    assert.equal(nextStyleAfterTouchCount(3), "followup-close");
    assert.equal(nextStyleAfterTouchCount(9), "followup-close");
  });
});
