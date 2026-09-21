import test from "node:test";
import assert from "node:assert/strict";
import { extractJsonObject, stripMinimaxThinking } from "./minimax-client";

test("stripMinimaxThinking removes think blocks", () => {
  const raw = `<think>planning JSON</think>\n{"greeting":"Hi,","opening":"Hello there."}`;
  assert.equal(
    stripMinimaxThinking(raw),
    `{"greeting":"Hi,","opening":"Hello there."}`
  );
});

test("extractJsonObject recovers JSON from reasoning prose", () => {
  const reasoning =
    'I will comply. Output: {"greeting":"Hi,","opening":"Test.","roleBlurb":"A role."}';
  assert.equal(
    extractJsonObject(reasoning),
    '{"greeting":"Hi,","opening":"Test.","roleBlurb":"A role."}'
  );
});
