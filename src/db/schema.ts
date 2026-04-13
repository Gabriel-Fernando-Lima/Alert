import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("alert.db");

export function initDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY NOT NULL,
      uid TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      days TEXT NOT NULL DEFAULT '[]',
      sound TEXT NOT NULL DEFAULT 'default',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );
  `);
}

export default db;