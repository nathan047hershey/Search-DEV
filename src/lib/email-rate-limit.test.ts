import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  getGapMinutes,
  setGapMinutes,
  getSendCooldown,
  recordLastSendAt,
} from "./email-rate-limit";

const dataDir = path.join(process.cwd(), "data");
const settingsFile = path.join(dataDir, "send-limits.json");
const historyFile = path.join(dataDir, "sent-history.json");

function backup(file: string): string | null {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8");
}

function restore(file: string, content: string | null) {
  if (content === null) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return;
  }
  fs.writeFileSync(file, content, "utf8");
}

test("setGapMinutes clamps and persists", () => {
  const prev = backup(settingsFile);
  try {
    assert.equal(setGapMinutes(10), 10);
    assert.equal(getGapMinutes(), 10);
    assert.equal(setGapMinutes(1), 2);
    assert.equal(setGapMinutes(999), 60);
  } finally {
    restore(settingsFile, prev);
  }
});

test("getSendCooldown enforces gap after last send from history", () => {
  const prevSettings = backup(settingsFile);
  const prevHistory = backup(historyFile);
  try {
    setGapMinutes(10);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(
      historyFile,
      JSON.stringify([
        {
          id: "t1",
          to: "a@example.com",
          subject: "x",
          body: "y",
          sentAt: new Date().toISOString(),
          sentBy: "vincent@admin.com",
        },
      ]),
      "utf8"
    );

    const cool = getSendCooldown("vincent@admin.com");
    assert.equal(cool.allowed, false);
    assert.ok((cool.retryAfterSeconds || 0) > 0);
    assert.equal(cool.gapMinutes, 10);
  } finally {
    restore(settingsFile, prevSettings);
    restore(historyFile, prevHistory);
  }
});

test("getSendCooldown uses persisted lastSentAt after restart-style reload", () => {
  const prevSettings = backup(settingsFile);
  const prevHistory = backup(historyFile);
  try {
    setGapMinutes(10);
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(historyFile, "[]", "utf8");
    recordLastSendAt("vincent@admin.com", new Date());

    const cool = getSendCooldown("vincent@admin.com");
    assert.equal(cool.allowed, false);
    assert.ok((cool.retryAfterSeconds || 0) > 0);
    assert.ok(cool.lastSentAt);

    // Simulate reading again after "restart"
    const cool2 = getSendCooldown("vincent@admin.com");
    assert.equal(cool2.allowed, false);
    assert.ok(fs.existsSync(settingsFile));
    const saved = JSON.parse(fs.readFileSync(settingsFile, "utf8"));
    assert.ok(saved.lastSentAtByUser["vincent@admin.com"]);
  } finally {
    restore(settingsFile, prevSettings);
    restore(historyFile, prevHistory);
  }
});
