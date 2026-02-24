#!/usr/bin/env node
/**
 * One-time migration: encrypt an existing unencrypted portal.db with SQLCipher.
 *
 * Usage:
 *   DB_ENCRYPTION_KEY=<hex-key> node migrate-encrypt.js
 *
 * What it does:
 *   1. Backs up portal.db → portal-backup-<timestamp>.db
 *   2. Opens the unencrypted DB
 *   3. Encrypts it in-place with PRAGMA rekey
 *   4. Verifies the encrypted DB opens with the key
 */

const Database = require("better-sqlite3-multiple-ciphers");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "portal.db");

const key = process.env.DB_ENCRYPTION_KEY;
if (!key) {
  console.error("ERROR: DB_ENCRYPTION_KEY environment variable is not set.");
  console.error("Usage: DB_ENCRYPTION_KEY=<hex-key> node migrate-encrypt.js");
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.error(`ERROR: Database not found at ${DB_PATH}`);
  process.exit(1);
}

// Step 1: Backup
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(DATA_DIR, `portal-backup-${timestamp}.db`);
console.log(`Backing up ${DB_PATH} → ${backupPath}`);
fs.copyFileSync(DB_PATH, backupPath);

// Also copy WAL/SHM if they exist (ensures consistent backup)
for (const ext of ["-wal", "-shm"]) {
  const src = DB_PATH + ext;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, backupPath + ext);
  }
}
console.log("Backup complete.");

// Step 2: Open unencrypted DB and encrypt with rekey
console.log("Encrypting database...");
const db = new Database(DB_PATH);

// Verify it's currently readable without a key
try {
  const row = db.prepare("SELECT COUNT(*) AS c FROM users").get();
  console.log(`Current DB has ${row.c} users — confirmed unencrypted and readable.`);
} catch (e) {
  db.close();
  console.error("ERROR: Cannot read the DB. Is it already encrypted?");
  console.error(e.message);
  process.exit(1);
}

// rekey requires DELETE journal mode (not WAL)
db.pragma("journal_mode = DELETE");

// Encrypt in-place
db.pragma(`rekey='${key}'`);
db.close();
console.log("Encryption applied.");

// Step 3: Verify encrypted DB opens with the key
console.log("Verifying encrypted database...");
const verifyDb = new Database(DB_PATH);
verifyDb.pragma(`key='${key}'`);
try {
  const row = verifyDb.prepare("SELECT COUNT(*) AS c FROM users").get();
  console.log(`Verified: encrypted DB has ${row.c} users.`);
} catch (e) {
  verifyDb.close();
  console.error("ERROR: Verification failed! Restoring backup...");
  fs.copyFileSync(backupPath, DB_PATH);
  console.error("Backup restored. The database is back to its unencrypted state.");
  console.error(e.message);
  process.exit(1);
}
verifyDb.close();

// Step 4: Verify it's NOT readable without the key
console.log("Confirming DB is unreadable without key...");
const noKeyDb = new Database(DB_PATH);
try {
  noKeyDb.prepare("SELECT 1 FROM users").get();
  noKeyDb.close();
  console.error("WARNING: DB is still readable without a key — encryption may not have worked!");
  process.exit(1);
} catch (e) {
  noKeyDb.close();
  console.log("Confirmed: DB is NOT readable without the key.");
}

console.log("\nDone! Database is now encrypted.");
console.log(`Backup saved at: ${backupPath}`);
console.log("Next steps:");
console.log("  1. Ensure DB_ENCRYPTION_KEY is set in your .env / server environment");
console.log("  2. Start the server — it will open the encrypted DB transparently");
console.log("  3. After verifying everything works, delete the backup and this script");
