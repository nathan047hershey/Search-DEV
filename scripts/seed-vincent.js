/**
 * Provision authorized users only (signup is disabled).
 * Usage: node scripts/seed-vincent.js
 */
const path = require("path");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const { randomUUID } = require("crypto");

const DB_PATH =
  process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "app.db");

async function main() {
  const db = new Database(DB_PATH);
  const email = "vincent@admin.com";
  const name = "Vincent";
  const password = "123456";
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  // Remove open/test accounts for tighter access control
  const removed = db
    .prepare("DELETE FROM users WHERE email IN (?, ?, ?, ?)")
    .run(
      "alice@test.com",
      "a@b.com",
      "test_1787729496470@example.com",
      "vincent@pivotalstacks.com"
    );

  const existing = db.prepare("SELECT _id FROM users WHERE email = ?").get(email);
  if (existing) {
    db.prepare(
      `UPDATE users SET name = ?, password = ?, passwordHash = ?, updatedAt = ? WHERE email = ?`
    ).run(name, passwordHash, passwordHash, now, email);
    console.log("Updated account:", email);
  } else {
    db.prepare(
      `INSERT INTO users (_id, email, name, image, password, passwordHash, emailVerified, accounts, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      randomUUID(),
      email,
      name,
      null,
      passwordHash,
      passwordHash,
      null,
      null,
      now,
      now
    );
    console.log("Created account:", email);
  }

  console.log("Removed old/test accounts:", removed.changes);
  console.log("Login with email:", email, "(or username: vincent)");
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
